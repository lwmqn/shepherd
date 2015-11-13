'use strict';

const util = require('util'),
      EventEmitter = require('events'),
      _ = require('lodash'),
      Q = require('q'),
      // network = require('network'),
      mosca = require('mosca'),
      mqtt = require('mqtt'),
      mqdb = require('./mqdb'),
      config = require('../config/config.js'),
      SO = require('./smartobject'),
      MDEFS = require('./defs/mdefs'),
      OID = MDEFS.OID,
      RID = MDEFS.RID,
      RSPCODE = MDEFS.RSPCODE,
      CMD = MDEFS.CMD;

const mBrokerEvents = [ 'ready', 'clientConnected', 'clientDisconnecting', 'published', 'subscribed', 'unsubscribed' ],
      mClientEvents = [ 'connect', 'reconnect', 'close', 'offline', 'error', 'message' ],
      unsuccessStatusCode = [ 400, 401, 404, 405, 409, 500 ];

function MShepherd(name, settings) {
    var self = this,
        permitJoinCountdown,
        transId = 0;

    this._sobox = {};           // { clientId: so } box that holds the registered smart objects
    this._rspsToResolve = {};   // { clientId: { cmd: { transid: deferred } } }
    this._joinable = false;
    this._started = false;
    this._permitJoinTime = 0;

    this.brokerSettings = settings || config.brokerSettings;
    this.clientId = name || config.shepherdName;
    this.mBroker = null;
    this.mClient = null;

    this.authPolicy = {
        // Default: authenticate who has the default account. Override at will.
        authenticate: function (client, user, pass, cb) {
            var defaultAccount = config.account,
                authorized = (user === defaultAccount.username && pass.toString() === defaultAccount.password);

            if (authorized)
                client.user = user;

            cb(null, authorized);
        },
        // Default: authorize who has been authenticated. Override at will.
        authorizePublish: function (client, topic, payload, cb) {
            var defaultAccount = config.account,
                splitTopics = topic.split('/'),
                authorized = false;

            // only authenticated user and registered client can publish to arbitrary topics
            if (client.user && self._sobox[client.clientId])
                authorized = true;

            // before registration, anyone can just publish to 'register' topic
            if (splitTopics[0] === 'register')
                authorized = true;

            cb(null, authorized);
        },
        // Default: authorize who has been authenticated. Override at will.
        authorizeSubscribe: function (client, topic, cb) {
            var defaultAccount = config.account,
                authorized = false;

            // only authenticated user and registered client can subscribe to arbitrary topics
            if (client.user && self._sobox[client.clientId])
                authorized = true;

            // before registration, anyone can just subscribe to his own 'register/response/{$client.clientId}' channel
            if (topic === `register/response/{$client.clientId}`)
                authorized = true;

            cb(null, authorized);
        },
        // Default: authorize any packet for any client. Override at will
        authorizeForward: function (client, packet, cb) { cb(null, true); }
    };

    this.peripheralConnected = function (client) {          // overridable
        console.log(`${client.clientId} is connected.`);
    };

    this.peripheralDisconnecting = function (client) {      // overridable
        console.log(`${client.clientId} is disconnecting.`);
    };

    this.peripheralDisconnected = function (client) {       // overridable
        console.log(`${client.clientId} is disconnected.`);
    };

    this.peripheralPublished = function (client) {          // overridable
        console.log(`${client.clientId} has published a message.`);
    };

    this.peripheralSubscribed = function (client) {         // overridable
        console.log(`${client.clientId} has subscribed to a topic.`);
    };

    this.peripheralUnsubscribed = function (client) {       // overridable
        console.log(`${client.clientId} has unsubscribed to a topic.`);
    };

    this.permitJoin = function (mode, time) {
         this._permitJoinTime = Math.floor(time) || 90;

        if (!mode) { 
            this._joinable = false;
            this._permitJoinTime = 0;

            if (permitJoinCountdown) {
                clearInterval(permitJoinCountdown);
                permitJoinCountdown = null;
            }
            return this;
        }

        permitJoinCountdown = setInterval(function () {
            self._permitJoinTime -= 1;

            if (self._permitJoinTime === 0) {
                self._joinable = false;
                clearInterval(permitJoinCountdown);
                permitJoinCountdown = null;
            }
        }, 1000);

        this._joinable = true;

        return this;
    };

    this.nextTransId = function () {
        transId = (transId > 255) ? 0 : transId++;
        return transId;
    };

    this.on('_ready', function () {
        // shepherd is ready, next step is loading all smart objects from database, and check alive (asynchronously)
        mqdb.find({}).then(function (sos) {
            _.forEach(sos, function (so) {
                self._sobox[so.clientId] = new SO(self, so.clientId, 'xxx');   // [TODO] how to restore?
                self._sobox[so.clientId].startLifeCheck();                     // [TODO] ping or what?
                                                                               // [TODO] need some delay?
            });
        }).done(function () {
            self.emit('ready');
        });
    });
}

