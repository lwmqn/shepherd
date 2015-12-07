'use strict';

const util = require('util'),
      EventEmitter = require('events'),
      _ = require('lodash'),
      Q = require('q'),
      // network = require('network'),
      mqtt = require('mqtt'),
      mosca = require('mosca'),
      debug = require('debug');

const mqdb = require('./mqdb'),
      MqttNode = require('./mqtt-node'),
      mqUtils = require('./utils/mqutils'),
      config = require('./config/config.js'),
      MDEFS = require('./defs/mdefs'),
      RSPCODE = MDEFS.RSPCODE,
      CMD = MDEFS.CMD;

const mBrokerEvents = [ 'ready', 'clientConnected', 'clientDisconnecting', 'published', 'subscribed', 'unsubscribed' ],
      mClientEvents = [ 'connect', 'reconnect', 'close', 'offline', 'error', 'message' ],
      unsuccessStatusCode = [ 400, 401, 404, 405, 409, 500 ];

// set up debuggers
var dbg_shp = debug('shp'),
    dbg_brk = debug('brk'),
    dbg_auth = debug('auth'),
    dbg_mc = debug('mc');

var reqTimeout = config.reqTimeout || 60000,
    tpyTimeout = 5000;

function MShepherd(name, settings) {
    EventEmitter.call(this);

    var self = this,
        permitJoinCountdown,
        transId = 0;

    this._nodebox = {};         // { clientId: node } box that holds the registered mqtt-nodes
    this._rspsToResolve = {};   // { clientId: { cmd: { transid: { deferred, tmoutCtrl } } } }

    this._joinable = false;
    this._enabled = false;
    this._permitJoinTime = 0;

    this.clientId = name || config.shepherdName;
    this.brokerSettings = settings || config.brokerSettings;

    this.mBroker = null;
    this.mClient = null;

    this.authPolicy = {
        // Override at will.
        authenticate: function (client, user, pass, cb) {
            var authorized = false;
            cb(null, authorized);
        },
        // Override at will.
        authorizePublish: function (client, topic, payload, cb) {
            var authorized = false;
            cb(null, authorized);
        },
        // Override at will.
        authorizeSubscribe: function (client, topic, cb) {
            var authorized = false;
            cb(null, authorized);
        },
        // Default: authorize any packet for any client. Override at will
        authorizeForward: function (client, packet, cb) {
            var authorized = true;
            cb(null, authorized);
        }
    };

    this.priphConnected = function (client) {          // overridable
        dbg_shp(`${client.id} is connected.`);
    };

    this.priphDisconnecting = function (client) {      // overridable
        dbg_shp(`${client.id} is disconnecting.`);
    };

    this.priphDisconnected = function (client) {       // overridable
        dbg_shp(`${client.id} is disconnected.`);
    };

    this.priphPublished = function (client) {          // overridable
        dbg_shp(`${client.id} has published a message.`);
    };

    this.priphSubscribed = function (client) {         // overridable
        dbg_shp(`${client.id} has subscribed to a topic.`);
    };

    this.priphUnsubscribed = function (client) {       // overridable
        dbg_shp(`${client.id} has unsubscribed to a topic.`);
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
        if (transId > 255)
            transId = 0;
        return transId++;
    };

    // [TODO2]
    this.on('_ready', function () {
        // shepherd is ready, next step is loading all mqtt-nodes from database, and check alive (asynchronously)
        var restoreNodes = [];

        dbg_shp('8. Inner _ready triggered');

        mqdb.exportClientIds().then(function (cIds) {
            dbg_shp('9. Restoring mqtt-nodes from mqdb');

            _.forEach(cIds, function (clientId) {
                var doRestore,
                    resNode;
                    dbg_shp(clientId);
                resNode = self._nodebox[clientId] = new MqttNode(self, clientId);
                doRestore = resNode.restore().done(function () {
                    resNode.enableLifeChecker();
                    resNode.maintain();             // maintain in the background
                });

                restoreNodes.push(doRestore);
            });

            return Q.all(restoreNodes);
        }).done(function () {
            dbg_shp('10. Restoring done. Fire "ready"');

            self.emit('ready');
        });
    });
}

