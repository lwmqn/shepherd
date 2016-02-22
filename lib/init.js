var debug = require('debug');
var SHP = debug('shp'),
    BRK = debug('brk'),
    AUTH = debug('auth'),
    MC = debug('mc'),
    ERR = debug('shp:err'),
    APP = debug('app');

var Q = require('q');
var mutils = require('./mutils');
var config = require('./config/config.js');
var _ = require('lodash');
var mqtt = require('mqtt');
var rspCodeNum = mutils.rspCodeNum;
var MqttNode = require('./mqtt-node');
var init = {};

init._setupAuthPolicy = function (shepherd, callback) {
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
        } else if (validTopic === ('register/' + client.id) || validTopic === ('response/' + client.id)) {
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
        } else if (validTopic === 'register/response/' + client.id || 
                   validTopic === 'deregister/response/' + client.id || 
                   validTopic === 'request/' + client.id) {
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
};

init._attachBrokerEventListeners = function (shepherd, callback) {
    var deferred = Q.defer(),
        shepherdId = shepherd.clientId,
        broker = shepherd.mBroker;

    broker.on('clientConnected', function (client) {
        BRK(client.id + ' clientConnected');
        
        var node = shepherd._nodebox[client.id];

        if (client.id !== shepherdId)
            shepherd.emit('priphConnected', client);
            // shepherd.priphConnected(client);

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
            shepherd.emit('priphDisconnecting', client);
            // shepherd.priphDisconnecting(client);
    });

    broker.on('clientDisconnected', function (client) {
        BRK(client.id + ' clientDisconnected');

        var node = shepherd._nodebox[client.id];

        if (client.id !== shepherdId)
            shepherd.emit('priphDisconnected', client);
            // shepherd.priphDisconnected(client);

        if (node) {
            node.status = 'offline';
            node.dbSave().done();
        }
    });

    broker.on('published', function (packet, client) {
        if (client) {
            BRK(client.id + ' published ' + packet.topic);

            if (client.id !== shepherdId)
                shepherd.emit('priphPublished', client);
                // shepherd.priphPublished(client);
        }
    });

    broker.on('subscribed', function (topic, client) {
        BRK(client.id + ' subscribed ' + topic);

        if (client.id !== shepherdId)
            shepherd.emit('priphSubscribed', client);
            // shepherd.priphSubscribed(client);
    });

    broker.on('unsubscribed', function (topic, client) {
        BRK(client.id + ' unsubscribed ' + topic);

        if (client.id !== shepherdId)
            shepherd.emit('priphUnsubscribed', client);
            // shepherd.priphUnsubscribed(client);
    });

    deferred.resolve();

    return deferred.promise.nodeify(callback);
};

