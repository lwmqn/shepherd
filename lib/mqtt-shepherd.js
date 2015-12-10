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
      mutils = require('./utils/mutils'),
      config = require('./config/config.js');

const unsuccessStatusCode = [ 400, 401, 404, 405, 409, 500 ];

const dbg_mode = true;
// set up debuggers
var SHP = debug('shp'),
    BRK = debug('brk'),
    AUTH = debug('auth'),
    MC = debug('mc'),
    ERR = debug('shp:err');

var reqTimeout = config.reqTimeout || 60000,
    tpyTimeout = 8000;

function MShepherd(name, settings) {
    EventEmitter.call(this);

    var self = this,
        permitJoinCountdown,
        transId = 0;

    this._nodebox = {};         // { clientId: node } box that holds the registered mqtt-nodes
    this._rspsToResolve = {};   // { clientId: { cmd: { transid: { deferred, tmoutCtrl } } } }
    this._channels = {
        'register/#': 0,
        'deregister/#': 0,
        'notify/#': 1,
        'update/#': 1,
        'response/#': 1,
        'ping/#': 0,
        'lwt/#': 0,
        'request/#': 0,
        'announce/#': 0
    };

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
            var authorized = true;
            cb(null, authorized);
        },
        // Default: authorize any packet for any client. Override at will
        authorizeForward: function (client, packet, cb) {
            var authorized = true;
            cb(null, authorized);
        }
    };

    this.priphConnected = function (client) {          // overridable
        SHP(`${client.id} is connected.`);
    };

    this.priphDisconnecting = function (client) {      // overridable
        SHP(`${client.id} is disconnecting.`);
    };

    this.priphDisconnected = function (client) {       // overridable
        SHP(`${client.id} is disconnected.`);
    };

    this.priphPublished = function (client) {          // overridable
        SHP(`${client.id} has published a message.`);
    };

    this.priphSubscribed = function (client) {         // overridable
        SHP(`${client.id} has subscribed to a topic.`);
    };

    this.priphUnsubscribed = function (client) {       // overridable
        SHP(`${client.id} has unsubscribed to a topic.`);
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

    this.on('_ready', function () {
        self.emit('ready');
    });
}

util.inherits(MShepherd, EventEmitter);

