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
      SO = require('./SmartObject'),
      MDEFS = require('./defs/mdefs'),
      OID = MDEFS.OID,
      RID = MDEFS.RID,
      RSPCODE = MDEFS.RSPCODE;

const sobox = {},           // { clientId: so } box that holds the registered smart objects
      rspsToResolve = {};   // { clientId: { cmd: { transid: deferred } } }

module.exports = MShepherd;

function MShepherd(name, settings) {
    this._joinable = false;
    this._started = false;

    this.brokerSettings = settings || config.brokerSettings;
    this.clientId = name || config.shepherdName;
    this.mBroker = null;
    this.mClient = null;

    this.authPolicy = {
        // Default: authenticate everybody. Override@_setupAuth
        authenticate: function (client, user, pass, cb) { cb(null, true); },
        // Default: authorize everybody. Override@_setupAuth
        authorizePublish: function (client, topic, payload, cb) { cb(null, true); },
        // Default: authorize everybody. Override@_setupAuth
        authorizeSubscribe: function (client, topic, cb) { cb(null, true); },
        // Default: authorize any packet for any client. Override at will
        authorizeForward: function (client, packet, cb) { cb(null, true); }
    };

    this.peripheralConnected = function (client) {          // overridable
        console.log(client.clientId + ' is connected.');
    };

    this.peripheralDisconnecting = function (client) {      // overridable
        console.log(client.clientId + ' is disconnecting.');
    };

    this.peripheralDisconnected = function (client) {       // overridable
        console.log(client.clientId + ' is disconnected.');
    };

    this.peripheralPublished = function (client) {          // overridable
        console.log(client.clientId + ' has published a message.');
    };

    this.peripheralSubscribed = function (client) {         // overridable
        console.log(client.clientId + ' has subscribed to a topic.');
    };

    this.peripheralUnsubscribed = function (client) {       // overridable
        console.log(client.clientId + ' has unsubscribed to a topic.');
    };

    this.on('register', this._registerProcedure);
    this.on('deregister', this._deregisterProcedure);
    this.on('notify', this._notifyProcedure);
    this.on('update', this._updateProcedure);
    this.on('response', this._responseProcedure);

    this.permitJoin = function () {};
}

util.inherits(MShepherd, EventEmitter);

/*************************************************************************************************/
/*** MShepherd Major Functions                                                                 ***/
/*************************************************************************************************/
MShepherd.protoype.start = function (callback) {
    var self = this,
        deferred = Q.defer(),
        brokerEvents = [ 'ready', 'clientConnected', 'clientDisconnecting', 'published', 'subscribed', 'unsubscribed' ],
        broker = this.mBroker = new mosca.Server(this.brokerSettings);

    broker.once('ready', function () {
        self._setupAuth();                              // 1. set up authorization for peripherals

        _.forEach(brokerEvents, function (event) {      // 2. remove all listeners attached
            broker.removeAllListeners(event);
        });

        self._attachBrokerEventListeners();             // 3. re-attach listeners:
        self._setupShepherdAsClient()                   // 4. let shepherd in
            .then(function (mc) {
                return self._testShepherdPubSub(mc);    // 5. run shepherd pub/sub testing
            }).fail(function (err) {
                deferred.reject(err);
            }).done(function () {
                self._started = true;                   // 6. testings are done, emit 'started'
                self.emit('started');
                deferred.resolve();
            });
    });

    return deferred.promise.nodeify(callback);
};

MShepherd.protoype.stop = function (callback) {
    var deferred = Q.defer();

    if (!this._started) {
        deferred.resolve();
    } else {
        this._joinable = false;
        // [TODO]
        // close this.mClient, remove all his listeners
        // have to close this.broker? remove all his listeners
    }

    return deferred.promise.nodeify(callback);
};

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

MShepherd.protoype._registerHandler = function (msg) {
    var self = this,
        readAllObjectPromises = [],
        so = sobox[msg.clientId],
        rspObj = {
            intf: 'register',
            status: RSPCODE.OK.value
        };

    if (_.isUndefined(so)) {
        // do register procedure
        so = new SO(msg.clientId, msg);
        sobox[msg.clientId] = so;

        _.forEach(msg, function (item) {
            so.objList[item.oid] = so.objList[item.oid] || [];
            so.objList[item.oid].push(item.iid);
        });

        // read every object => dig into the structure and id-name transform
        _.forEach(so.objList, function (oid) {
            var prom = so.readObject(oid);
            readAllObjectPromises.push(prom);
        });

        Q.all(readAllObjectPromises).then(function () {
            so.enableLifeCheck();
            self._responseSender(so.clientId, rspObj)
                .then(function () {
                    self.emit('registered', so);
                });
        });
    } else {
        // do update procedure
        // [TODO]: Better hand off to _updateHandler
        so.update();    // update dev attr
        so.enableLifeCheck();
        self.emit('updated', so);   // [TODO]: send diff or what
    }

    this._responseSender(msg.clientId, rspObj);
};