util.inherits(MShepherd, EventEmitter);

/*************************************************************************************************/
/*** MShepherd Major Functions                                                                 ***/
/*************************************************************************************************/
// ok
MShepherd.protoype.start = function (callback) {
    var self = this,
        deferred = Q.defer(),
        broker = this.mBroker = this.mBroker || new mosca.Server(this.brokerSettings);

    broker.once('ready', function () {
        self._setupAuthPolicy();                            // 1. set up authorization for peripherals

        _.forEach(mBrokerEvents, function (event) {         // 2. remove all listeners attached
            broker.removeAllListeners(event);
        });

        self._attachBrokerEventListeners()                  // 3. re-attach listeners:
            .then(self._setShepherdAsClient)                // 4. let shepherd in
            .then(self._testShepherdPubSub)                 // 5. run shepherd pub/sub testing
            .fail(function (err) {
                deferred.reject(err);
            }).done(function () {
                self._started = true;                       // 6. testings are done, emit 'started'
                self.emit('_ready');                        // 7. if all done, shepherd fires '_ready' event for inner use
                deferred.resolve();
            });
    });

    return deferred.promise.nodeify(callback);
};

MShepherd.protoype.stop = function (callback) {
    var deferred = Q.defer(),
        mClient = this.mClient;

    if (!this._started) {
        deferred.resolve();
    } else {
        this.permitJoin(false);
        // close mClient
        mClient.end(true, function () {    // force = true, close immediately
            _.forEach(mClientEvents, function (evt) {
                mClient.removeAllListeners(evt);
            });
        });

        // [TODO]
        // have to close this.broker? remove all his listeners
    }

    return deferred.promise.nodeify(callback);
};

// ok
MShepherd.protoype.reset = function (callback) {
    var self = this,
        deferred = Q.defer();

    this.stop().then(function () {
        return self.start();
    }).fail(function (err) {
        deferred.reject(err);
    }).done(function () {
        deferred.resolve();
    });

    return deferred.promise.nodeify(callback);
};

// shepherd -> pheripheral
// ok
MShepherd.protoype._responseSender = function (intf, clientId, rspObj, callback) {
    var self = this,
        deferred = Q.defer(),
        topic = `{$intf}/response/{$clientId}`,
        msg = JSON.stringify(rspObj);

    process.nextTick(function () {
        self.mClient.publish(topic, msg, { qos: 1, retain: false }, function () {
            deferred.resolve();
        });
    });

    return deferred.promise.nodeify(callback);
};

