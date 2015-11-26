'use strict';

const util = require('util'),
      EventEmitter = require('events'),
      _ = require('lodash'),
      Q = require('q'),
      // network = require('network'),
      mqtt = require('mqtt'),
      mosca = require('mosca'),
      debug = require('debug');

// set up debuggers
var shp = debug('SHP'),
    brk = debug('SHP:broker'),
    auth = debug('SHP:auth'),
    mcl = debug('SHP:mClient');

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

var reqTimeout = config.reqTimeout || 60000;

function MShepherd(name, settings) {
    shp('MShepherd is initializing');
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

    this.peripheralConnected = function (client) {          // overridable
        console.log(`${client.id} is connected.`);
    };

    this.peripheralDisconnecting = function (client) {      // overridable
        console.log(`${client.id} is disconnecting.`);
    };

    this.peripheralDisconnected = function (client) {       // overridable
        console.log(`${client.id} is disconnected.`);
    };

    this.peripheralPublished = function (client) {          // overridable
        console.log(`${client.id} has published a message.`);
    };

    this.peripheralSubscribed = function (client) {         // overridable
        console.log(`${client.id} has subscribed to a topic.`);
    };

    this.peripheralUnsubscribed = function (client) {       // overridable
        console.log(`${client.id} has unsubscribed to a topic.`);
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

    this.on('_ready', function () {
        // shepherd is ready, next step is loading all mqtt-nodes from database, and check alive (asynchronously)
        var restoreNodes = [];

        shp('8. Inner _ready triggered');

        mqdb.exportClientIds().then(function (cIds) {
            shp('9. Restoring mqtt-nodes from mqdb');
            _.forEach(cIds, function (clientId) {
                var doRestore,
                    resNode;
                     shp(clientId);
                resNode = self._nodebox[clientId] = new MqttNode(self, clientId);
                doRestore = resNode.restore().done(function () {
                    resNode.enableLifeChecker();
                    resNode.maintain();             // maintain in the background
                });

                restoreNodes.push(doRestore);
            });

            return Q.all(restoreNodes);
        }).done(function () {
            shp('10. Restoring done. Fire "ready"');

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

    shp('1. shepherd is starting');

    broker.once('ready', function () {
        brk('Broker is ready');

        self._setupAuthPolicy();                            // 1. set up authorization for peripherals

        shp('3. Remove broker event listeners');
        _.forEach(mBrokerEvents, function (event) {         // 2. remove all listeners attached
            broker.removeAllListeners(event);
        });

        self._attachBrokerEventListeners()                  // 3. re-attach listeners:
            .then(function () {                             // 4. let shepherd in
                return self._setShepherdAsClient();
            })
            .then(function () {                             // 5. run shepherd pub/sub testing
                return self._testShepherdPubSub();
            })
            .then(function () {
                return self._attachShepherdMessageHandler();
            })
            .fail(function (err) {
                deferred.reject(err);
            }).done(function () {
                shp('7. Shepherd init done');
                self._enabled = true;                       // 6. testings are done, shepherd is enabled 
                self.emit('_ready');                        // 7. if all done, shepherd fires '_ready' event for inner use
                deferred.resolve();
            });
    });

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype.stop = function (callback) {
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

MShepherd.prototype.reset = function (callback) {
    var deferred = Q.defer();

    this.stop().then(this.start).done(function () {
        deferred.resolve();
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype.deregisterNode = function (clientId, callback) {
    var deferred = Q.defer(),
        node = this._nodebox[clientId];

    if (!node) {
        deferred.reject(new Error('Find no device to remove.'));
    } else {
        node.status = 'offline';
        node.disableLifeCheck();
        node.dbRemove();
        node._registered = false;
        node.so = null;
        delete node.so;
        this._nodebox[clientId] = null;
        delete this._nodebox[clientId];

        this._responseSender('deregister', clientId, { status: RSPCODE.Deleted.value }).done();
        this.emit('deregistered', clientId);
    }

    return deferred.promise.nodeify(callback);
};  // run deregister

// shepherd -> pheripheral
MShepherd.prototype._responseSender = function (intf, clientId, rspObj, callback) {
    var self = this,
        deferred = Q.defer(),
        topic = `${intf}/response/${clientId}`,
        msg = JSON.stringify(rspObj);

    shp('Send response with topic: ' + topic);

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

    shp('Send request with topic: ' + topic);

    if (arguments.length < 2)
        deferred.reject(new Error('Bad arguments.'));

    reqObj.cmdId = CMD.get(cmdId) ? CMD.get(cmdId).value : 255; // 255: unknown cmd

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
            self._clientResponseHandler({
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
/*** Tackling the mBroker Things                                                               ***/
/*************************************************************************************************/
MShepherd.prototype._setupAuthPolicy = function () {
    var self = this,
        broker = this.mBroker,
        authorized;

    shp('2. setup auth policy');
    broker.authenticate = function (client, user, pass, cb) {
        auth('Authenticate: ' + client.id + ':' + user);
        var defaultAccount = config.account,
            authorized = (user === defaultAccount.username && pass.toString() === defaultAccount.password);
        
        if (client.id === self.clientId) {  // always let shepherd pass
            client.user = self.clientId;
            cb(null, true);
        } else if (authorized) {            // always let default account pass
            client.user = user;
            cb(null, authorized);
        } else {
            self.authPolicy.authenticate(client, user, pass, cb);
        }
    };

    broker.authorizePublish = function (client, topic, payload, cb) {
        auth('Auth Pub: ' + client.id + ':' + topic);

        var splitTopics = mqUtils.returnPathItemsInArray(topic);

        if (client.id === self.clientId) {  // shepherd can always publish
            cb(null, true);
        }  else if (splitTopics[0] === 'register') {
            // before registration, anyone can just publish to 'register' topic
            cb(null, true);
        } else if (client.user && self._nodebox[client.id]) {
            // only authenticated user and registered client can publish to arbitrary topics
            cb(null, true);
        } else {
            self.authPolicy.authorizePublish(client, topic, payload, cb);
        }
    };

    broker.authorizeSubscribe = function (client, topic, cb) {
        auth('Auth Sub: ' + client.id + ':' + topic);

        if (client.id === self.clientId) {  // shepherd can always subscribe
            cb(null, true);
        } else if (topic === `register/response/${client.id}`) {
            // before registration, anyone can just subscribe to his own 'register/response/${client.clientId}' channel
            cb(null, true);
        } else if (client.user && self._nodebox[client.id]) {
            // only authenticated user and registered client can subscribe to arbitrary topics
            cb(null, true);
        } else {
            self.authPolicy.authorizeSubscribe(client, topic, cb);
        }
    };

    broker.authorizeForward = function (client, packet, cb) {
        auth('Auth Forward for: ' + client.id);

        if (client.id === self.clientId) {
            cb(null, true);
        } else {
            self.authPolicy.authorizeForward(client, packet, cb);
        }
    };
};

MShepherd.prototype._attachBrokerEventListeners = function (callback) {
    var self = this,
        broker = this.mBroker,
        deferred = Q.defer();

    shp('4. Attach broker event listeners');

    broker.on('clientConnected', function (client) {
        brk(client.id + ' clientConnected');
        if (client.id !== self.clientId)
            self.peripheralConnected(client);
    });

    broker.on('clientDisconnecting', function (client) { 
        brk(client.id + ' clientDisconnecting');
        if (client.id !== self.clientId)
            self.peripheralDisconnecting(client);
    });

    broker.on('clientDisconnected', function (client) {
        brk(client.id + ' clientDisconnected');
        if (client.id !== self.clientId)
            self.peripheralDisconnected(client);
    });

    broker.on('published', function (packet, client) {
        if (_.isUndefined(client))
            return;

        brk(client.id + ' published ' + packet.topic);

        if (client.id !== self.clientId)
            self.peripheralPublished(client);
    });

    broker.on('subscribed', function (topic, client) {
        brk(client.id + ' subscribed ' + topic);

        if (client.id !== self.clientId)
            self.peripheralSubscribed(client);
    });

    broker.on('unsubscribed', function (topic, client) {
        brk(client.id + ' unsubscribed ' + topic);

        if (client.id !== self.clientId)
            self.peripheralUnsubscribed(client);
    });

    deferred.resolve();

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Tackling the mClient Things                                                               ***/
/*************************************************************************************************/
MShepherd.prototype._attachShepherdMessageHandler = function (callback) {
    var self = this,
        deferred = Q.defer(),
        mc = this.mClient;
    shp('_attachShepherdMessageHandler start');
    mc.on('error', function (err) {
        mcl('error');
        // console.log(`Error occured when ${self.clientId} was connecting to the broker.`);
        self.emit('error', err);
    });

    // attach message handler for each channel of topics
    mc.on('message', function (topic, message, packet) {
        mcl('message with topic: ' + topic);

        // topics: 'register/*', 'deregister/*', 'notify/*', 'update/*', 'response/*', 'ping'
        //      packet { cmd: 'publish', messageId: 42, qos: 2, dup: false,
        //               topic: 'test', payload: new Buffer('test'), retain: false }
        // [NOTE] message is a buffer
        var splitTopics = mqUtils.returnPathItemsInArray(topic),    // check and return the nice topic format
            intf = splitTopics[0],                                  // example: 'register/ea:3c:4b:11:0e:6d'
            cId = splitTopics[1] ? splitTopics[1] : null,
            node = self._nodebox[cId],
            parsedMsg,
            unknownIntf = false,
            messageHandler;

        // deal with the unknown 'node' here, thus no need to check it in each _handler
        if (!node && intf !== 'register' && intf !== 'response') {
            self._responseSender(intf, cId, { status: RSPCODE.NotFound.value });
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

        shp('Received Msg: ');
        shp( parsedMsg);
        // if we are here, the node exists, and it is alive, re-enable his life checker
        if (node)
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
                _.forEach(parsedMsg, function (val, key) {
                    if (key === 'oid') {
                        parsedMsg.oid = MDEFS.getOidString(val);
                        parsedMsg.oid = _.isUndefined(parsedMsg.oid) ? val : parsedMsg.oid;
                    } else if (key === 'rid') {
                        parsedMsg.rid = MDEFS.getRidString(val);
                        parsedMsg.rid = _.isUndefined(parsedMsg.rid) ? val : parsedMsg.rid;
                    }
                });
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
            case 'lwt':
                // lwt_data = { clientId, data }
                messageHandler = self._clientLwtHandler;
                break;
            default:
                // pass the orginal arguments to _otherTopicsHandler()
                unknownIntf = true;
                messageHandler = self._otherTopicsHandler;
                break;
        }

        process.nextTick(function () {
            if (unknownIntf)
                messageHandler.call(self, topic, message, packet);
            else
                messageHandler.call(self, parsedMsg);
        });
    });

    shp('_attachShepherdMessageHandler end');
    deferred.resolve();

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype._setShepherdAsClient = function (callback) {
    var self = this,
        deferred = Q.defer(),
        options = config.clientConnOptions,
        mc;

    shp('5. Set up shepherd as a client');

    options.clientId = this.clientId;
    mc = this.mClient = mqtt.connect('mqtt://localhost', options);

    mc.on('connect', function (connack) {
        mcl('connected');
        mc.subscribe({'register/mnode_1': 0 });
        if (!connack.sessionPresent) {
            mc.subscribe({          // subscribe to topics of the interface
                'register/*': 0,
                'deregister/*': 0,
                'notify/*': 1,
                'update/*': 1,
                'response/*': 1,
                'ping/*': 0,
                'lwt/*': 0,
            }, function (err, granted) {
                _.forEach(granted, function (gn) {
                    shp(gn);
                });
                if (err)
                    deferred.reject(err);
                else
                    deferred.resolve();
            });
        } else {
            // session already exists, no need to subscribe again
            deferred.resolve();
        }
    });

    mc.on('reconnect', function () {
        mcl('re-connecting');
        // console.log(`${self.clientId} is re-connecting to the broker.`);
    });

    mc.on('close', function () {
        mcl('closed');

        // console.log(`${self.clientId} is disconnected from the broker.`);
    });

    mc.on('offline', function () {
        mcl('offline');

       // console.log(`${self.clientId} is offline.`);
    });

    return deferred.promise.nodeify(callback);
};

// Shepherd
MShepherd.prototype._registerHandler = function (msg) {
    // reg_data = { clientId, ip, mac, lifetime, version, objList, port(opt) }
    var self = this,
        readAllObjectPromises = [],
        node = this._nodebox[msg.clientId],
        so = node ? node.so : null,
        rspObj = { status: RSPCODE.Created.value };

    if (msg.clientId === this.clientId)     // shepherd itself no need to be in nodebox
        return;

    if (!node && msg.clientId) {
        // do register procedure
        node = this._nodebox[msg.clientId] = new MqttNode(this, msg.clientId, msg); // [FIXME] How to tackle options?
        so = node.so = new MqttNode.SmartObject();

        // objList: [ { oid, iid }, { oid, iid }, { oid, iid }, ... ]
        // transform to objList = { oid1: [ iid1, iid2 ], oid2: [ iid3, iid4, iid5] }

        node.objList = {};
        _.forEach(msg.objList, function (idPair) {
            if (!_.isArray(node.objList[idPair.oid]))
                node.objList[idPair.oid] = [];

            node.objList[idPair.oid].push(idPair.iid);
        });

        // read every object => dig into the structure and id-name transform
        _.forEach(node.objList, function (iids, oid) {
            var readReqProm = self.readReq(msg.clientId, { oid: oid }).then(function (objData) {
                so.addIObject(oid, objData);
            });

            // , function (err) {
            //     console.log(err);   // [FIXME] to prevent crash, why?
            // });
            readAllObjectPromises.push(readReqProm);
        });

        Q.all(readAllObjectPromises).then(function () {
            node.hookSmartObject(so);
            node._registered = true;
            node.status = 'online';
            return node.dbSave();
        }).done(function () {
            self._responseSender('register', msg.clientId, { status: RSPCODE.Created.value }).done();
            node.enableLifeChecker();
            self.emit('registered', node);
        }, function (err) {
            self._responseSender('register', msg.clientId, { status: RSPCODE.InternalServerError.value }).done();
        });
    } else {
        if (node.mac !== msg.mac)
            self._responseSender('register', msg.clientId, { status: RSPCODE.Conflict.value }).done();

        this._updateHandler(msg);
        this._responseSender('register', msg.clientId, { status: RSPCODE.OK.value }).done();
    }
};

// Shepherd ok
MShepherd.prototype._deregisterHandler = function (msg) {
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

// Node ok
MShepherd.prototype._notifyHandler = function (msg) {
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
        node.updateObjectInstance(msg.oid, msg.iid, msg.data).done(function (data) {
            self.emit('notified', msg);
            self._responseSender('notify', msg.clientId, { status: RSPCODE.Changed.value });
        }, function (err) {
            self.emit('error', err);
            self._responseSender('notify', msg.clientId, { status: RSPCODE.InternalServerError.value });
        });
    } else {                        // data is an resource
        node.updateResource(msg.oid, msg.iid, msg.rid, msg.data).done(function (data) {
            self.emit('notified', msg);
            self._responseSender('notify', msg.clientId, { status: RSPCODE.Changed.value });
        }, function (err) {          
            self.emit('error', err);
            self._responseSender('notify', msg.clientId, { status: RSPCODE.InternalServerError.value });
        });
    }
};

// MqttNode
MShepherd.prototype._updateHandler = function (msg) {
    // update_data = { clientId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt), port(opt) }
    var self = this,
        node = this._nodebox[msg.clientId];

    if (!node) {
        this._responseSender('update', msg.clientId, { status: RSPCODE.NotFound.value }).done();
        return;
    }

    // [FIXME] if objList exists, should we run de-register, and then re-register again?
    node.updateAttrs(msg).done(function (diff) {
        self._responseSender('update', msg.clientId, { status: RSPCODE.Changed.value });
        self.emit('updated', { clientId: node.clientId, data: diff });
    }, function (err) {
        self._responseSender('update', msg.clientId, { status: RSPCODE.InternalServerError.value });
    });
};

// Shepherd ok
MShepherd.prototype._clientPingHandler = function (msg) {
    // ping_data = { clientId }
    this._responseSender('ping', msg.clientId, { status: RSPCODE.OK.value }).done();
};

// Shepherd
MShepherd.prototype._clientLwtHandler= function (msg) {
    // lwt_data = { clientId, data }
    var node = this._nodebox[msg.clientId];
    if (node)
        node.status = 'offline';
};

// Shepherd ok
MShepherd.prototype._clientResponseHandler = function (msg) {
    // rsp_data = { clientId, transId, cmdId, status, data }
    var clientId = msg.clientId,
        cmdId = CMD.get(msg.cmdId) ? CMD.get(msg.cmdId).key : msg.cmdId,
        clientProms = this._rspsToResolve[clientId],
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

    delete this._rspsToResolve[clientId][cmdId][msg.transId];

    if (_.isEmpty(cmdProms)) {
        delete this._rspsToResolve[clientId][cmdId];

        if (_.isEmpty(clientProms))
            delete this._rspsToResolve[clientId];
    }
};

// Shepherd ok
MShepherd.prototype._otherTopicsHandler = function (topic, message, packet) {
    this.emit('unhandledTopic', topic, message, packet);
};

// Shepherd ok
MShepherd.prototype._testShepherdPubSub = function (callback) {
    // if we are here, the mClient is ok with subscribing to all channels
    // we can start our testing
    var deferred = Q.defer(),
        mc = this.mClient,
        cId = this.clientId,
        testTopics = [ 'register', 'deregister', 'update', 'notify', 'response', 'ping', 'request', 'announce', 'lwt' ],
        testMsgListener,
        testTimeout,
        checkCounter = 0;

    shp('6. Test shepherd pub/sub functions');

    testTopics = testTopics.map(function (tp) {
        return (tp + '/response/' + cId);
    });
    mcl('Test Topics: ' + testTopics);

    testMsgListener = function (topic, message, packet)  {
        var parsedMsg;
        var msgStr = message.toString();
        if (msgStr[0] === '{' && msgStr[msgStr.length-1] === '}') {
            parsedMsg = JSON.parse(msgStr);
            _.assign(parsedMsg, { clientId: cId });
        } else {
            parsedMsg = msgStr;
        }

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
                mcl('Test Top: ' + topic);
                if (parsedMsg.test === 'testme') {
                    checkCounter += 1;
                    mcl('Test count: ' + checkCounter);
                }
                break;
            default:
                break;
        }

        
        mcl('Test Msg: ' + message);
        if (checkCounter === testTopics.length) {
            shp('Shepherd pub/sun tested: OK');
            clearTimeout(testTimeout);
            mc.removeListener('message', testMsgListener);
            mc.unsubscribe(testTopics, function () {
                mcl('Test Topics unsubscribed');
                deferred.resolve();
            });
        }
    };

    mc.on('message', testMsgListener);

    mc.subscribe(testTopics, function (err, granted) {
        if (err) { deferred.reject(err); }

        testTimeout = setTimeout(function () {
            deferred.reject(new Error('Test timeout'));
        }, 5000);

        _.forEach(testTopics, function (tp) {
            mc.publish(tp, '{"test": "testme"}');
        });
    });

    return deferred.promise.nodeify(callback);
};

/************************************************************************/
/* Remote Request APIs                                                  */
/************************************************************************/
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

/************************************************************************/
/* Code Temp Zone                                                       */
/************************************************************************/
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