MShepherd.protoype._deregisterHandler = function (msg) {
    var clientId = msg.clientId,
        so = sobox[clientId],
        rspObj = {
            intf: 'deregister',
            status: RSPCODE.OK.value
        };

    if (so) {
        delete sobox[clientId];
        // [TODO]: clear database
        // then: this._responseSender(clientId, rspObj);
    } else {
        rspObj.status = RSPCODE.NotFound.value;
        this._responseSender(clientId, rspObj);
    }
};

MShepherd.protoype._notifyHandler = function (msg) {
    var self = this,
        clientId = msg.clientId,
        so = sobox[clientId],
        rspObj = {
            intf: 'notify',
            status: RSPCODE.OK.value
        };

    if (so) {
        // [TODO]
    } else {
        rspObj.status = RSPCODE.NotFound.value;
        this._responseSender(clientId, rspObj);
    }
};

MShepherd.protoype._updateHandler = function (msg) {
    var self= this,
        clientId = msg.clientId,
        so = sobox[clientId],
        rspObj = {
            intf: 'update',
            status: RSPCODE.OK.value
        };

    if (so) {
        // [TODO]
    } else {
        rspObj.status = RSPCODE.NotFound.value;
        this._responseSender(clientId, rspObj);
    }
};

MShepherd.protoype._clientResponseHandler = function (msg) {
    var self= this,
        clientId = msg.clientId,
        clientProms = rspsToResolve[clientId],
        cmdProms = clientProms ? clientProms[msg.cmd] : undefined,
        cmdProm = cmdProms ? cmdProms[msg.transId] : undefined;


    if (cmdProm) {
        cmdProm.resolve(msg.data);
        delete rspsToResolve[clientId][msg.cmd][msg.transId];
        if (_.isEmpty(cmdProms)) {
            delete rspsToResolve[clientId][msg.cmd];

            if (_.isEmpty(clientProms)) {
                delete rspsToResolve[clientId];
            }
        }
    }
};

// shepherd -> pheripheral
MShepherd.protoype._responseSender = function (clientId, rspObj, callback) {  // { intf: 'register', status: 200 }
    var deferred = Q.defer(),
        topic = `{$rspObj.intf}/{$clientId}/`,
        msg;

        delete rspObj.intf;

        msg = JSON.stringify(rspObj);

    this.publish(topic, msg, { qos: 1, retain: false }, function () {
        deferred.resolve();
    });

    return deferred.promise.nodeify(callback);
};