// shepherd -> pheripheral
// ok
MShepherd.protoype._requestSender = function (cmdId, clientId, reqObj, callback) {
    // convert cmdId to number, get transId and stringify request object in this method
    var self = this,
        deferred = Q.defer(),
        topic = `request/{$clientId}`,
        msg;

    if (arguments.length < 2)
        deferred.reject(new Error('Bad arguments.'));

    reqObj.cmdId = CMD.get(cmdId) ? CMD.get(cmdId).value : 255; // 255: unknown cmd

    if (reqObj.cmdId === 255)
        deferred.reject(new Error('Unknown command. Unable to send.'));

    reqObj.transId = this.nextTransId();
    msg = JSON.stringify(reqObj);

    // load the cmd promise pending to be resolved
    // { clientId: { cmd: { transid: deferred } } }
    this._rspsToResolve[clientId] = this._rspsToResolve[clientId] || {};
    this._rspsToResolve[clientId][cmdId] = this._rspsToResolve[clientId][cmdId] || {};
    this._rspsToResolve[clientId][reqObj.transId] = deferred;

    process.nextTick(function () {
        self.mClient.publish(topic, msg, { qos: 1, retain: false });
    });
    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Tackling the mBroker Things                                                               ***/
/*************************************************************************************************/
// ok
MShepherd.prototype._setupAuthPolicy = function () {
    var self = this,
        broker = this.mBroker,
        authorized;

    broker.authenticate = function (client, user, pass, cb) {
        if (client.id === self.clientId) {  // always let shepherd pass
            client.user = self.clientId;
            cb(null, true);
        } else {
            self.authPolicy.authenticate(client, user, pass, cb);
        }
    };

    broker.authorizePublish = function (client, topic, payload, cb) {
        if (client.id === self.clientId) {  // shepherd can always publish
            cb(null, true);
        } else {
            self.authPolicy.authorizePublish(client, topic, payload, cb);
        }
    };

    broker.authorizeSubscribe = function (client, topic, cb) {
        if (client.id === self.clientId) {  // shepherd can always subscribe
            cb(null, true);
        } else {
            self.authPolicy.authorizeSubscribe(client, topic, cb);
        }
    };

    broker.authorizeForward = function (client, packet, cb) {
        if (client.id === self.clientId) {
            cb(null, true);
        } else {
            self.authPolicy.authorizeForward(client, packet, cb);
        }
    };
};

// ok
MShepherd.protoype._attachBrokerEventListeners = function (callback) {
    var self = this,
        broker = this.mBroker,
        deferred = Q.defer();

    broker.on('clientConnected', function (client) {
        if (client.clientId !== self.clientId)
            self.peripheralConnected(client);
    });

    broker.on('clientDisconnecting', function (client) { 
        if (client.clientId !== self.clientId)
            self.peripheralDisconnecting(client);
    });

    broker.on('clientDisconnected', function (client) {
        if (client.clientId !== self.clientId)
            self.peripheralDisconnected(client);
    });

    broker.on('published', function (client) {
        if (client.clientId !== self.clientId)
            self.peripheralPublished(client);
    });

    broker.on('subscribed', function (client) {
        if (client.clientId !== self.clientId)
            self.peripheralSubscribed(client);
    });

    broker.on('unsubscribed', function (client) {
        if (client.clientId !== self.clientId)
            self.peripheralUnsubscribed(client);
    });

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Tackling the mClient Things                                                               ***/
/*************************************************************************************************/
// ok
MShepherd.prototype._setShepherdAsClient = function (callback) {
    var self = this,
        deferred = Q.defer(),
        options = config.clientConnOptions,
        mc;

    // console.log(`${this.clientId} is connecting to the broker.`);
    options.clientId = this.clientId;
    mc = this.mClient = mqtt.connect('mqtt://localhost', options);

    mc.on('connect', function (connack) {
        // console.log(`${self.clientId} has connected to the broker.`);
        if (!connack.sessionPresent) {
            // subscribe to topics of the interface
            mc.subscribe({
                'register/*': 0,
                'deregister/*': 0,
                'notify/*': 1,
                'update/*': 1,
                'response/*': 1,
                'ping/*': 0,
            }, function (err, granted) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(mc);
                }
            });
        } else {
            // session already exists, no need to subscribe again
            deferred.resolve(mc);
        }
    });

    mc.on('reconnect', function () {
        console.log(`${self.clientId} is re-connecting to the broker.`);
    });

    mc.on('close', function () {
        console.log(`${self.clientId} is disconnected from the broker.`);
    });

    mc.on('offline', function () {
        console.log(`${self.clientId} is offline.`);
    });

    mc.on('error', function (err) {
        console.log(`Error occured when ${self.clientId} was connecting to the broker.`);

        self.emit('error', err);
        if (deferred && deferred.isPending())
            deferred.reject(err);
    });

    // attach message handler for each channel of topics
    mc.on('message', function (topic, message, packet) {
        // topics: 'register/*', 'deregister/*', 'notify/*', 'update/*', 'response/*', 'ping'
        //      packet { cmd: 'publish', messageId: 42, qos: 2, dup: false,
        //               topic: 'test', payload: new Buffer('test'), retain: false }

        if (topic[0] === '/')                       // if the first char of topic is '/', take it off
            topic = topic.slice(1);

        if (topic[topic.length-1] === '/')          // if the last char of topic is '/', take it off
            topic = topic.slice(0, topic.length-1);

        var splitTopics = topic.split('/'),
            intf = splitTopics[0],                  // example: 'register/ea:3c:4b:11:0e:6d'
            cId = splitTopics[1] ? splitTopics[1] : null,
            so = self._sobox[cId],
            parsedMsg = JSON.parse(message),
            unknownIntf = false,
            messageHandler;

        _.assign(parsedMsg, { clientId: cId });

        if (!so) {  // deal with the unknown 'so' here, thus no need to check it in each _handler
            var rspObj = { status: RSPCODE.NotFound.value };
            if (intf !== 'response')
                this._responseSender(intf, cId, rspObj);
            return;
        }

        // if we are here, the so exists, restart his life checker
        so.restartLifeChecker();

        switch (splitTopics[0]) {
            case 'register':
                // reg_data = { clientId, lifetime, version, objList, ip, port(opt) }
                messageHandler = self._registerHandler;
                break;
            case 'deregister':
                // dereg_data = { clientId }; 
                messageHandler = self._deregisterHandler;
                break;
            case 'notify':
                // notify_data = { clientId, oid, iid, rid, data }
                messageHandler = self._notifyHandler;
                break;
            case 'update':
                // update_data = { clientId, lifeTime(opt), version(opt), objList(opt), ip(opt), port(opt) }
                messageHandler = self._updateHandler;
                break;
            case 'response':
                // rsp_data = { clientId, transId, cmdId, status, data }
                messageHandler = self._clientResponseHandler;
                break;
            case 'ping':
                // ping_data = { clientId }
                messageHandler = self._clientPingHandler;
                break;
            default:
                // pass the orginal arguments to _otherTopicsHandler()
                unknownIntf = true;
                messageHandler = self._otherTopicsHandler;
                break;
        }

        process.nextTick(function () {
            if (unknownIntf)
                messageHandler(topic, message, packet);
            else
                messageHandler(parsedMsg);
        });
    });

    return deferred.promise.nodeify(callback);
};

