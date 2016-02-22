var debug = require('debug');
var SHP = debug('shp'),
    BRK = debug('brk'),
    AUTH = debug('auth'),
    MC = debug('mc'),
    ERR = debug('shp:err'),
    APP = debug('app');

var Q = require('q');
var mutils = require('./mutils');
var msghdlr = require('./msghandler');
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
                    if (key === 'rid')
                        parsedMsg.rid = mutils.ridKey(parsedMsg.oid, val);
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



module.exports = init;