util.inherits(MShepherd, EventEmitter);

/*************************************************************************************************/
/*** MShepherd Major Functions                                                                 ***/
/*************************************************************************************************/
MShepherd.prototype.start = function (callback) {
    var self = this,
        deferred = Q.defer(),
        broker = this.mBroker = this.mBroker || new mosca.Server(this.brokerSettings);

    broker.once('ready', function () {
        dbg_brk('Broker is ready');

        _setupAuthPolicy(self);                             // 1. set up authorization for priphs

        _.forEach(mBrokerEvents, function (event) {         // 2. remove all listeners attached
            broker.removeAllListeners(event);
        });

        _attachBrokerEventListeners(self)                   // 3. re-attach listeners:
            .then(function () {                             // 4. let shepherd in
                return _setShepherdAsClient(self);
            }).then(function () {                           // 5. run shepherd pub/sub testing
                return _testShepherdPubSub(self);
            }).delay(500).then(function () {
                return _attachShepherdMessageHandler(self);
            }).timeout(tpyTimeout, 'Broker init timeout')
            .done(function () {
                self._enabled = true;                       // 6. testings are done, shepherd is enabled 
                self.emit('_ready');                        // 7. if all done, shepherd fires '_ready' event for inner use
                deferred.resolve();
            }, function (err) {
                deferred.reject(err);
            });
    });

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype.stop = function (callback) {
    var self = this,
        deferred = Q.defer(),
        mClient = this.mClient;

    if (!this._enabled) {
        deferred.resolve();
    } else {
        this.permitJoin(0);
        this._enabled = false;
        // close mClient, force = true, close immediately
        mClient.end(true, function () {    
            self.mClient = null;
            deferred.resolve();
        });
    }

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype.reset = function (callback) {
    var self = this,
        deferred = Q.defer();

    this.stop().then(function () {
        return self.start();
    }).done(function () {
        deferred.resolve();
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype.deregisterNode = function (clientId, callback) {
    var self = this,
        deferred = Q.defer(),
        node = this._nodebox[clientId];

    if (!node) {
        this._responseSender('deregister', clientId, { status: RSPCODE.NotFound.value }).done();
    } else {
        node.status = 'offline';
        node.disableLifeChecker();
        node.dbRemove().done(function () {
            node._registered = false;
            node.so = null;
            delete node.so;
            self._nodebox[clientId] = null;
            delete self._nodebox[clientId];

            self._responseSender('deregister', clientId, { status: RSPCODE.Deleted.value }).done();
            self.emit('deregistered', clientId);
        }, function (err) {
            deferred.reject(err);
        });
    }

    deferred.resolve(clientId);

    return deferred.promise.nodeify(callback);
};

// shepherd -> pheripheral
MShepherd.prototype._responseSender = function (intf, clientId, rspObj, callback) {
    var self = this,
        deferred = Q.defer(),
        topic = `${intf}/response/${clientId}`,
        msg = JSON.stringify(rspObj);           // rspObj won't be changed if it is a string

    dbg_shp('Send response with topic: ' + topic);

    process.nextTick(function () {
        self.mClient.publish(topic, msg, { qos: 1, retain: false }, function () {
            deferred.resolve();
        });
    });

    return deferred.promise.nodeify(callback);
};

// shepherd -> pheripheral
MShepherd.prototype._requestSender = function (cmdId, clientId, reqObj, callback) {
    // convert cmdId to number, get transId and stringify request object in this method
    var self = this,
        deferred = Q.defer(),
        topic = `request/${clientId}`,
        msg;
    dbg_shp('Send request with topic: ' + topic);

    if (arguments.length < 2)
        deferred.reject(new Error('Bad arguments.'));

    reqObj.cmdId = _.isUndefined(CMD.get(cmdId)) ? cmdId : CMD.get(cmdId).value; // 255: unknown cmd

    if (reqObj.cmdId === 255)
        deferred.reject(new Error('Unable to send the unknown command.'));

    reqObj.transId = this.nextTransId();
    msg = JSON.stringify(reqObj);

    // load the cmd promise to be resolved
    // { clientId: { cmd: { transid: { deferred, tmoutCtrl } } } }
    this._rspsToResolve[clientId] = this._rspsToResolve[clientId] || {};
    this._rspsToResolve[clientId][cmdId] = this._rspsToResolve[clientId][cmdId] || {};
    this._rspsToResolve[clientId][cmdId][reqObj.transId] = {
        deferred: deferred,
        tmoutCtrl: setTimeout(function () {         // pass 'inner timeout handling' to _clientResponseHandler
            _clientResponseHandler(self, {
                clientId: clientId,
                transId: reqObj.transId,
                cmdId: cmdId,
                status: 'timeout',
                data: null
            });
        }, reqTimeout)
    };

    process.nextTick(function () {
        self.mClient.publish(topic, msg, { qos: 1, retain: false });
    });

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Request to Remote  APIs                                                                    ***/
/*************************************************************************************************/
MShepherd.prototype.readReq = function (clientId, reqObj, callback) {
    reqObj = mqUtils.turnReqObjOfIds(reqObj);
    return this._requestSender('read', clientId, reqObj, callback);
};

MShepherd.prototype.writeReq = function (clientId, reqObj, callback) {
    reqObj = mqUtils.turnReqObjOfIds(reqObj);
    return this._requestSender('write', clientId, reqObj, callback);
};

MShepherd.prototype.writeAttrsReq = function (clientId, reqObj, callback) {
    reqObj.attrs = reqObj.data;
    delete reqObj.data;
    reqObj = mqUtils.turnReqObjOfIds(reqObj);

    return this._requestSender('writeAttrs', clientId, reqObj, callback);
};

MShepherd.prototype.discoverReq = function (clientId, reqObj, callback) {
    reqObj = mqUtils.turnReqObjOfIds(reqObj);
    return this._requestSender('discover', clientId, reqObj, callback);
};

MShepherd.prototype.executeReq = function (clientId, reqObj, callback) {
    reqObj = mqUtils.turnReqObjOfIds(reqObj);
    return this._requestSender('execute', clientId, reqObj, callback);
};

MShepherd.prototype.observeReq = function (clientId, reqObj, callback) {
    reqObj = mqUtils.turnReqObjOfIds(reqObj);
    return this._requestSender('observe', clientId, reqObj, callback);
};

/*************************************************************************************************/
/*** Inner procedures: Tackling the mBroker Things                                             ***/
/*************************************************************************************************/
function _setupAuthPolicy(shepherd) {
    var shepherdId = shepherd.clientId,
        broker = shepherd.mBroker,
        authorized;

    broker.authenticate = function (client, user, pass, cb) {
        dbg_auth('Authenticate: ' + client.id + ':' + user);

        var defaultAccount = config.account,
            authorized = (user === defaultAccount.username && pass.toString() === defaultAccount.password);
        
        if (client.id === shepherdId) { // always let shepherd pass
            client.user = shepherdId;
            cb(null, true);
        } else if (authorized) {        // always let default account pass
            client.user = user;
            cb(null, authorized);
        } else {
            if (shepherd.authPolicy && _.isFunction(shepherd.authPolicy.authenticate))
                shepherd.authPolicy.authenticate(client, user, pass, cb);
            else
                cb(null, true);
        }
    };

    broker.authorizePublish = function (client, topic, payload, cb) {
        dbg_auth('Auth Pub: ' + client.id + ':' + topic);

        var validTopic = mqUtils.returnPathInSlashNotation(topic);

        if (client.id === shepherdId) {  // shepherd can always publish
            cb(null, true);
        } else if (client.user && shepherd._nodebox[client.id]) {
            // only authenticated user and registered client can publish to arbitrary topics
            cb(null, true);
        } else if (validTopic === `register/${client.id}` || validTopic === `response/${client.id}`) {
            // before registration, anyone can just publish to 'register' topic, and 'response' back from the shepherd request
            cb(null, true);
        } else {
            if (shepherd.authPolicy && _.isFunction(shepherd.authPolicy.authorizePublish))
                shepherd.authPolicy.authorizePublish(client, topic, payload, cb);
            else
                cb(null, true);
        }
    };

    broker.authorizeSubscribe = function (client, topic, cb) {
        dbg_auth('Auth Sub: ' + client.id + ':' + topic);

        var validTopic = mqUtils.returnPathInSlashNotation(topic);

        if (client.id === shepherdId) {  // shepherd can always subscribe
            cb(null, true);
        } else if (client.user && shepherd._nodebox[client.id]) {
            // only authenticated user and registered client can subscribe to arbitrary topics
            cb(null, true);
        } else if (validTopic === `register/response/${client.id}` || 
                   validTopic === `deregister/response/${client.id}` || 
                   validTopic === `request/${client.id}`) {
            // before registration, anyone can just subscribe to his own registeration and request channels:
            cb(null, true);
        } else {
            if (shepherd.authPolicy && _.isFunction(shepherd.authPolicy.authorizeSubscribe))
                shepherd.authPolicy.authorizeSubscribe(client, topic, cb);
            else
                cb(null, true);
        }
    };

    broker.authorizeForward = function (client, packet, cb) {
        dbg_auth('Auth Forward for: ' + client.id);

        if (client.id === shepherdId) {
            cb(null, true);
        } else {
            if (shepherd.authPolicy && _.isFunction(shepherd.authPolicy.authorizeForward))
                shepherd.authPolicy.authorizeForward(client, packet, cb);
            else
                cb(null, true);
        }
    };
}

function _attachBrokerEventListeners(shepherd, callback) {
    var shepherdId = shepherd.clientId,
        broker = shepherd.mBroker,
        deferred = Q.defer();

    broker.on('clientConnected', function (client) {
        dbg_brk(client.id + ' clientConnected');

        if (client.id !== shepherdId)
            shepherd.priphConnected(client);
    });

    broker.on('clientDisconnecting', function (client) { 
        dbg_brk(client.id + ' clientDisconnecting');

        if (client.id !== shepherdId)
            shepherd.priphDisconnecting(client);
    });

    broker.on('clientDisconnected', function (client) {
        dbg_brk(client.id + ' clientDisconnected');

        if (client.id !== shepherdId)
            shepherd.priphDisconnected(client);
    });

    broker.on('published', function (packet, client) {
        if (client) {
            dbg_brk(client.id + ' published ' + packet.topic);

            if (client.id !== shepherdId)
                shepherd.priphPublished(client);
        }
    });

    broker.on('subscribed', function (topic, client) {
        dbg_brk(client.id + ' subscribed ' + topic);

        if (client.id !== shepherdId)
            shepherd.priphSubscribed(client);
    });

    broker.on('unsubscribed', function (topic, client) {
        dbg_brk(client.id + ' unsubscribed ' + topic);

        if (client.id !== shepherdId)
            shepherd.priphUnsubscribed(client);
    });

    deferred.resolve();

    return deferred.promise.nodeify(callback);
}

/*************************************************************************************************/
/*** Inner procedures: Tackling the mClient Things                                             ***/
/*************************************************************************************************/
function _setShepherdAsClient(shepherd, callback) {
    dbg_shp('5. Set up shepherd as a client');

    var shepherdId = shepherd.clientId,
        deferred = Q.defer(),
        options = config.clientConnOptions,
        mc;

    options.clientId = shepherdId;
    mc = shepherd.mClient = mqtt.connect('mqtt://localhost', options);

    mc.on('close', function () {
        dbg_mc(`${shepherdId} is disconnected from the broker.`);
    });

    mc.on('offline', function () {
        dbg_mc(`${shepherdId} is offline.`);
    });

    mc.on('reconnect', function () {
        dbg_mc(`${shepherdId} is re-connecting to the broker.`);
    });

    mc.on('connect', function (connack) {
        dbg_mc(`${shepherdId} is connected to the broker.`);

        if (connack.sessionPresent) {   // session already exists, no need to subscribe again
            dbg_mc('Section is present');
            deferred.resolve();
            return;
        }

        mc.subscribe({      // subscribe to topics of all channels
            'register/#': 0,
            'deregister/#': 0,
            'notify/#': 1,
            'update/#': 1,
            'response/#': 1,
            'ping/#': 0,
            'lwt/#': 0,
            'request/#': 0,
            'announce/#': 0
        }, function (err, granted) {
            //--------- debug -----------------------------------
            _.forEach(granted, function (gn) { dbg_shp(gn); });
            //---------------------------------------------------
            if (err)
                deferred.reject(err);
            else
                deferred.resolve();
        });
    });

    return deferred.promise.nodeify(callback);
}

// Shepherd ok
function _testShepherdPubSub(shepherd, callback) {
    dbg_shp('6. Test shepherd pub/sub functions');

    var deferred = Q.defer(),
        mc = shepherd.mClient,
        shepherdId = shepherd.clientId,
        testTopics = [ 'register', 'deregister', 'update', 'notify', 'response', 'ping', 'request', 'announce', 'lwt' ],
        testMessage = '{"test": "testme"}',
        testMsgListener,
        totalCount = testTopics.length,
        checkCount = 0;

    testTopics = testTopics.map(function (tp) {
        return (tp + '/response/' + shepherdId);    // register/response/shepherdId
    });

    testMsgListener = function (topic, message, packet)  {
        var msgStr = message.toString(),
            parsedMsg = mqUtils.jsonify(msgStr);

        parsedMsg = parsedMsg ? _.assign(parsedMsg, { clientId: shepherdId }) : msgStr;

        switch (topic) {
            case testTopics[0]:
            case testTopics[1]:
            case testTopics[2]:
            case testTopics[3]:
            case testTopics[4]:
            case testTopics[5]:
            case testTopics[6]:
            case testTopics[7]:
            case testTopics[8]:
                if (parsedMsg.test === 'testme')
                    checkCount += 1;

                dbg_mc(`Testing topic: ${topic}. Msg: ${msgStr}. Pass count: ${checkCount}/${totalCount}`);
                break;
            default:
                break;
        }

        if (checkCount === totalCount) {
            mc.removeListener('message', testMsgListener);
            mc.unsubscribe(testTopics, function () {
                dbg_shp('7. Shepherd pub/sub test result: OK');

                deferred.resolve();
            });
        }
    };

    mc.on('message', testMsgListener);

    mc.subscribe(testTopics, function (err, granted) {
        if (err) {
            deferred.reject(err);
        } else {
   // setTimeout(function () {
            _.forEach(testTopics, function (tp) {
                mc.publish(tp, testMessage);
            });
   // }, 500);

        }
    });

    return deferred.promise.nodeify(callback);
}

function _attachShepherdMessageHandler(shepherd, callback) {
    dbg_shp('_attachShepherdMessageHandler start');

    var self = shepherd,
        deferred = Q.defer(),
        mc = shepherd.mClient;

    mc.unsubscribe([ 'request/#', 'announce/#' ]);
    mc.on('error', function (err) {
        dbg_mc(`Error occured when ${shepherd.clientId} was connecting to the broker.`);
        shepherd.emit('error', err);
    });

    // attach message handler for each channel of topics
    mc.on('message', function (topic, message, packet) {

        // topics: 'register/*', 'deregister/*', 'notify/*', 'update/*', 'response/*', 'ping'
        //      packet { cmd: 'publish', messageId: 42, qos: 2, dup: false,
        //               topic: 'test', payload: new Buffer('test'), retain: false }
        // [NOTE] message is a buffer
        var splitTopics = mqUtils.returnPathItemsInArray(topic),    // check and return the nice topic format
            intf = splitTopics[0],                                  // example: 'register/ea:3c:4b:11:0e:6d'
            cId = splitTopics[1] ? splitTopics[1] : null,
            node = shepherd._nodebox[cId],
            parsedMsg,
            unknownIntf = false,
            messageHandler;

        if (cId === 'response')
            return;

        dbg_mc('message with topic: ' + topic);

        // deal with the unknown 'node' here, thus no need to check it in each _handler
        if (!node && intf !== 'register' && intf !== 'response') {
            shepherd._responseSender(intf, cId, { status: RSPCODE.NotFound.value });
            return;
        }

        var msgStr = message.toString();
        if (msgStr[0] === '{' && msgStr[msgStr.length-1] === '}') {
            parsedMsg = JSON.parse(msgStr);
            _.assign(parsedMsg, { clientId: cId });
        } else {
            parsedMsg = msgStr;
        }

        if (intf === 'lwt')
            parsedMsg = { clientId: cId, data: msgStr };

        dbg_shp('Received Msg: ');
        dbg_shp( parsedMsg);
        // if we are here, the node exists, and it is alive, re-enable his life checker
        if (node)
            node.enableLifeChecker();

        switch (intf) {
            case 'register':
                // reg_data = { clientId, lifetime, version, objList, ip, port(opt) }
                messageHandler = _clientRegisterHandler;
                break;
            case 'deregister':
                // dereg_data = { clientId }; 
                messageHandler = _clientDeregisterHandler;
                break;
            case 'notify':
                // notify_data = { clientId, oid, iid, rid, data }
                _.forEach(parsedMsg, function (val, key) {
                    if (key === 'oid') {
                        parsedMsg.oid = MDEFS.getOidKey(val);
                        parsedMsg.oid = _.isUndefined(parsedMsg.oid) ? val : parsedMsg.oid;
                    } else if (key === 'rid') {
                        parsedMsg.rid = MDEFS.getRidString(val);
                        parsedMsg.rid = _.isUndefined(parsedMsg.rid) ? val : parsedMsg.rid;
                    }
                });
                messageHandler = _clientNotifyHandler;
                break;
            case 'update':
                // update_data = { clientId, lifeTime(opt), version(opt), objList(opt), ip(opt), port(opt) }
                messageHandler = _clientUpdateHandler;
                break;
            case 'response':
                // rsp_data = { clientId, transId, cmdId, status, data }
                messageHandler = _clientResponseHandler;
                break;
            case 'ping':
                // ping_data = { clientId }
                messageHandler = _clientPingHandler;
                break;
            case 'lwt':
                // lwt_data = { clientId, data }
                messageHandler = _clientLwtHandler;
                break;
            default:
                // pass the orginal arguments to _clientOtherTopicsHandler()
                unknownIntf = true;
                messageHandler = _clientOtherTopicsHandler;
                break;
        }

        process.nextTick(function () {
            if (unknownIntf)
                messageHandler(shepherd, topic, message, packet);
            else
                messageHandler(shepherd, parsedMsg);
        });
    });

    dbg_shp('_attachShepherdMessageHandler end');
    deferred.resolve();

    return deferred.promise.nodeify(callback);
}

/*************************************************************************************************/
/*** Handlers for Requests From Client                                                         ***/
/*************************************************************************************************/
function _clientRegisterHandler(shepherd, msg) {
    // reg_data = { clientId, ip, mac, lifetime, version, objList, port(opt) }
    var shepherdId = shepherd.clientId,
        readAllObjectPromises = [],
        node = shepherd._nodebox[msg.clientId],
        so = node ? node.so : null,
        rspObj = {
            status: RSPCODE.Created.value
        };

    if (msg.clientId === shepherdId)     // shepherd itself no need to be in nodebox
        return;

    // objList: [ { oid, iid }, { oid, iid }, { oid, iid }, ... ]
    // transform to objList = { oid1: [ iid1, iid2 ], oid2: [ iid3, iid4, iid5] }
    var oList = {};
    _.forEach(msg.objList, function (idPair) {
        if (!_.isArray(oList[idPair.oid]))
            oList[idPair.oid] = [];

        oList[idPair.oid].push(idPair.iid);
    });

    msg.objList = oList;
    // [TODO] we should attach objList to node

    if (!node && msg.clientId) {
        // do register procedure
        node = shepherd._nodebox[msg.clientId] = new MqttNode(shepherd, msg.clientId, msg); // [FIXME] How to tackle options?
        so = node.so = new MqttNode.SmartObject();

        // read every object => dig into the structure and id-name transform
        _.forEach(msg.objList, function (iids, oid) {
            var oidNum = MDEFS.getOidNumber(oid);
            oidNum = _.isUndefined(oidNum) ? oid : oidNum;

            var readReqProm = shepherd.readReq(msg.clientId, { oid: oidNum }).then(function (objData) {
                dbg_shp('read req response back');
                dbg_shp(objData);
                so.addIObject(oidNum, objData);
            });

            readAllObjectPromises.push(readReqProm);
        });

        Q.all(readAllObjectPromises).then(function () {
            node.hookSmartObject(so);
            node._registered = true;
            node.status = 'online';
            return node.dbSave();
        }).done(function () {
            shepherd._responseSender('register', msg.clientId, { status: RSPCODE.Created.value }).done();
            node.enableLifeChecker();
            shepherd.emit('registered', node);
        }, function (err) {
            shepherd._responseSender('register', msg.clientId, { status: RSPCODE.InternalServerError.value }).done();
        });
    } else {
        if (node.mac !== msg.mac)
            shepherd._responseSender('register', msg.clientId, { status: RSPCODE.Conflict.value }).done();

        _clientUpdateHandler(shepherd, msg); // [TODO] this
        shepherd._responseSender('register', msg.clientId, { status: RSPCODE.OK.value }).done();
    }
}

function _clientDeregisterHandler(shepherd, msg) {
    // dereg_data = { clientId }; 
    var node = shepherd._nodebox[msg.clientId];

    if (!node) {
        shepherd._responseSender('deregister', msg.clientId, { status: RSPCODE.NotFound.value }).done();
    } else {
        node.disableLifeChecker();
        node.dbRemove();
        node._registered = false;
        node.so = null;
        delete node.so;
        shepherd._nodebox[msg.clientId] = null;
        delete shepherd._nodebox[msg.clientId];

        shepherd._responseSender('deregister', msg.clientId, { status: RSPCODE.Deleted.value }).done();
        shepherd.emit('deregistered', msg.clientId);
    }
}

function _clientNotifyHandler(shepherd, msg) {
    // notify_data = { clientId, oid, iid, rid, data }
    // (oid + iid), (oid + iid + rid)
    var node = shepherd._nodebox[msg.clientId];

    if (!node || !node.so) {
        shepherd._responseSender('notify', msg.clientId, { status: RSPCODE.NotFound.value }).done();
        return;
    }

    if (_.isUndefined(msg.oid) || _.isUndefined(msg.iid)) {
        shepherd._responseSender('notify', msg.clientId, { status: RSPCODE.BadRequest.value }).done();
        return;
    }

    if (_.isUndefined(msg.rid)) {   // data is object instance
        node.updateObjectInstance(msg.oid, msg.iid, msg.data).done(function (data) {
            shepherd.emit('notified', msg);
            shepherd._responseSender('notify', msg.clientId, { status: RSPCODE.Changed.value });
        }, function (err) {
            shepherd.emit('error', err);
            shepherd._responseSender('notify', msg.clientId, { status: RSPCODE.InternalServerError.value });
        });
    } else {                        // data is an resource
        node.updateResource(msg.oid, msg.iid, msg.rid, msg.data).done(function (data) {
            shepherd.emit('notified', msg);
            shepherd._responseSender('notify', msg.clientId, { status: RSPCODE.Changed.value });
        }, function (err) {          
            shepherd.emit('error', err);
            shepherd._responseSender('notify', msg.clientId, { status: RSPCODE.InternalServerError.value });
        });
    }
}

function _clientUpdateHandler(shepherd, msg) {
    // update_data = { clientId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt), port(opt) }
    var node = shepherd._nodebox[msg.clientId];

    if (!node) {
        shepherd._responseSender('update', msg.clientId, { status: RSPCODE.NotFound.value }).done();
        return;
    }

    // [FIXME] if objList exists, should we run de-register, and then re-register again?
    node.updateAttrs(msg).done(function (diff) {
        shepherd._responseSender('update', msg.clientId, { status: RSPCODE.Changed.value });
        shepherd.emit('updated', { clientId: node.clientId, data: diff });
    }, function (err) {
        shepherd._responseSender('update', msg.clientId, { status: RSPCODE.InternalServerError.value });
    });
}

function _clientPingHandler(shepherd, msg) {
    // ping_data = { clientId }
    shepherd._responseSender('ping', msg.clientId, { status: RSPCODE.OK.value }).done();
}

function _clientLwtHandler(shepherd, msg) {
    // lwt_data = { clientId, data }
    var node = shepherd._nodebox[msg.clientId];
    if (node)
        node.status = 'offline';
}

function _clientResponseHandler(shepherd, msg) {
    // rsp_data = { clientId, transId, cmdId, status, data }
    dbg_shp('Client Response Handling');
    dbg_shp(msg);
    var clientId = msg.clientId,
        cmdId = CMD.get(msg.cmdId) ? CMD.get(msg.cmdId).key : msg.cmdId,
        clientProms = shepherd._rspsToResolve[clientId],
        cmdProms = clientProms ? clientProms[cmdId] : undefined,
        cmdProm = cmdProms ? cmdProms[msg.transId] : undefined;

    if (!cmdProm) { return; }

    clearTimeout(cmdProm.tmoutCtrl);

    // if status is unsuccessful or 'timeout', reject it. Otherwise, resolve data only
    if (msg.status === 'timeout') { // inner timeout handling
        cmdProm.deferred.reject(new Error(`${cmdId} request timeout`));
    } else if (_.includes(unsuccessStatusCode, msg.status)) {
        cmdProm.deferred.reject(new Error(`Response of ${cmdId} fails. Status code: ${msg.status}`));
    } else {
        cmdProm.deferred.resolve(msg.data);
    }

    delete shepherd._rspsToResolve[clientId][cmdId][msg.transId];

    if (_.isEmpty(cmdProms)) {
        delete shepherd._rspsToResolve[clientId][cmdId];

        if (_.isEmpty(clientProms))
            delete shepherd._rspsToResolve[clientId];
    }
}

function _clientOtherTopicsHandler(shepherd, topic, message, packet) {
    shepherd.emit('unhandledTopic', topic, message, packet);
}

/*************************************************************************************************/
/*** Code Temp Zone                                                                            ***/
/*************************************************************************************************/
MShepherd.prototype.getInfo = function () {
    // embrace getNwkInfo
    // network module
};

// ok
MShepherd.prototype.getDevList = function (callback) {
    var deferred = Q.defer(),
        mqttNodes = [];

    _.forEach(this._nodebox, function (node, clientId) {
        mqttNodes.push({
            clientId: node.clientId,
            lifetime: node.lifetime,
            ip: node.ip,
            mac: node.mac
        });
    });

    deferred.resolve(mqttNodes);
    return deferred.promise.nodeify(callback);
};



// no need - observeReq     MShepherd.prototype.setResourceReport
// no need - readReq        MShepherd.prototype.readResource
// no need - writeReq       MShepherd.prototype.writeResource
// no need - writeAttrsReq  MShepherd.prototype.writeAttrs
// no need - disover        MShepherd.prototype.getAttrList

MShepherd.prototype.devListMaintain = function () {};


MShepherd.prototype.changeKey = function () {};
MShepherd.prototype.getKey = function () {};
MShepherd.prototype.sleepyDevPacketPend = function () {};

MShepherd.prototype.onNwkReady = function () {};        // ready
MShepherd.prototype.onDeviceJoin = function () {};      // registered
MShepherd.prototype.onSleepyCheckIn = function () {};
MShepherd.prototype.onAttrChange = function () {};      // updated
MShepherd.prototype.onAttrReport = function () {};      // notified

module.exports = MShepherd;