// [TODO]
MShepherd.protoype._registerHandler = function (msg) {
    // reg_data = { clientId, ip, lifetime, version, objList, port(opt) }
    var self = this,
        readAllObjectPromises = [],
        so = this._sobox[msg.clientId],
        rspObj = {
            intf: 'register',
            status: RSPCODE.OK.value
        };

    if (!so) {
        // do register procedure
        so = new SO(this, msg.clientId, msg);
        this._sobox[msg.clientId] = so;

        // objList: [ { oid, iid }, { oid, iid }, { oid, iid }, ... ]
        // transform to objList = { oid1: [ iid1, iid2 ], oid2: [ iid3, iid4, iid5] }
        _.forEach(msg.objList, function (idPair) {
            so.objList[idPair.oid] = so.objList[idPair.oid] || [];
            so.objList[idPair.oid].push(idPair.iid);
        });

        // [TODO]
        // read every object => dig into the structure and id-name transform
        _.forEach(so.objList, function (oid) {
            // var prom = so.readObject(oid);
            // find oid string
            var prom = self.read(msg.clientId, oid).then(function (objData) {
                // iid number
                // rid string
            });
            readAllObjectPromises.push(prom);
        });

        Q.all(readAllObjectPromises).then(function () {
            // so.save()
            so.enableLifeCheck();
            self._responseSender(so.clientId, rspObj)
                .then(function () {
                    self.emit('registered', so);
                });
        });

    } else {
        // do update procedure
        this._updateHandler(msg);
    }

    this._responseSender(msg.clientId, rspObj); // [TODO]
};