/*************************************************************************************************/
/*** MShepherd Major Functions                                                                 ***/
/*************************************************************************************************/
MShepherd.prototype.start = function (callback) {
    var shepherd = this,
        deferred = Q.defer(),
        mBrokerEvents = [       // Event names for removing broker listeners
            'ready', 'clientConnected', 'clientDisconnecting', 'published', 'subscribed', 'unsubscribed'
        ],
        broker,
        initProcedure;

    initProcedure = function () {
        BRK('Broker is ready');

        _setupAuthPolicy(shepherd).then(function () {       // 1. set up authorization for priphs
            _.forEach(mBrokerEvents, function (event) {
                broker.removeAllListeners(event);           // 2. remove all listeners attached
            });
            return true;
        }).then(function () {
            return _attachBrokerEventListeners(shepherd);   // 3. re-attach listeners:
        }).then(function () {
            return _setShepherdAsClient(shepherd);          // 4. let shepherd in
        }).then(function () {
            return _testShepherdPubSub(shepherd);           // 5. run shepherd pub/sub testing
        }).delay(2000).then(function () {
            return _attachShepherdMessageHandler(shepherd);
        }).timeout(tpyTimeout, 'Broker init timeout').done(function () {
            shepherd._enabled = true;                       // 6. testings are done, shepherd is enabled 
            shepherd.emit('_ready');                        // 7. if all done, shepherd fires '_ready' event for inner use
            deferred.resolve();
        }, function (err) {
            ERR(err);
            deferred.reject(err);
        });
    };

    _loadNodesFromDb(shepherd).then(function () {
        if (!shepherd.mBroker)
            shepherd.mBroker = new mosca.Server(shepherd.brokerSettings);
        
        broker = shepherd.mBroker;
        broker.once('ready', initProcedure);
    }).fail(function (err) {
        ERR(err);
        deferred.reject(err);
    }).done();

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
        ERR(err);
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype.deregisterNode = function (clientId, callback) {
    var self = this,
        deferred = Q.defer(),
        node = this._nodebox[clientId];

    if (!node) {
        this._responseSender('deregister', clientId, { status: rspCodeNum('NotFound') }).done();
    } else {
        node.status = 'offline';
        node.disableLifeChecker();
        node.dbRemove().done(function () {
            node._registered = false;
            node.so = null;
            delete node.so;
            self._nodebox[clientId] = null;
            delete self._nodebox[clientId];

            self._responseSender('deregister', clientId, { status: rspCodeNum('Deleted') }).done();
            self.emit('deregistered', clientId);
        }, function (err) {
            ERR(err);
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

    process.nextTick(function () {
        SHP('Send response with topic: ' + topic);
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

    if (arguments.length < 2) {
        deferred.reject(new Error('Bad arguments.'));
        return deferred.promise.nodeify(callback);
    }

    reqObj.cmdId = _.isUndefined(cmdIdNum(cmdId)) ? cmdId : cmdIdNum(cmdId); // 255: unknown cmd

    if (!this._enabled) {
        deferred.reject(new Error('Shepherd is not ready, cannot send request.'));
    } else if (reqObj.cmdId === 255) {
        deferred.reject(new Error('Unable to send the unknown command.'));
    } else {
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
            SHP('Send request with topic: ' + topic);
            self.mClient.publish(topic, msg, { qos: 1, retain: false });
        });
    }

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Request to Remote  APIs                                                                    ***/
/*************************************************************************************************/
MShepherd.prototype.readReq = function (clientId, reqObj, callback) {
    reqObj = mutils.turnReqObjOfIds(reqObj);
    return this._requestSender('read', clientId, reqObj, callback);
};

MShepherd.prototype.writeReq = function (clientId, reqObj, callback) {
    reqObj = mutils.turnReqObjOfIds(reqObj);
    return this._requestSender('write', clientId, reqObj, callback);
};

MShepherd.prototype.writeAttrsReq = function (clientId, reqObj, callback) {
    reqObj.attrs = reqObj.data;
    delete reqObj.data;
    reqObj = mutils.turnReqObjOfIds(reqObj);

    return this._requestSender('writeAttrs', clientId, reqObj, callback);
};

MShepherd.prototype.discoverReq = function (clientId, reqObj, callback) {
    reqObj = mutils.turnReqObjOfIds(reqObj);
    return this._requestSender('discover', clientId, reqObj, callback);
};

MShepherd.prototype.executeReq = function (clientId, reqObj, callback) {
    reqObj = mutils.turnReqObjOfIds(reqObj);
    return this._requestSender('execute', clientId, reqObj, callback);
};

MShepherd.prototype.observeReq = function (clientId, reqObj, callback) {
    reqObj = mutils.turnReqObjOfIds(reqObj);
    return this._requestSender('observe', clientId, reqObj, callback);
};

/*************************************************************************************************/
/*** Inner procedures: Tackling the mBroker Things                                             ***/
/*************************************************************************************************/
function _setupAuthPolicy(shepherd, callback) {
    var deferred = Q.defer(),
        shepherdId = shepherd.clientId,
        broker = shepherd.mBroker,
        authorized;

    broker.authenticate = function (client, user, pass, cb) {
        AUTH('Authenticate: ' + client.id + ':' + user);

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

        // if (dbg_mode) return 'authenticate';
    };

    broker.authorizePublish = function (client, topic, payload, cb) {
        AUTH('Auth Pub: ' + client.id + ':' + topic);

        var validTopic = mutils.slashPath(topic);

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

        // if (dbg_mode) return 'authorizePublish';
    };

    broker.authorizeSubscribe = function (client, topic, cb) {
        AUTH('Auth Sub: ' + client.id + ':' + topic);

        var validTopic = mutils.slashPath(topic);

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

        // if (dbg_mode) return 'authorizeSubscribe';
    };

    broker.authorizeForward = function (client, packet, cb) {
        AUTH('Auth Forward for: ' + client.id);

        if (client.id === shepherdId) {
            cb(null, true);
        } else {
            if (shepherd.authPolicy && _.isFunction(shepherd.authPolicy.authorizeForward))
                shepherd.authPolicy.authorizeForward(client, packet, cb);
            else
                cb(null, true);
        }

        // if (dbg_mode) return 'authorizeForward';
    };

    deferred.resolve();

    return deferred.promise.nodeify(callback);
}

function _attachBrokerEventListeners(shepherd, callback) {
    var deferred = Q.defer(),
        shepherdId = shepherd.clientId,
        broker = shepherd.mBroker;

    broker.on('clientConnected', function (client) {
        BRK(client.id + ' clientConnected');
        
        var node = shepherd._nodebox[client.id];

        if (client.id !== shepherdId)
            shepherd.priphConnected(client);

        if (node) {     // if in nodebox, perform maintain after 2 seconds
            node.status = 'online';
            setTimeout(function () {
                process.nextTick(function () {
                    node.maintain().done();
                });
            }, 2000);
        }
    });

    broker.on('clientDisconnecting', function (client) { 
        BRK(client.id + ' clientDisconnecting');

        if (client.id !== shepherdId)
            shepherd.priphDisconnecting(client);
    });

    broker.on('clientDisconnected', function (client) {
        BRK(client.id + ' clientDisconnected');

        var node = shepherd._nodebox[client.id];

        if (client.id !== shepherdId)
            shepherd.priphDisconnected(client);

        if (node) {
            node.status = 'offline';
            node.dbSave().done();
        }
    });

    broker.on('published', function (packet, client) {
        if (client) {
            BRK(client.id + ' published ' + packet.topic);

            if (client.id !== shepherdId)
                shepherd.priphPublished(client);
        }
    });

    broker.on('subscribed', function (topic, client) {
        BRK(client.id + ' subscribed ' + topic);

        if (client.id !== shepherdId)
            shepherd.priphSubscribed(client);
    });

    broker.on('unsubscribed', function (topic, client) {
        BRK(client.id + ' unsubscribed ' + topic);

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
    var deferred = Q.defer(),
        shepherdId = shepherd.clientId,
        options = config.clientConnOptions,
        mc;

    options.clientId = shepherdId;

    if (!shepherd.mClient) {
        shepherd.mClient = mqtt.connect('mqtt://localhost', options);
    }

    mc = shepherd.mClient;

    mc.on('close', function () {
        MC(`${shepherdId} is disconnected from the broker.`);
    });

    mc.on('offline', function () {
        MC(`${shepherdId} is offline.`);
    });

    mc.on('reconnect', function () {
        MC(`${shepherdId} is re-connecting to the broker.`);
    });

    mc.on('connect', function (connack) {
        MC(`${shepherdId} is connected to the broker.`);

        if (connack.sessionPresent) {   // session already exists, no need to subscribe again
            deferred.resolve();
            return deferred.promise.nodeify(callback);
        }

        mc.subscribe(shepherd._channels, function (err, granted) {  // subscribe to topics of all channels
            // _.forEach(granted, function (gn) { SHP(gn); }); // [DEBUG]
            if (err) {
                ERR(err);
                deferred.reject(err);
            } else {
                deferred.resolve(granted);
            }
        });
    });

    return deferred.promise.nodeify(callback);
}

// Shepherd ok
function _testShepherdPubSub(shepherd, callback) {
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
            parsedMsg = mutils.jsonify(msgStr);

        parsedMsg = parsedMsg ? _.assign(parsedMsg, { clientId: shepherdId }) : msgStr;

        switch (topic) {
            case testTopics[0]:    // register/response/shepherdId
            case testTopics[1]:    // deregister/response/shepherdId
            case testTopics[2]:    // update/response/shepherdId
            case testTopics[3]:    // notify/response/shepherdId
            case testTopics[4]:    // response/response/shepherdId
            case testTopics[5]:    // ping/response/shepherdId
            case testTopics[6]:    // request/response/shepherdId     -- should remove after test
            case testTopics[7]:    // announce/response/shepherdId    -- should remove after test
            case testTopics[8]:    // lwt/response/shepherdId
                if (parsedMsg.test === 'testme')
                    checkCount += 1;

                // MC(`Testing topic: ${topic}. Msg: ${msgStr}. Pass count: ${checkCount}/${totalCount}`);
                break;
            default:
                break;
        }

        if (checkCount === totalCount) {
            mc.removeListener('message', testMsgListener);
            deferred.resolve();
        }
    };

    mc.on('message', testMsgListener);

    _.forEach(testTopics, function (tp) {
        setTimeout(function () {
            mc.publish(tp, testMessage);
        }, 20);
    });

    return deferred.promise.nodeify(callback);
}

function _attachShepherdMessageHandler(shepherd, callback) {
    var deferred = Q.defer(),
        mc = shepherd.mClient;

    mc.unsubscribe([ 'request/#', 'announce/#' ]);

    mc.on('error', function (err) {
        ERR(err);
        MC(`Error occured when ${shepherd.clientId} was connecting to the broker.`);
        shepherd.emit('error', err);
    });

    // attach message handler for each channel of topics
    mc.on('message', function (topic, message, packet) {
        // 'request/#', 'announce/#' were taken off
        // topics: 'register/*', 'deregister/*', 'notify/*', 'update/*', 'response/*', 'ping'
        // packet: { cmd: 'publish', messageId: 42, qos: 2, dup: false,
        //           topic: 'test', payload: new Buffer('test'), retain: false }
        // [NOTE] message is a buffer

        var topicItems = mutils.pathItems(topic),          // check and return the nice topic format
            intf = topicItems[0],                          // 'register' of example: 'register/ea:3c:4b:11:0e:6d'
            cId = topicItems[1] ? topicItems[1] : null;    // 'ea:3c:4b:11:0e:6d'

        if (cId === 'response')             // we dont accept an id like 'response', it is a reserved keyword
            return;

        MC('message with topic: ' + topic);
        var node = shepherd._nodebox[cId],
            msgStr,
            parsedMsg,
            unknownIntf = false,
            messageHandler;

        // deal with the unknown 'node' here, thus no need to check it in each _handler
        if (!node && intf !== 'register') {     // no node before 'register', continue if we received 'register'
            if (intf !== 'response') {          // need not send back while receiving a 'response'
                shepherd._responseSender(intf, cId, { status: rspCodeNum('NotFound') });
                return;
            }
        }

        msgStr = message.toString();            // convert buffer to string
        parsedMsg = mutils.jsonify(msgStr);     // jsonify the message, keep it as an string if get no object
        parsedMsg = parsedMsg ? _.assign(parsedMsg, { clientId: cId }) : msgStr;    // all msgs must have clientId

        if (intf === 'lwt') {                   // last and will message
            parsedMsg = {
                clientId: cId,
                data: msgStr
            };
        }

        SHP('Received Msg: ');
        SHP(parsedMsg);

        // if we are here, the node may exist, and it is alive, re-enable his life checker
        // if not register yet, got no node here
        if (node)
            node.enableLifeChecker();

        switch (intf) {
            case 'register':
                // reg_data = { clientId, lifetime, version, objList, ip, mac, port(opt) }
                messageHandler = _clientRegisterHandler;
                break;
            case 'deregister':
                // dereg_data = { clientId }; 
                messageHandler = _clientDeregisterHandler;
                break;
            case 'notify':
                // notify_data = { clientId, oid, iid, rid, data }
                _.forEach(parsedMsg, function (val, key) {
                    if (key === 'oid')
                        parsedMsg.oid = mutils.oidKey(val);
                });
                // we must get oid first, here is why another _.forEach() for getting rid key
                _.forEach(parsedMsg, function (val, key) {
                    if (key === 'rid')
                        parsedMsg.rid = mutils.ridKey(parsedMsg.oid, val);
                });

                messageHandler = _clientNotifyHandler;
                break;
            case 'update':
                // update_data = { clientId, lifeTime(opt), version(opt), objList(opt), ip(opt), mac(opt), port(opt) }
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

    deferred.resolve();

    return deferred.promise.nodeify(callback);
}

/*************************************************************************************************/
/*** Handlers for Requests From Client                                                         ***/
/*************************************************************************************************/
function _clientRegisterHandler(shepherd, msg) {
    // reg_data = { clientId, ip, mac, lifetime, version, objList, port(opt) }
    var shepherdId = shepherd.clientId,
        node = shepherd._nodebox[msg.clientId],
        so = node ? node.so : null,
        oList = {};

    if (msg.clientId === shepherdId)     // shepherd itself no need to be in nodebox
        return;

    if (!node && msg.clientId) {
        // do register procedure
        msg.objList = mutils.returnObjListOfSo(msg.objList);
        node = new MqttNode(shepherd, msg.clientId, msg);   // msg == devAttrs
        so = new MqttNode.SmartObject();
        node._registered = false;
        _clientObjectDetailReq(shepherd, msg.clientId, msg.objList).then(function (objs) {
            // [ { oid: oids[idx], data: obj }, ... ]
            _.forEach(objs, function (obj) {
                so.addIObjects(obj.oid, obj.data);
            });
        }).then(function () {
            node.bindSo(so);
            shepherd._nodebox[msg.clientId] = node;
            node.status = 'online';
            node._registered = true;
            return node.dbSave();
        }).fail(function (err) {
            ERR(err);
            node.status = 'offline';
            node._registered = false;
            node.dbRemove();
            node.so = null;
            so.node = null;
            shepherd._nodebox[msg.clientId] = null;
            delete shepherd._nodebox[msg.clientId];

            shepherd._responseSender('register', msg.clientId, { status: rspCodeNum('InternalServerError') }).done();
        }).done(function () {
            shepherd._responseSender('register', msg.clientId, { status: rspCodeNum('Created') }).done();
            node.enableLifeChecker();
            shepherd.emit('registered', node);
        });

    } else {    // if node exists
        if (node.mac !== msg.mac) {
            shepherd._responseSender('register', msg.clientId, { status: rspCodeNum('Conflict') }).done();
        } else {
            // msg._byRegister = true;
            _clientUpdateHandler(shepherd, msg);
            shepherd.emit('registered', node);
            shepherd._responseSender('register', msg.clientId, { status: rspCodeNum('OK') }).done();
        }
    }
}

function _clientDeregisterHandler(shepherd, msg) {
    // dereg_data = { clientId }; 
    var node = shepherd._nodebox[msg.clientId];

    if (!node) {
        shepherd._responseSender('deregister', msg.clientId, { status: rspCodeNum('NotFound') }).done();
    } else {
        node.disableLifeChecker();
        node._registered = false;
        node.status = 'offline';
        node.dbRemove();
        node.so.node = null;
        delete node.so.node;
        node.so = null;
        delete node.so;
        shepherd._nodebox[msg.clientId] = null;
        delete shepherd._nodebox[msg.clientId];

        shepherd._responseSender('deregister', msg.clientId, { status: rspCodeNum('Deleted') }).done();
        shepherd.emit('deregistered', msg.clientId);
    }
}

function _clientNotifyHandler(shepherd, msg) {
    // notify_data = { clientId, oid, iid, rid, data }
    // (oid + iid), (oid + iid + rid)
    var node = shepherd._nodebox[msg.clientId];

    if (!node || !node.so) {
        shepherd._responseSender('notify', msg.clientId, { status: rspCodeNum('NotFound') }).done();
        return;
    } else if (_.isUndefined(msg.oid) || _.isNull(msg.oid) || _.isUndefined(msg.iid) || _.isNull(msg.iid)) {
        shepherd._responseSender('notify', msg.clientId, { status: rspCodeNum('BadRequest') }).done();
        return;
    }

    node.status = 'online';

    if (_.isUndefined(msg.rid)) {   // data is object instance
        node.updateObjectInstance(msg.oid, msg.iid, msg.data).then(function (diff) {
            msg.data = diff;
            shepherd.emit('notified', msg);
            return shepherd._responseSender('notify', msg.clientId, { status: rspCodeNum('Changed') });
        }).fail(function (err) {
            ERR(err);
            shepherd.emit('error', err);
            shepherd._responseSender('notify', msg.clientId, { status: rspCodeNum('InternalServerError') });
        }).done();
    } else {                        // data is an resource
        node.updateResource(msg.oid, msg.iid, msg.rid, msg.data).then(function (diff) {
            msg.data = diff;
            shepherd.emit('notified', msg);
            return shepherd._responseSender('notify', msg.clientId, { status: rspCodeNum('Changed') });
        }).fail(function (err) {
            ERR(err);
            shepherd.emit('error', err);
            shepherd._responseSender('notify', msg.clientId, { status: rspCodeNum('InternalServerError') });
        }).done();
    }
}

function _clientUpdateHandler(shepherd, msg) {
    // update_data = { clientId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt), port(opt) }
    var node = shepherd._nodebox[msg.clientId],
        oldObjList,
        oldNodeData,
        so;

    if (!node || !node.so) {
        shepherd._responseSender('update', msg.clientId, { status: rspCodeNum('NotFound') }).done();
        return;
    } else {
        node.status = 'online';
        so = node.so;
        oldNodeData = node.dump();
        oldObjList = node.objList;
    }
    msg.objList = mutils.returnObjListOfSo(msg.objList);
    // _clientObjectDetailReq(shepherd, clientId, objListOfSo, callback)

    node.updateAttrs(msg).then(function (diff) {
        node.enableLifeChecker();
        if (_.has(diff, 'objList')) {
            node._registered = false;
            // kill old objects
            _.forEach(oldObjList, function (iids, oid) {
                var oidKey = mutils.oidKey(oid);
                so[oidKey] = null;
                delete so[oidKey];
            });
            _clientObjectDetailReq(shepherd, msg.clientId, msg.objList).then(function (objs) {
                // [ { oid: oids[idx], data: obj }, ... ]
                _.forEach(objs, function (obj) {
                    so.addIObjects(obj.oid, obj.data);
                });
            }).then(function () {
                // new object list
                node.objList = msg.objList;
                return node.dbSave();
            }).then(function () {
                node._registered = true;
                shepherd._responseSender('update', msg.clientId, { status: rspCodeNum('Changed') }).done();
                shepherd.emit('updated', { clientId: node.clientId, data: diff });
                // [TODO] instance update events?
            }).fail(function (err) {
                ERR(err);
                shepherd._responseSender('update', msg.clientId, { status: rspCodeNum('InternalServerError') }).done();
                // kill new objects
                _.forEach(node.objList, function (iids, oid) {
                    var oidKey = mutils.oidKey(oid);
                    so[oidKey] = null;
                    delete so[oidKey];
                });

                // recover old Objs
                node.objList = oldObjList;
                so.addObjects(oldNodeData.so);
                delete oldNodeData.so;

                _.merge(node, oldNodeData);
            }).done();
        } else {
            node.maintain().fail(function(err) {
                ERR(err);
            }).done();
            shepherd._responseSender('update', msg.clientId, { status: rspCodeNum('Changed') }).done();
            shepherd.emit('updated', { clientId: node.clientId, data: diff });
        }
        
    }).fail(function (err) {
        ERR(err);
        shepherd._responseSender('update', msg.clientId, { status: rspCodeNum('InternalServerError') }).done();
    }).done();
}

function _clientResponseHandler(shepherd, msg) {
    // rsp_data = { clientId, transId, cmdId, status, data }
    var clientId = msg.clientId,
        node = shepherd._nodebox[clientId],
        cmdId = cmdIdKey(msg.cmdId) || msg.cmdId,
        clientProms = shepherd._rspsToResolve[clientId],
        cmdProms = clientProms ? clientProms[cmdId] : undefined,
        cmdProm = cmdProms ? cmdProms[msg.transId] : undefined;

    if (!cmdProm)
        return;

    clearTimeout(cmdProm.tmoutCtrl);

    // if status is unsuccessful or 'timeout', reject it. Otherwise, resolve data only
    if (msg.status === 'timeout') {     // inner timeout handling
        cmdProm.deferred.reject(new Error(`${cmdId} request timeout`));
    } else if (_.includes(unsuccessStatusCode, msg.status)) {   // [FIXME] success or unsuccess code?
        cmdProm.deferred.reject(new Error(`Response of ${cmdId} fails. Status code: ${msg.status}`));
    } else {
        cmdProm.deferred.resolve(msg.data);
    }

    if (node && msg.status !== 'timeout')
        node.status = 'online';

    cmdProm = null;
    shepherd._rspsToResolve[clientId][cmdId][msg.transId] = null;
    delete shepherd._rspsToResolve[clientId][cmdId][msg.transId];

    if (_.isEmpty(cmdProms)) {
        delete shepherd._rspsToResolve[clientId][cmdId];

        if (_.isEmpty(clientProms))
            delete shepherd._rspsToResolve[clientId];
    }
}

function _clientPingHandler(shepherd, msg) {
    // ping_data = { clientId }
    var node = shepherd._nodebox[msg.clientId];
    if (node)
        node.status = 'online';

    shepherd._responseSender('ping', msg.clientId, { status: rspCodeNum('OK') }).done();
}

function _clientLwtHandler(shepherd, msg) {
    // lwt_data = { clientId, data }
    var node = shepherd._nodebox[msg.clientId];
    if (node)
        node.status = 'offline';
}

function _clientOtherTopicsHandler(shepherd, topic, message, packet) {
    shepherd.emit('unhandledTopic', topic, message, packet);
}


function _clientObjectDetailReq(shepherd, clientId, objListOfSo, callback) {
    var deferred = Q.defer(),
        readAllObjectPromises = [],
        oids = [];

    // read every object => dig into the structure and id-name transform
    _.forEach(objListOfSo, function (iids, oid) {
        var oidNum = mutils.oidNumber(oid);

        readAllObjectPromises.push(shepherd.readReq(clientId, { oid: oidNum }));
        oids.push(oidNum);
    });

    Q.all(readAllObjectPromises).done(function (objsArr) {
        var objs = [];

        _.forEach(objsArr, function (obj, idx) {
            objs.push({
                oid: oids[idx],
                data: obj
            });
        });

        deferred.resolve(objs);
    }, function (err) {
        ERR(err);
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
}

function rspCodeNum(code) {
    var codeNum = mutils.getRspCode(code);
    return codeNum ? codeNum.value : undefined;
}

function cmdIdNum(id) {
    var cmdNum = mutils.getCmd(id);
    return cmdNum ? cmdNum.value : undefined;
}

function cmdIdKey(id) {
    var cmdKey = mutils.getCmd(id);
    return cmdKey ? cmdKey.key : undefined;
}

function _loadNodesFromDb(shepherd, callback) {
    var deferred = Q.defer(),
        restoreNodes = [];

    mqdb.exportClientIds().then(function (cIds) {
        _.forEach(cIds, function (clientId) {
            var doRestore,
                resNode;

            resNode = shepherd._nodebox[clientId] = new MqttNode(shepherd, clientId);
            resNode.status = 'offline';

            doRestore = resNode.restore().then(function () {
                resNode.enableLifeChecker();
            }).fail(function () {
                // load data fail, kill it
                resNode.dbRemove();
                shepherd._nodebox[clientId] = null;
                delete shepherd._nodebox[clientId];
            });

            restoreNodes.push(doRestore);
        });

        return Q.allSettled(restoreNodes);
    }).done(function (resArr) {
        deferred.resolve(shepherd);
    }, function (err) {
        ERR(err);
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
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