init._setShepherdAsClient = function (shepherd, callback) {
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
        MC(shepherdId + ' is disconnected from the broker.');
    });

    mc.on('offline', function () {
        MC(shepherdId + ' is offline.');
    });

    mc.on('reconnect', function () {
        MC(shepherdId + ' is re-connecting to the broker.');
    });

    mc.on('connect', function (connack) {
        MC(shepherdId + ' is connected to the broker.');

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
};

init._testShepherdPubSub = function (shepherd, callback) {
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
};

init._attachShepherdMessageHandler = function (shepherd, callback) {
    var deferred = Q.defer(),
        mc = shepherd.mClient;

    mc.unsubscribe([ 'request/#', 'announce/#' ]);

    mc.on('error', function (err) {
        ERR(err);
        MC('Error occured when ' + shepherd.clientId + ' was connecting to the broker.');
        shepherd.emit('error', err);
    });

    // attach message handler for each channel of topics
    mc.on('message', function (topic, message, packet) {
        // 'request/#', 'announce/#' were taken off
        // topics: 'register/*', 'deregister/*', 'notify/*', 'update/*', 'response/*', 'ping'
        // packet: { cmd: 'publish', messageId: 42, qos: 2, dup: false,
        //           topic: 'test', payload: new Buffer('test'), retain: false }
        // [NOTE] message is a buffer
        message = shepherd.decrypt(message);

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

        msgStr = message.toString();            // convert buffer to string
        parsedMsg = mutils.jsonify(msgStr);     // jsonify the message, keep it as an string if get no object
        parsedMsg = parsedMsg ? _.assign(parsedMsg, { clientId: cId }) : msgStr;    // all msgs must have clientId

        // deal with the unknown 'node' here, thus no need to check it in each _handler
        if (!node && intf !== 'register') {     // no node before 'register', continue if we received 'register'
            if (intf !== 'response') {          // need not send back while receiving a 'response'
                shepherd._responseSender(intf, cId, {
                    transId: _.isObject(parsedMsg) ? parsedMsg.transId : null,
                    status: rspCodeNum('NotFound')
                });
                return;
            }
        }

        if (intf === 'lwt') {                   // last and will message
            parsedMsg = {
                clientId: cId,
                data: msgStr
            };
        }

        // if we are here, the node may exist, and it is alive, re-enable his life checker
        // if not register yet, got no node here
        if (node)
            node.enableLifeChecker();

        switch (intf) {
            case 'register':
                // reg_data = { clientId, transId, lifetime, version, objList, ip, mac, port(opt) }
                messageHandler = init._clientRegisterHandler;
                break;
            case 'deregister':
                // dereg_data = { clientId, transId }; 
                messageHandler = init._clientDeregisterHandler;
                break;
            case 'notify':
                // notify_data = { clientId, transId, oid, iid, rid, data }
                _.forEach(parsedMsg, function (val, key) {
                    if (key === 'oid')
                        parsedMsg.oid = mutils.oidKey(val);
                });
                // we must get oid first, here is why another _.forEach() for getting rid key
                _.forEach(parsedMsg, function (val, key) {
                    if (key === 'rid')
                        parsedMsg.rid = mutils.ridKey(parsedMsg.oid, val);
                });

                messageHandler = init._clientNotifyHandler;
                break;
            case 'update':
                // update_data = { clientId, transId, lifeTime(opt), version(opt), objList(opt), ip(opt), mac(opt), port(opt) }
                messageHandler = init._clientUpdateHandler;
                break;
            case 'response':
                // rsp_data = { clientId, transId, cmdId, status, data }
                parsedMsg.cmdId = mutils.cmdKey(parsedMsg.cmdId);
                messageHandler = init._clientResponseHandler;

                break;
            case 'ping':
                // ping_data = { clientId, transId }
                messageHandler = init._clientPingHandler;
                break;
            case 'lwt':
                // lwt_data = { clientId, data }
                messageHandler = init._clientLwtHandler;
                break;
            default:
                // pass the orginal arguments to _clientOtherTopicsHandler()
                unknownIntf = true;
                messageHandler = init._clientOtherTopicsHandler;
                break;
        }

        SHP('Received Msg: ');
        SHP(parsedMsg);

        process.nextTick(function () {
            if (unknownIntf)
                messageHandler(shepherd, topic, message, packet);
            else
                messageHandler(shepherd, parsedMsg);
        });
    });

    deferred.resolve();

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Handlers for Requests From Client                                                         ***/
/*************************************************************************************************/
init._clientRegisterHandler = function (shepherd, msg) {
    // reg_data = { clientId, transId, ip, mac, lifetime, version, objList, port(opt) }
    var shepherdId = shepherd.clientId,
        transId = msg.transId,
        acceptedAttrs = [ 'clientId', 'transId', 'lifetime', 'version', 'objList', 'mac', 'ip' ],
        node = shepherd._nodebox[msg.clientId],
        so = node ? node.so : null,
        badAttr = false,
        oList = {};

    // shepherd itself no need to be in nodebox
    if (msg.clientId === shepherdId)
        return;

    // delete msg.transId;
    // unknown device attributes are not allowed
    _.forEach(msg, function (val, key) {
        if (!_.includes(acceptedAttrs, key))
            badAttr = true;
    });

    // mandatory attributes check (version is optional)
    _.forEach(acceptedAttrs, function (attrName) {
        if (!_.has(msg, attrName) && (attrName !== 'version')) {
            badAttr = true;
        }
    });

    if (badAttr) {
        shepherd._responseSender('register', msg.clientId, {
            transId: transId,
            status: rspCodeNum('BadRequest')
        }).done();
        return;
    }

    if (_.isString(msg.mac))    // mac address is unique and case-insensitive
        msg.mac = msg.mac.toLowerCase();

    if (!node && msg.clientId) {
        // do register procedure
        msg.objList = mutils.returnObjListOfSo(msg.objList);
        node = new MqttNode(shepherd, msg.clientId, msg);   // msg == devAttrs
        so = new MqttNode.SmartObject();
        node._registered = false;
        init._clientObjectDetailReq(shepherd, msg.clientId, msg.objList).then(function (objs) {
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

            shepherd._responseSender('register', msg.clientId, {
                transId: transId,
                status: rspCodeNum('InternalServerError')
            }).done();
        }).done(function () {
            shepherd._responseSender('register', msg.clientId, {
                transId: transId,
                status: rspCodeNum('Created')
            }).done();
            node.enableLifeChecker();
            shepherd.emit('registered', node);
            // APP('registered');
            // APP(shepherd._nodebox[msg.clientId].dump());
            // APP(shepherd._nodebox[msg.clientId].dump().so);
        });

    } else {    // if node exists
        if (node.mac !== msg.mac) {
            shepherd._responseSender('register', msg.clientId, {
                transId: transId,
                status: rspCodeNum('Conflict')
            }).done();
        } else {
            msg._fromRegisterHandler = true;
            _clientUpdateHandler(shepherd, msg);
        }
    }
};

init._clientDeregisterHandler = function (shepherd, msg) {
    // dereg_data = { clientId }; 
    var node = shepherd._nodebox[msg.clientId];

    if (!node) {
        shepherd._responseSender('deregister', msg.clientId, {
            transId: msg.transId,
            status: rspCodeNum('NotFound')
        }).done();
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

        shepherd._responseSender('deregister', msg.clientId, {
            transId: msg.transId,
            status: rspCodeNum('Deleted')
        }).done();
        shepherd.emit('deregistered', msg.clientId);
    }
};

init._clientNotifyHandler = function (shepherd, msg) {
    // notify_data = { clientId, transId, oid, iid, rid, data }
    // (oid + iid), (oid + iid + rid)
    var node = shepherd._nodebox[msg.clientId],
        robj,
        iobj,
        resrc;

    if (!node || !node.so) {
        shepherd._responseSender('notify', msg.clientId, {
            transId: msg.transId,
            status: rspCodeNum('NotFound')
        }).done();
        return;
    } else if (_.isUndefined(msg.oid) || _.isNull(msg.oid) || _.isUndefined(msg.iid) || _.isNull(msg.iid)) {
        shepherd._responseSender('notify', msg.clientId, {
            transId: msg.transId,
            status: rspCodeNum('BadRequest')
        }).done();
        return;
    }

    node.status = 'online';

    robj = node.getRootObject(msg.oid);
    iobj = node.getIObject(msg.oid, msg.iid);

    if (_.isUndefined(msg.oid) || _.isNull(msg.oid) || _.isUndefined(msg.iid) || _.isNull(msg.iid) || !robj || !iobj) {
        shepherd._responseSender('notify', msg.clientId, {
            transId: msg.transId,
            status: rspCodeNum('NotFound')
        }).done();
        return;
    }

    if (_.isUndefined(msg.rid)) {   // data is object instance
        if (!_.isPlainObject(msg.data)) {
            shepherd._responseSender('notify', msg.clientId, {
                transId: msg.transId,
                status: rspCodeNum('BadRequest')
            }).done();
            return;
        } else {
            var badResrc = false;
            _.forEach(msg.data, function (val, rid) {
                var ridKey = mutils.ridKey(msg.oid, rid);
                delete msg.data[rid];
                msg.data[ridKey] = val;
                badResrc = badResrc || _.isUndefined(node.getResource(msg.oid, msg.iid, rid));
            });

            if (badResrc) {
                shepherd._responseSender('notify', msg.clientId, {
                    transId: msg.transId,
                    status: rspCodeNum('BadRequest')
                }).done();
                return;
            } else {
                shepherd.emit('notify', msg);
                node.updateObjectInstance(msg.oid, msg.iid, msg.data).then(function (diff) {
                    msg.data = diff;
                    shepherd.emit('notify_update', msg);
                    return shepherd._responseSender('notify', msg.clientId, {
                        transId: msg.transId,
                        status: rspCodeNum('Changed')
                    });
                }).fail(function (err) {
                    ERR(err);
                    shepherd.emit('error', err);
                    shepherd._responseSender('notify', msg.clientId, {
                        transId: msg.transId,
                        status: rspCodeNum('InternalServerError')
                    });
                }).done();
            }
        }
    } else {                        // data is an resource
        resrc = node.getResource(msg.oid, msg.iid, msg.rid);
        if (_.isUndefined(resrc)) {
            shepherd._responseSender('notify', msg.clientId, {
                transId: msg.transId,
                status: rspCodeNum('NotFound')
            }).done();
            return;
        } else {
            shepherd.emit('notify', msg);
            node.updateResource(msg.oid, msg.iid, msg.rid, msg.data).then(function (diff) {
                msg.data = diff;
                shepherd.emit('notify_update', msg);
                return shepherd._responseSender('notify', msg.clientId, {
                    transId: msg.transId,
                    status: rspCodeNum('Changed')
                });
            }).fail(function (err) {
                ERR(err);
                shepherd.emit('error', err);
                shepherd._responseSender('notify', msg.clientId, {
                    transId: msg.transId,
                    status: rspCodeNum('InternalServerError')
                });
            }).done();
        }
    }
};

init._clientUpdateHandler = function (shepherd, msg) {
    // update_data = { clientId, transId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt), port(opt) }
    var node = shepherd._nodebox[msg.clientId],
        transId = msg.transId,
        acceptedAttrs = [ 'clientId', 'transId', 'lifetime', 'version', 'objList', 'mac', 'ip' ],
        badAttr = false,
        isFromRegister = msg._fromRegisterHandler,
        oldObjList,
        oldNodeData,
        so;

    // this msg is coming from register handler, delete the flag in msg
    delete msg._fromRegisterHandler;
    delete msg.transId;

    if (!node || !node.so) {
        shepherd._responseSender('update', msg.clientId, {
            transId: transId,
            status: rspCodeNum('NotFound')
        }).done();
        return;
    } else {
        node.status = 'online';
        so = node.so;
        oldNodeData = node.dump();
        oldObjList = node.objList;
    }

    if (!isFromRegister && _.has(msg, 'mac')) {
        if (node.mac !== msg.mac) {
            shepherd._responseSender('update', msg.clientId, {
                transId: transId,
                status: rspCodeNum('Conflict')
            }).done();
            return;
        }
    }

    _.forEach(msg, function (val, key) {
        if (!_.includes(acceptedAttrs, key))
            badAttr = true;
    });

    if (badAttr) {
        shepherd._responseSender('update', msg.clientId, {
            transId: transId,
            status: rspCodeNum('BadRequest')
        }).done();
        return;
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
            init._clientObjectDetailReq(shepherd, msg.clientId, msg.objList).then(function (objs) {
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
                if (!isFromRegister) {
                    shepherd._responseSender('update', msg.clientId, {
                        transId: transId,
                        status: rspCodeNum('Changed')
                    }).done();
                }

                shepherd.emit('updated', { clientId: node.clientId, data: diff });
                // [TODO] instance update events?
            }).fail(function (err) {
                ERR(err);
                if (!isFromRegister) {
                    shepherd._responseSender('update', msg.clientId, {
                        transId: transId,
                        status: rspCodeNum('InternalServerError')
                    }).done();
                }
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

            if (!isFromRegister) {
                shepherd._responseSender('update', msg.clientId, {
                    transId: transId,
                    status: rspCodeNum('Changed')
                }).done();
            }
            shepherd.emit('updated', { clientId: node.clientId, data: diff });
        }
        
    }).fail(function (err) {
        ERR(err);
        if (!isFromRegister) {
            shepherd._responseSender('update', msg.clientId, {
                transId: transId,
                status: rspCodeNum('InternalServerError')
            }).done();
        }
    }).done(function () {
        if (isFromRegister) { // if this msg is from register handler, send 'register' response to client
            shepherd.emit('registered', node);
            shepherd._responseSender('register', msg.clientId, {
                transId: transId,
                status: rspCodeNum('OK')
            }).done();
        }
    });
};

init._clientResponseHandler = function (shepherd, msg) {
    // rsp_data = { clientId, transId, cmdId, status, data }
    var clientId = msg.clientId,
        node = shepherd._nodebox[clientId],
        cmdId = mutils.cmdKey(msg.cmdId) || msg.cmdId,
        clientProms = shepherd._rspsToResolve[clientId],
        cmdProms = clientProms ? clientProms[cmdId] : undefined,
        cmdProm = cmdProms ? cmdProms[msg.transId] : undefined;

    if (!cmdProm)
        return;

    clearTimeout(cmdProm.tmoutCtrl);
    cmdProm.deferred.resolve(_.omit(msg, [ 'transId', 'clientId', 'cmdId' ]));

    if (node && mutils.rspCodeKey(msg.status) !== 'Timeout')
        node.status = 'online';

    cmdProm = null;
    shepherd._rspsToResolve[clientId][cmdId][msg.transId] = null;
    delete shepherd._rspsToResolve[clientId][cmdId][msg.transId];

    if (_.isEmpty(cmdProms)) {
        delete shepherd._rspsToResolve[clientId][cmdId];

        if (_.isEmpty(clientProms))
            delete shepherd._rspsToResolve[clientId];
    }
};

init._clientPingHandler = function (shepherd, msg) {
    // ping_data = { clientId, transId }
    var node = shepherd._nodebox[msg.clientId];
    if (node)
        node.status = 'online';

    shepherd._responseSender('ping', msg.clientId, {
        transId: msg.transId,
        status: rspCodeNum('OK')
    }).done();
};

init._clientLwtHandler = function (shepherd, msg) {
    // lwt_data = { clientId, data }
    var node = shepherd._nodebox[msg.clientId];
    if (node)
        node.status = 'offline';
};

init._clientOtherTopicsHandler = function (shepherd, topic, message, packet) {
    shepherd.emit('unhandledTopic', topic, message, packet);
};


init._clientObjectDetailReq = function (shepherd, clientId, objListOfSo, callback) {
    var deferred = Q.defer(),
        readAllObjectPromises = [],
        oids = [];

    // read every object => dig into the structure and id-name transform
    _.forEach(objListOfSo, function (iids, oid) {
        var oidNum = mutils.oidNum(oid);
        readAllObjectPromises.push(shepherd.readReq(clientId, { oid: oidNum }));
        oids.push(oidNum);
    });

    Q.all(readAllObjectPromises).then(function (rsps) {
        var objs = [],
            isAnyFail = false;

        _.forEach(rsps, function (rsp, idx) {
            if (mutils.isGoodResponse(rsp.status)) {
                //_.forEach(rsp.data, function (obj, idx) {
                    objs.push({
                        oid: oids[idx],
                        data: rsp.data
                    });
                //});
            } else {
                isAnyFail = true;
            }
        });

        if (isAnyFail)
            throw new Error('Object requests fail.');
        else
            deferred.resolve(objs);

    }).fail(function (err) {
        ERR(err);
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

module.exports = init;