// ok
MShepherd.protoype._deregisterHandler = function (msg) {
    // dereg_data = { clientId }; 
    var self = this,
        so = this._sobox[msg.clientId],
        rspObj = { status: RSPCODE.Deleted.value };

    so.disableLifeCheck().then(so.clean).fail(function (err) {
        self.emit('error', err);
        rspObj.status = RSPCODE.InternalServerError.value;
        self._responseSender('deregister', msg.clientId, rspObj);
    }).done(function () {
        delete this._sobox[msg.clientId];
        self.emit('deregistered', msg.clientId);
        self._responseSender('deregister', msg.clientId, rspObj);
        // when deregister done, pheripheral should close himself
    });
};

// ok
MShepherd.protoype._notifyHandler = function (msg) {
    // notify_data = { clientId, oid, iid, rid, data }
    // (oid + iid), (oid + iid + rid)
    var self = this,
        so = this._sobox[msg.clientId],
        rspObj = { status: RSPCODE.Changed.value };

    if (_.isUndefined(msg.oid) || _.isUndefined(msg.iid)) {
        rspObj.status = RSPCODE.BadRequest.value;
        this._responseSender('notify', msg.clientId, rspObj);
        return;
    }

    if (_.isUndefined(msg.rid)) {   // data is object instance
        so.updateObjectInstance(msg).fail(function (err) {  // parse structure, update value
            self.emit('error', err);
            rspObj.status = RSPCODE.InternalServerError.value;
            self._responseSender('notify', msg.clientId, rspObj);
        }).done(function (diff) {
            self.emit('notified', diff);
            self._responseSender('notify', msg.clientId, rspObj);
        });
    } else {                        // data is an resource
        so.updateResource(msg).fail(function (err) {        // parse structure, update value
            self.emit('error', err);
            rspObj.status = RSPCODE.InternalServerError.value;
            self._responseSender('notify', msg.clientId, rspObj);
        }).done(function (diff) {
            self.emit('notified', diff);
            self._responseSender('notify', msg.clientId, rspObj);
        });
    }
};

// [TODO]
MShepherd.protoype._updateHandler = function (msg) {
    // update_data = { clientId, lifetime(opt), version(opt), objList(opt), ip(opt), port(opt) }
    var so = this._sobox[msg.clientId],
        rspObj = { status: RSPCODE.OK.value };

    // [TODO] if objList exists, should run de-register, then re-register

    // in so.updateAttrs(), if lifetime changes, reset the life checker
    so.updateAttrs(msg).fail(function (err) {

    }).done(function () {
        this._responseSender('update', msg.clientId, rspObj);
    });
};

// ok
MShepherd.protoype._clientPingHandler = function (msg) {
    // ping_data = { clientId }
    this._responseSender('ping', msg.clientId, { status: RSPCODE.OK.value });
};

// ok
MShepherd.protoype._clientResponseHandler = function (msg) {
    // rsp_data = { clientId, transId, cmdId, status, data }
    var clientId = msg.clientId,
        cmdId = CMD.get(msg.cmdId) ? CMD.get(msg.cmdId).key : '',   // cmdId: string cmdId
        clientProms = this._rspsToResolve[clientId],
        cmdProms = clientProms ? clientProms[cmdId] : undefined,
        cmdProm = cmdProms ? cmdProms[msg.transId] : undefined;

    if (!cmdProm) { return; }

    delete this._rspsToResolve[clientId][cmdId][msg.transId];

    if (_.isEmpty(cmdProms)) {
        delete this._rspsToResolve[clientId][cmdId];

        if (_.isEmpty(clientProms))
            delete this._rspsToResolve[clientId];
    }

    // if status is unsuccessful, reject it
    if (_.includes(unsuccessStatusCode, msg.status))
        cmdProm.reject(new Error(`Response of ${cmdId} fails. Status code: ${msg.status}`));

    cmdProm.resolve(msg.data);
};