// shepherd -> pheripheral
MShepherd.protoype._requestSender = function (clientId, reqObj, callback) {
    var deferred = Q.defer(),
        topic = `request/{$clientId}/`,
        msg;

        reqObj.transId = this.nextTransId();
        msg = JSON.stringify(reqObj);

    this.cmdPend(clientId, reqObj, deferred);
    this.publish(topic, msg, { qos: 1, retain: false });

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Tackling the mBroker Things                                                               ***/
/*************************************************************************************************/
MShepherd.prototype._setupAuth = function () {
    var self = this,
        broker = this.mBroker,
        authorized;

    this.authPolicy.authenticate = function (client, user, pass, cb) {
        var defaultAccount = config.account,
            authorized = (user === defaultAccount.username && pass.toString() === defaultAccount.password);

        if (authorized)
            client.user = user;

        cb(null, authorized);
    };

    this.authPolicy.authorizePublish = function (client, topic, payload, cb) {
        var defaultAccount = config.account,
            authorized = (client.clientId === self.clientId);   // shepherd can always pub

        // before registeration, anyone can just publish to 'register'
        if (topic === 'register') {
            authorized = true;
        }

        // only registered client can publish to arbitrary topics
        if ((client.user === defaultAccount.username) && (sobox[client.clientId])) {
            authorized = true;
        }

        cb(null, authorized);
    };

    this.authPolicy.authorizeSubscribe = function (client, topic, cb) {
        var defaultAccount = config.account,
            authorized = (client.clientId === self.clientId);      // shepherd can always sub

        // before registeration, anyone can just subscribe to his own 'register/{$client.clientId}' channel
        if (topic === `register/{$client.clientId}`) {
            authorized = true;
        }

        // only registered client can subscribe to arbitrary topics
        if ((client.user === defaultAccount.username) && (sobox[client.clientId])) {
            authorized = true;
        }

        cb(null, authorized);
    };

    broker.authenticate = function (client, user, pass, cb) {
        // always let shepherd pass
        if (client.id === self.clientId) {
            client.user = self.clientId;
            cb(null, true);
        } else {
            self.authPolicy.authenticate(client, user, pass, cb);
        }
    };

    broker.authorizePublish = function (client, topic, payload, cb) {
        // shepherd can always publish
        if (client.id === self.clientId) {
            cb(null, true);
        } else {
            self.authPolicy.authorizePublish(client, topic, payload, cb);
        }
    };


    broker.authorizeSubscribe = function (client, topic, cb) {
        // shepherd can always subscribe
        if (client.id === self.clientId) {
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

MShepherd.protoype._attachBrokerEventListeners = function () {
    var self = this,
        broker = this.mBroker;

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
};

/*************************************************************************************************/
/*** Tackling the mClient Things                                                               ***/
/*************************************************************************************************/
MShepherd.prototype._setupShepherdAsClient = function (callback) {
    var self = this,
        deferred = Q.defer(),
        options = config.clientConnOptions,
        mc;

    console.log(this.clientId + ' is connecting to the broker.');
    options.clientId = this.clientId;
    mc = this.mClient = mqtt.connect('mqtt://localhost', options);

    mc.on('connect', function (connack) {
        console.log(this.clientId + ' has connected to the broker.');

        if (!connack.sessionPresent) {
            // subscribe to topics of the interface
            mc.subscribe({
                'register': 0,
                'deregister': 0,
                'notify': 0,
                'update': 0,
                'response': 0
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
        console.log(this.clientId + ' is re-connecting to the broker.');
    });

    mc.on('close', function () {
        console.log(this.clientId + ' is disconnected from the broker.');
    });

    mc.on('offline', function () {
        console.log(this.clientId + ' is offline.');
    });

    mc.on('error', function (error) {
        console.log('Error occured when ' + this.clientId + ' was connecting to the broker.');
        self.emit('error', error);
        deferred.reject(error);
    });

    // attch message handler for each channel of topics
    mc.on('message', function (topic, message, packet) {
        // packet {
        //     cmd: 'publish'
        //   , messageId: 42
        //   , qos: 2
        //   , dup: false
        //   , topic: 'test'  <=== topic
        //   , payload: new Buffer('test')  <=== message
        //   , retain: false
        // }
        // this.emit('register', data);    // { clientId, ip, lifeTime, version, objList }
        // this.emit('deregister', data);  // { clientId }
        // this.emit('update', data);      // { clientId, ip, lifeTime, objList }
        // this.emit('notify', data);      // { clientId, objId, instId, resrcId, value }
        // this.emit('response', data);    // { clientId, objId, instId, resrcId, status }
        var messageHandler,
            parsedMsg;

        switch (topic) {
            case 'register':
                messageHandler = self._registerHandler(parsedMsg);
                break;
            case 'deregister':
                messageHandler = self._deregisterHandler(parsedMsg);
                break;
            case 'notify':
                messageHandler = self._notifyHandler(parsedMsg);
                break;
            case 'update':
                messageHandler = self._updateHandler(parsedMsg);
                break;
            case 'response':
                messageHandler = self.responseHandler(parsedMsg);
                break;
            default:
                messageHandler = self._otherTopicsHandler(parsedMsg);
                // pass to unhandled message
                break;
        }

        process.nextTick(function () {
            messageHandler(parsedMsg);
        });
    });

    return deferred.promise.nodeify(callback);
};

MShepherd.protoype._testShepherdPubSub = function (mc, callback) {
    // if we are here, the mClient is ok with subscribing to all channels
    // we can start our testing
    var deferred = Q.defer(),
        cId = this.clientId,
        testTopics = [ 'register', 'deregister', 'update', 'notify', 'response' ],
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
                if (message === 'test') 
                    checkCounter += 1;
                break;
            default:
                break;
        }

        if (checkCounter === 5) {
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
// MShepherd.prototype.setBindingEntry = function () {};
// MShepherd.prototype.addGroup = function () {};
// MShepherd.prototype.getGroupMembership = function () {};
// MShepherd.prototype.removeFromGroup = function () {};
// MShepherd.prototype.storeScene = function () {};
// MShepherd.prototype.removeScene = function () {};
// MShepherd.prototype.recallScene = function () {};
// MShepherd.prototype.getSceneMembership = function () {};
MShepherd.prototype.sleepyDevPacketPend = function () {};
MShepherd.prototype.onSleepyCheckIn = function () {};
MShepherd.prototype.onAttrChange = function () {};
MShepherd.prototype.getAttrList = function () {};
MShepherd.prototype.readAttr = function () {};
MShepherd.prototype.writeAttr = function () {};
MShepherd.prototype.setAttrReport = function () {};
MShepherd.prototype.onAttrReport = function () {};
// MShepherd.prototype.sendZclFrame = function () {};
// MShepherd.prototype.onZclReceive = function () {};

// server.storePacket();
// server.deleteOfflinePacket();
// server.forwardRetained();
// server.restoreClientSubscriptions();
// server.forwardOfflinePackets();
// server.updateOfflinePacket();
// server.persistClient();
// server.close();
// server.attachHttpServer();
// server.buildServe();