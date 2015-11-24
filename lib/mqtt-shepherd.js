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
      MqttNode = require('./mqtt-node'),
      SO = require('./smartobject'),
      mqUtils = require('./utils/mqutils'),
      MDEFS = require('./defs/mdefs'),
      OID = MDEFS.OID,
      RID = MDEFS.RID,
      RSPCODE = MDEFS.RSPCODE,
      CMD = MDEFS.CMD;

const mBrokerEvents = [ 'ready', 'clientConnected', 'clientDisconnecting', 'published', 'subscribed', 'unsubscribed' ],
      mClientEvents = [ 'connect', 'reconnect', 'close', 'offline', 'error', 'message' ],
      unsuccessStatusCode = [ 400, 401, 404, 405, 409, 500 ];

function MShepherd(name, settings) {

    EventEmitter.call(this);

    var self = this,
        permitJoinCountdown,
        transId = 0;

    this._nodebox = {};         // { clientId: node } box that holds the registered mqtt-nodes
    this._rspsToResolve = {};   // { clientId: { cmd: { transid: deferred } } }

    this._joinable = false;
    this._enabled = false;
    this._permitJoinTime = 0;

    this.clientId = name || config.shepherdName;
    this.brokerSettings = settings || config.brokerSettings;

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
            if (client.user && self._nodebox[client.clientId])
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
            if (client.user && self._nodebox[client.clientId])
                authorized = true;

            // before registration, anyone can just subscribe to his own 'register/response/${client.clientId}' channel
            if (topic === `register/response/${client.clientId}`)
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

    this.permitJoin = function (time) {
        time = time || 0;
        this._permitJoinTime = Math.floor(time);

        if (!time) { 
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

    // [TODO]
    this.on('_ready', function () {
        // shepherd is ready, next step is loading all mqtt-nodes from database, and check alive (asynchronously)
        mqdb.find({}).then(function (nodes) {
            _.forEach(nodes, function (node) {
                // self._nodebox[node.clientId] = new MqttNode(self, node.clientId, 'xxx');   // [TODO] how to restore?
                self._nodebox[node.clientId] = self.newMqttNode(node.clientId, 'xxx');
                self._nodebox[node.clientId].startLifeCheck();                     // [TODO] ping or what?
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
MShepherd.protoype.newMqttNode = function (clientId, devAttr, options) {
    return new MqttNode(this, clientId, devAttr, options);
};

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
                self._enabled = true;                       // 6. testings are done, shepherd is enabled 
                self.emit('_ready');                        // 7. if all done, shepherd fires '_ready' event for inner use
                deferred.resolve();
            });
    });

    return deferred.promise.nodeify(callback);
};

MShepherd.protoype.stop = function (callback) {
    var deferred = Q.defer(),
        mClient = this.mClient;

    if (!this._enabled) {
        deferred.resolve();
    } else {
        this.permitJoin(0);
        // close mClient
        mClient.end(true, function () {    // force = true, close immediately
            _.forEach(mClientEvents, function (evt) {
                mClient.removeAllListeners(evt);
            });
        });

        this.mClient = null;
        this._enabled = false;
    }

    return deferred.promise.nodeify(callback);
};

MShepherd.protoype.reset = function (callback) {
    var deferred = Q.defer();

    this.stop().then(this.start).done(function () {
        deferred.resolve();
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

// shepherd -> pheripheral
MShepherd.protoype._responseSender = function (intf, clientId, rspObj, callback) {
    var self = this,
        deferred = Q.defer(),
        topic = `${intf}/response/${clientId}`,
        msg = JSON.stringify(rspObj);

    process.nextTick(function () {
        self.mClient.publish(topic, msg, { qos: 1, retain: false }, function () {
            deferred.resolve();
        });
    });

    return deferred.promise.nodeify(callback);
};

// shepherd -> pheripheral
MShepherd.protoype._requestSender = function (cmdId, clientId, reqObj, callback) {
    // convert cmdId to number, get transId and stringify request object in this method
    var self = this,
        deferred = Q.defer(),
        topic = `request/${clientId}`,
        msg;

    if (arguments.length < 2)
        deferred.reject(new Error('Bad arguments.'));

    reqObj.cmdId = CMD.get(cmdId) ? CMD.get(cmdId).value : 255; // 255: unknown cmd

    if (reqObj.cmdId === 255)
        deferred.reject(new Error('Unable to send the unknown command.'));

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
MShepherd.prototype._setShepherdAsClient = function (callback) {
    var self = this,
        deferred = Q.defer(),
        options = config.clientConnOptions,
        mc;

    options.clientId = this.clientId;
    mc = this.mClient = mqtt.connect('mqtt://localhost', options);

    mc.on('connect', function (connack) {
        if (!connack.sessionPresent) {
            mc.subscribe({          // subscribe to topics of the interface
                'register/*': 0,
                'deregister/*': 0,
                'notify/*': 1,
                'update/*': 1,
                'response/*': 1,
                'ping/*': 0,
            }, function (err, granted) {
                if (err)
                    deferred.reject(err);
                else
                    deferred.resolve(mc);
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

        var splitTopics = mqUtils.returnPathItemsInArray(topic),    // check and return the nice topic format
            intf = splitTopics[0],                                  // example: 'register/ea:3c:4b:11:0e:6d'
            cId = splitTopics[1] ? splitTopics[1] : null,
            node = self._nodebox[cId],
            parsedMsg = JSON.parse(message),    // [FIXME] check later, message is a buffer or string?
            unknownIntf = false,
            messageHandler;

        // deal with the unknown 'node' here, thus no need to check it in each _handler
        if (!node && intf !== 'register' && intf !== 'response') {
            var rspObj = { status: RSPCODE.NotFound.value };
            this._responseSender(intf, cId, rspObj);
            return;
        }

        _.assign(parsedMsg, { clientId: cId });

        // if we are here, the node exists, and it is alive, re-enable his life checker
        node.enableLifeChecker();

        switch (intf) {
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

// Shepherd [TODO] update section
MShepherd.protoype._registerHandler = function (msg) {
    // reg_data = { clientId, ip, mac, lifetime, version, objList, port(opt) }
    var self = this,
        readAllObjectPromises = [],
        node = this._nodebox[msg.clientId],
        so = node ? node.so : null,
        rspObj = { status: RSPCODE.Created.value };

    if (!node) {
        // do register procedure
        node = this._nodebox[msg.clientId] = this.newMqttNode(msg.clientId, msg); // [FIXME] How to tackle options?
        so = node.so = new MqttNode.SmartObject();

        // objList: [ { oid, iid }, { oid, iid }, { oid, iid }, ... ]
        // transform to objList = { oid1: [ iid1, iid2 ], oid2: [ iid3, iid4, iid5] }
        _.forEach(msg.objList, function (idPair) {
            node.objList[idPair.oid] = node.objList[idPair.oid] || [];
            node.objList[idPair.oid].push(idPair.iid);
        });

        // read every object => dig into the structure and id-name transform
        _.forEach(node.objList, function (iids, oid) {
            var readReqProm = self.readReq(msg.clientId, { oid: oid }).done(function (objData) {
                so.addIObject(oid, objData);
            });
            readAllObjectPromises.push(readReqProm);
        });

        Q.all(readAllObjectPromises).then(function () {
            node.hookSmartObject(so);
            node._registered = true;
            return node.dbSave();
        }).done(function () {
            self._responseSender('register', msg.clientId, { status: RSPCODE.Created.value }).done();
            node.enableLifeCheck();
            self.emit('registered', node);
        }, function (err) {
            self._responseSender('register', msg.clientId, { status: RSPCODE.InternalServerError.value }).done();
        });
    } else {
        if (node.mac !== msg.mac)
            self._responseSender('register', msg.clientId, { status: RSPCODE.Conflict.value }).done();

        // do update procedure  [TODO] emit update or register repsonse, or both?
        // [TODO] if exists this clientId, how do I know if it conflicts?

        // this._updateHandler(msg, function () {
        //     self._responseSender('register', msg.clientId, rspObj);
        // });
    }
};

// Shepherd ok
MShepherd.protoype._deregisterHandler = function (msg) {
    // dereg_data = { clientId }; 
    var node = this._nodebox[msg.clientId];

    if (!node) {
        this._responseSender('deregister', msg.clientId, { status: RSPCODE.NotFound.value }).done();
    } else {
        node.disableLifeCheck();
        node.dbRemove();
        node._registered = false;
        node.so = null;
        delete node.so;
        this._nodebox[msg.clientId] = null;
        delete this._nodebox[msg.clientId];

        this._responseSender('deregister', msg.clientId, { status: RSPCODE.Deleted.value }).done();
        this.emit('deregistered', msg.clientId);
    }
};

// SmartObject [TODO]
MShepherd.protoype._notifyHandler = function (msg) {
    // notify_data = { clientId, oid, iid, rid, data }
    // (oid + iid), (oid + iid + rid)
    var self = this,
        node = this._nodebox[msg.clientId];

    if (!node || !node.so) {
        this._responseSender('notify', msg.clientId, { status: RSPCODE.NotFound.value }).done();
        return;
    }

    if (_.isUndefined(msg.oid) || _.isUndefined(msg.iid)) {
        this._responseSender('notify', msg.clientId, { status: RSPCODE.BadRequest.value }).done();
        return;
    }

    if (_.isUndefined(msg.rid)) {   // data is object instance
        // [TODO] implement so.update
        node.so.updateObjectInstance(msg).done(function (diff) {    // parse structure, update value
            self.emit('notified', diff);
            self._responseSender('notify', msg.clientId, { status: RSPCODE.Changed.value });
        }, function (err) {
            self.emit('error', err);
            self._responseSender('notify', msg.clientId, { status: RSPCODE.InternalServerError.value });
        });
    } else {                        // data is an resource
        node.so.updateResource(msg).done(function (diff) {          // parse structure, update value
            self.emit('notified', diff);
            self._responseSender('notify', msg.clientId, { status: RSPCODE.Changed.value });
        }, function (err) {          
            self.emit('error', err);
            self._responseSender('notify', msg.clientId, { status: RSPCODE.InternalServerError.value });
        });
    }
};

// MqttNode [TODO]
MShepherd.protoype._updateHandler = function (msg, callback) {
    // update_data = { clientId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt), port(opt) }
    var node = this._nodebox[msg.clientId],
        rspObj = { status: RSPCODE.OK.value };

    if (!node) {
        this._responseSender('update', msg.clientId, { status: RSPCODE.NotFound.value }).done();
        return;
    }
    // [TODO] if objList exists, should run de-register, then re-register

    // in node.updateAttrs(), if lifetime changes, reset the life checker
    node.updateAttrs(msg).fail(function (err) {

    }).done(function () {
        this._responseSender('update', msg.clientId, rspObj);
    });
};

// Shepherd ok
MShepherd.protoype._clientPingHandler = function (msg) {
    // ping_data = { clientId }
    this._responseSender('ping', msg.clientId, { status: RSPCODE.OK.value }).done();
};

// Shepherd ok
MShepherd.protoype._clientResponseHandler = function (msg) {
    // rsp_data = { clientId, transId, cmdId, status, data }
    var clientId = msg.clientId,
        cmdId = CMD.get(msg.cmdId) ? CMD.get(msg.cmdId).key : msg.cmdId,
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

    // resolve data only
    cmdProm.resolve(msg.data);
};

// Shepherd ok
MShepherd.protoype._otherTopicsHandler = function (topic, message, packet) {
    this.emit('unhandledTopic', topic, message, packet);
};

// Shepherd ok
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
    reqObj = mqUtils.turnReqObjOfIds(reqObj);
    return this._requestSender('read', clientId, reqObj, callback);
};

MShepherd.protoype.writeReq = function (clientId, reqObj, callback) {
    reqObj = mqUtils.turnReqObjOfIds(reqObj);
    return this._requestSender('write', clientId, reqObj, callback);
};

MShepherd.protoype.writeAttrsReq = function (clientId, reqObj, callback) {
    reqObj.attrs = reqObj.data;
    delete reqObj.data;
    reqObj = mqUtils.turnReqObjOfIds(reqObj);

    return this._requestSender('writeAttrs', clientId, reqObj, callback);
};

MShepherd.protoype.discoverReq = function (clientId, reqObj, callback) {
    reqObj = mqUtils.turnReqObjOfIds(reqObj);
    return this._requestSender('discover', clientId, reqObj, callback);
};

MShepherd.protoype.executeReq = function (clientId, reqObj, callback) {
    reqObj = mqUtils.turnReqObjOfIds(reqObj);
    return this._requestSender('execute', clientId, reqObj, callback);
};

MShepherd.protoype.observeReq = function (clientId, reqObj, callback) {
    reqObj = mqUtils.turnReqObjOfIds(reqObj);
    return this._requestSender('observe', clientId, reqObj, callback);
};

/************************************************************************/
/* Code Temp Zone                                                       */
/************************************************************************/
MShepherd.prototype.getCoordInfo = function () {};
MShepherd.prototype.getNwkInfo = function () {};
MShepherd.prototype.getDevList = function () {};
MShepherd.prototype.removeDevice = function () {};  // run deregister
MShepherd.prototype.setResourceReport = function () {};
MShepherd.prototype.readResource = function () {};
MShepherd.prototype.writeResource = function () {};
MShepherd.prototype.writeAttrs = function () {};
MShepherd.prototype.getAttrList = function () {};

// MShepherd.prototype.getNeighborTable = function () {};
// MShepherd.prototype.getRoutingTable = function () {};
MShepherd.prototype.changeKey = function () {};
MShepherd.prototype.getKey = function () {};
MShepherd.prototype.devListMaintain = function () {};
MShepherd.prototype.sleepyDevPacketPend = function () {};

MShepherd.prototype.onNwkReady = function () {};
MShepherd.prototype.onDeviceJoin = function () {};
MShepherd.prototype.onSleepyCheckIn = function () {};
MShepherd.prototype.onAttrChange = function () {};
MShepherd.prototype.onAttrReport = function () {};

module.exports = MShepherd;