// ok
MShepherd.protoype._otherTopicsHandler = function (topic, message, packet) {
    this.emit('unhandledTopic', topic, message, packet);
};

// ok
MShepherd.protoype._testShepherdPubSub = function (mc, callback) {
    // if we are here, the mClient is ok with subscribing to all channels
    // we can start our testing
    var deferred = Q.defer(),
        cId = this.clientId,
        testTopics = [ 'register', 'deregister', 'update', 'notify', 'response', 'ping' ],
        testMsgListener,
        testTimeout,
        checkCounter = 0;

    testTopics = testTopics.map(function (tp) {
        return (tp + '/' + cId);
    });

    testMsgListener = function (topic, message, packet)  {
        switch (topic) {
            case testTopics[0]:
            case testTopics[1]:
            case testTopics[2]:
            case testTopics[3]:
            case testTopics[4]:
            case testTopics[5]:
                if (message === 'test') 
                    checkCounter += 1;
                break;
            default:
                break;
        }

        if (checkCounter === testTopics.length) {
            clearTimeout(testTimeout);
            mc.removeListener('message', testMsgListener);
            deferred.resolve();
        }
    };

    mc.on('message', testMsgListener);

    mc.subscribe(testTopics, function (err, granted) {
        if (err) { deferred.reject(err); }

        testTimeout = setTimeout(function () {
            deferred.reject(new Error('Test timeout'));
        }, 5000);

        _.forEach(testTopics, function (tp) {
            mc.publish(tp, 'test');
        });
    });

    return deferred.promise.nodeify(callback);
};

/************************************************************************/
/* Remote Request APIs                                                  */
/************************************************************************/
MShepherd.protoype.readReq = function (clientId, reqObj, callback) {
    return this._requestSender('read', clientId, reqObj, callback);
};

MShepherd.protoype.writeReq = function (clientId, reqObj, callback) {
    return this._requestSender('write', clientId, reqObj, callback);
};

MShepherd.protoype.writeAttrsReq = function (clientId, reqObj, callback) {
    reqObj.attrs = reqObj.data;
    delete reqObj.data;

    return this._requestSender('writeAttrs', clientId, reqObj, callback);
};

MShepherd.protoype.discoverReq = function (clientId, reqObj, callback) {
    return this._requestSender('discover', clientId, reqObj, callback);
};

MShepherd.protoype.executeReq = function (clientId, reqObj, callback) {
    return this._requestSender('execute', clientId, reqObj, callback);
};

MShepherd.protoype.observeReq = function (clientId, reqObj, callback) {
    return this._requestSender('observe', clientId, reqObj, callback);
};

/************************************************************************/
/* Code Temp Zone                                                       */
/************************************************************************/
MShepherd.prototype.reset = function () {};
MShepherd.prototype.getCoordInfo = function () {};
MShepherd.prototype.getNwkInfo = function () {};
MShepherd.prototype.onNwkReady = function () {};
MShepherd.prototype.setPermitJoin = function () {};
MShepherd.prototype.getNeighborTable = function () {};
MShepherd.prototype.getRoutingTable = function () {};
MShepherd.prototype.changeKey = function () {};
MShepherd.prototype.getKey = function () {};
MShepherd.prototype.onDeviceJoin = function () {};
MShepherd.prototype.getDevList = function () {};
MShepherd.prototype.devListMaintain = function () {};
MShepherd.prototype.removeDevice = function () {};
MShepherd.prototype.sleepyDevPacketPend = function () {};
MShepherd.prototype.onSleepyCheckIn = function () {};
MShepherd.prototype.onAttrChange = function () {};
MShepherd.prototype.getAttrList = function () {};
MShepherd.prototype.readAttr = function () {};
MShepherd.prototype.writeAttr = function () {};
MShepherd.prototype.setAttrReport = function () {};
MShepherd.prototype.onAttrReport = function () {};

module.exports = MShepherd;
