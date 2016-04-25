var Q = require('q'),
    _ = require('lodash'),
    mqtt = require('mqtt'),
    mosca = require('mosca');

var mqdb = require('./mqdb'),
    mutils = require('./mutils'),
    MqttNode = require('./mqtt-node'),
    msghdlr = require('./msghandler'),
    config = require('./config/config.js');

var debug = require('debug'),
    MC = debug('mc'),
    SHP = debug('shp'),
    BRK = debug('brk'),
    AUTH = debug('auth'),
    ERR = debug('shp:err');

var init = {};

init.setupShepherd = function (shepherd, callback) {
    var deferred = Q.defer(),
        mBrokerEvents = [       // Event names for removing broker listeners
            'ready', 'clientConnected', 'clientDisconnecting', 'published', 'subscribed', 'unsubscribed'
        ],
        broker,
        initProcedure;

    initProcedure = function () {
        BRK('Broker is ready');

        init._setupAuthPolicy(shepherd).then(function () {      // 1. set up authorization for priphs
            _.forEach(mBrokerEvents, function (event) {
                broker.removeAllListeners(event);               // 2. remove all listeners attached
            });
            return true;
        }).then(function () {
            return init._attachBrokerEventListeners(shepherd);  // 3. re-attach listeners:
        }).then(function () {
            return init._setShepherdAsClient(shepherd);         // 4. let shepherd in
        }).then(function () {
            return init._testShepherdPubSub(shepherd);          // 5. run shepherd pub/sub testing
        }).delay(2000).then(function () {
            return init._attachShepherdMessageHandler(shepherd);
        }).fail(function (err) {
            ERR(err);
            deferred.reject(err);
        }).done(function () {
            deferred.resolve();
        });
    };

    init._loadNodesFromDb(shepherd).then(function () {
        return shepherd.updateNetInfo();
    }).then(function () {
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

init._setupAuthPolicy = function (shepherd) {
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
    };

    broker.authorizePublish = function (client, topic, payload, cb) {
        AUTH('Auth Pub: ' + client.id + ':' + topic);

        var validTopic = mutils.slashPath(topic);

        if (client.id === shepherdId) {  // shepherd can always publish
            cb(null, true);
        } else if (client.user && shepherd._nodebox[client.id]) {
            // only authenticated user and registered client can publish to arbitrary topics
            if (shepherd.authPolicy && _.isFunction(shepherd.authPolicy.authorizePublish))
                shepherd.authPolicy.authorizePublish(client, topic, payload, cb);
            else
                cb(null, true);

        } else if (validTopic === ('register/' + client.id) || validTopic === ('response/' + client.id)) {
            // before registration, anyone can just publish to 'register' topic, and 'response' back from the shepherd request
            cb(null, true);
        }
    };

    broker.authorizeSubscribe = function (client, topic, cb) {
        AUTH('Auth Sub: ' + client.id + ':' + topic);

        var validTopic = mutils.slashPath(topic);

        if (client.id === shepherdId) {  // shepherd can always subscribe
            cb(null, true);
        } else if (client.user && shepherd._nodebox[client.id]) {
            // only authenticated user and registered client can subscribe to arbitrary topics
            if (shepherd.authPolicy && _.isFunction(shepherd.authPolicy.authorizeSubscribe))
                shepherd.authPolicy.authorizeSubscribe(client, topic, cb);
            else
                cb(null, true);

        } else if (validTopic === 'register/response/' + client.id || 
                   validTopic === 'deregister/response/' + client.id || 
                   validTopic === 'request/' + client.id) {
            // before registration, anyone can just subscribe to his own registeration and request channels:
            cb(null, true);
        }
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
    };

    deferred.resolve();
    return deferred.promise;
};

init._attachBrokerEventListeners = function (shepherd) {
    var deferred = Q.defer(),
        shepherdId = shepherd.clientId,
        broker = shepherd.mBroker;

    broker.on('clientConnected', function (client) {
        BRK(client.id + ' clientConnected');
        
        var node = shepherd._nodebox[client.id];
        if (client.id !== shepherdId) {
            shepherd.emit('priphConnected', client);

            if (node) {     // if in nodebox, perform maintain after 2 seconds
                node._setStatus('online');
                // node.status = 'online';
                setTimeout(function () {
                    process.nextTick(function () {
                        node.pingReq().then(function (rsp) {
                            if (rsp.status === mutils.rspCodeNum('OK'))
                                return node.maintain();
                        }).fail(function (err) {
                            // console.log(err);
                        }).done();
                    });
                }, 2000);
            } else if (!shepherd._joinable || !shepherd._enabled) {
                client.close();
            }
        }
    });

    broker.on('clientDisconnecting', function (client) { 
        BRK(client.id + ' clientDisconnecting');

        if (client.id !== shepherdId)
            shepherd.emit('priphDisconnecting', client);
    });

    broker.on('clientDisconnected', function (client) {
        BRK(client.id + ' clientDisconnected');

        var node = shepherd._nodebox[client.id];

        if (node) {
            node._setStatus('offline');
            // node.status = 'offline';
            node.dbSave().done();
        }

        if (client.id !== shepherdId)
            shepherd.emit('priphDisconnected', client);
    });

    broker.on('published', function (packet, client) {
        if (client) {
            BRK(client.id + ' published ' + packet.topic);

            if (client.id !== shepherdId)
                shepherd.emit('priphPublished', packet, client);
        }
    });

    broker.on('subscribed', function (topic, client) {
        BRK(client.id + ' subscribed ' + topic);

        if (client.id !== shepherdId)
            shepherd.emit('priphSubscribed', topic, client);
    });

    broker.on('unsubscribed', function (topic, client) {
        BRK(client.id + ' unsubscribed ' + topic);

        if (client.id !== shepherdId)
            shepherd.emit('priphUnsubscribed', topic, client);
    });

    deferred.resolve();
    return deferred.promise;
};

init._setShepherdAsClient = function (shepherd) {
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

    return deferred.promise;
};

init._testShepherdPubSub = function (shepherd) {
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

    return deferred.promise;
};

init._dispatchMessage = function (shepherd, intf, cId, topic, message) {
    MC('message with topic: ' + topic);
    var node = shepherd._nodebox[cId],
        msgStr,
        parsedMsg,
        unknownIntf = false,
        messageHandler;

    msgStr = message.toString();            // convert buffer to string
    parsedMsg = mutils.jsonify(msgStr);     // jsonify the message, keep it as an string if get no object
    parsedMsg = _.isObject(parsedMsg) ? _.assign(parsedMsg, { clientId: cId }) : msgStr;    // all msgs must have clientId

    shepherd.emit('message', topic, parsedMsg);

    // deal with the unknown 'node' here, thus no need to check it in each _handler
    if (!node && intf !== 'register') {     // no node before 'register', continue if we received 'register'
        if (intf !== 'response') {          // need not send back while receiving a 'response'
            shepherd._responseSender(intf, cId, {
                transId: _.isObject(parsedMsg) ? parsedMsg.transId : null,
                status: mutils.rspCodeNum('NotFound')
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

    var objMsgChs = [ 'register', 'deregister', 'notify', 'update', 'response', 'ping', 'lwt' ],
        realIntf = intf;

    if (_.includes(objMsgChs, intf) && !_.isObject(parsedMsg))
        intf = '_badMsg';

    switch (intf) {
        case 'register':
            // reg_data = { clientId, transId, lifetime, version, objList, ip, mac, port(opt) }
            messageHandler = msghdlr._clientRegisterHandler;
            break;
        case 'deregister':
            // dereg_data = { clientId, transId }; 
            messageHandler = msghdlr._clientDeregisterHandler;
            break;
        case 'notify':
            // notify_data = { clientId, transId, oid, iid, rid, data }
            _.forEach(parsedMsg, function (val, key) {
                if (key === 'oid')
                    parsedMsg.oid = mutils.oidKey(val);
            });
            // we must get oid first, here is why another _.forEach() for getting rid key
            _.forEach(parsedMsg, function (val, key) {
                if (key === 'rid') {
                    try {
                        parsedMsg.rid = mutils.ridKey(parsedMsg.oid, val);
                    } catch (e) {
                        parsedMsg.rid = parsedMsg.rid;
                    }
                }
            });

            messageHandler = msghdlr._clientNotifyHandler;
            break;
        case 'update':
            // update_data = { clientId, transId, lifeTime(opt), version(opt), objList(opt), ip(opt), mac(opt), port(opt) }
            messageHandler = msghdlr._clientUpdateHandler;
            break;
        case 'response':
            // rsp_data = { clientId, transId, cmdId, status, data }
                parsedMsg.cmdId = mutils.cmdKey(parsedMsg.cmdId);
                messageHandler = msghdlr._clientResponseHandler;
            break;
        case 'ping':
            // ping_data = { clientId, transId }
            messageHandler = msghdlr._clientPingHandler;
            break;
        case 'lwt':
            // lwt_data = { clientId, data }
            messageHandler = msghdlr._clientLwtHandler;
            break;
        case '_badMsg':
            messageHandler = msghdlr._clientBadMsgHandler;
            break;
        default:
            // pass the orginal arguments to _clientOtherTopicsHandler()
            unknownIntf = true;
            messageHandler = msghdlr._clientOtherTopicsHandler;
            break;
    }

    SHP('Received Msg: ');
    SHP(parsedMsg);

    process.nextTick(function () {
        if (unknownIntf)
            messageHandler(shepherd, topic, message, packet);
        else if (intf === '_badMsg')
            messageHandler(shepherd, cId, realIntf, parsedMsg);
        else
            messageHandler(shepherd, parsedMsg);
    });
};

init._attachShepherdMessageHandler = function (shepherd) {
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
        
        var topicItems = mutils.pathItems(topic),          // check and return the nice topic format
            intf = topicItems[0],                          // 'register' of example: 'register/ea:3c:4b:11:0e:6d'
            cId = topicItems[1] ? topicItems[1] : null;    // 'ea:3c:4b:11:0e:6d'

        if (cId === 'response')             // we dont accept an id like 'response', it is a reserved keyword
            return;

        shepherd.decrypt(message, cId, function (err, decrypted) {
            if (err) {
                // log 'decrytion fails'
                console.log(err);
                console.log('decrytion fails');
            } else {
                init._dispatchMessage(shepherd, intf, cId, topic, decrypted);
            }
        });

        // try {
        //     message = shepherd.decrypt(message, cId);
        // } catch (e) {
        //     // log 'decrytion fails'
        //     console.log('decrytion fails');
        //     return;
        // }
    });

    deferred.resolve();

    return deferred.promise;
};

init._loadNodesFromDb = function (shepherd) {
    var deferred = Q.defer(),
        restoreNodes = [];

    mqdb.exportClientIds().then(function (cIds) {
        _.forEach(cIds, function (clientId) {
            var doRestore,
                resNode;

            resNode = shepherd._nodebox[clientId] = new MqttNode(shepherd, clientId);
            resNode._setStatus('offline');
            // resNode.status = 'offline';

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

    return deferred.promise;
};

module.exports = init;
