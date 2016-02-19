/*jslint node: true */
'use strict';

var mqtt = require('mqtt'),
    _ = require('lodash'),
    Q = require('q');

var config = require('./config/config.js'),
    MqttNode = require('./mqtt-node'),
    msgHdlr = require('./msgHandler'),
    mutils = require('./mutils'),
    mqdb = require('./mqdb');

var init = {};

/*************************************************************************************************/
/*** Public APIs                                                                               ***/
/*************************************************************************************************/
init.initProcedure = function (shp, cb) {
    var broker = shp.mBroker,
        brokerEvtHdlrsToRemove = [ 'ready', 'clientConnected', 'clientDisconnecting', 'published', 'subscribed', 'unsubscribed' ];

    init._setupAuthPolicy(shp).then(function () {        // 1. set up authorization for priphs
        _.forEach(brokerEvtHdlrsToRemove, function (evt) {
            broker.removeAllListeners(evt);              // 2. remove all listeners attached on broker
        });
        return true;
    }).then(function () {
        return init._attachBrokerEventListeners(shp);    // 3. re-attach listeners:
    }).then(function () {
        return init._setShepherdAsClient(shp, mqtt);     // 4. let shepherd in
    }).then(function () {
        return init._testShepherdPubSub(shp);            // 5. run shepherd pub/sub testing
    }).delay(1000).then(function () {
        return init._attachShepherdMessageHandlers(shp);
    }).timeout(8000, 'Broker init timeout').done(function () {
        shp._enabled = true;                             // 6. testings are done, shepherd is enabled 
        shp.emit('_ready');                              // 7. if all done, shepherd fires '_ready' event for inner use
        cb(null, true);
    }, function (err) {
        cb(err, null);
    });
};

init.loadNodesFromDb = function (shp) {
    var deferred = Q.defer(),
        restoreNodes = [];

    mqdb.exportClientIds().then(function (cIds) {
        _.forEach(cIds, function (cId) {
            var doRestore,
                resNode;

            resNode = shp._nodebox[cId] = new MqttNode(shp, cId);
            resNode.status = 'offline';

            doRestore = resNode.restore().then(function () {
                resNode.enableLifeChecker();
            }).fail(function () {
                resNode.dbRemove();
                resNode = null;
                shp._nodebox[cId] = null;
                delete shp._nodebox[cId];
            });

            restoreNodes.push(doRestore);
        });

        return Q.allSettled(restoreNodes);
    }).done(function (resArr) {
        deferred.resolve(shp);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise;
};

/*************************************************************************************************/
/*** Protected Methods: Tackling the mBroker Things                                            ***/
/*************************************************************************************************/
init._setupAuthPolicy = function (shp) {
    var deferred = Q.defer(),
        shpId = shp.clientId,
        broker = shp.mBroker;

    broker.authenticate = function (client, user, pass, cb) {
        var defaultAccount = config.account,
            authorized = (user === defaultAccount.username && pass.toString() === defaultAccount.password);
        
        if (client.id === shpId) {      // always let shepherd pass
            client.user = shpId;
            cb(null, true);
        } else if (authorized) {        // always let default account pass
            client.user = user;
            cb(null, authorized);
        } else {
            if (shp.authPolicy && _.isFunction(shp.authPolicy.authenticate))
                shp.authPolicy.authenticate(client, user, pass, cb);
            else
                cb(null, true);
        }
    };

    broker.authorizePublish = function (client, topic, payload, cb) {
        var validTopic = mutils.slashPath(topic);

        if (client.id === shpId) {  // shepherd can always publish
            cb(null, true);
        } else if (client.user && shp._nodebox[client.id]) {
            // only authenticated user and registered client can publish to arbitrary topics
            cb(null, true);
        } else if (validTopic === ('register/' + client.id) || validTopic === ('response/' + client.id)) {
            // before registration, anyone can just publish to 'register' topic, and 'response' back from the shp request
            cb(null, true);
        } else {
            if (shp.authPolicy && _.isFunction(shp.authPolicy.authorizePublish))
                shp.authPolicy.authorizePublish(client, topic, payload, cb);
            else
                cb(null, true);
        }
    };

    broker.authorizeSubscribe = function (client, topic, cb) {
        var validTopic = mutils.slashPath(topic);

        if (client.id === shpId) {  // shepherd can always subscribe
            cb(null, true);
        } else if (client.user && shp._nodebox[client.id]) {
            // only authenticated user and registered client can subscribe to arbitrary topics
            cb(null, true);
        } else if (validTopic === 'register/response/' + client.id || 
                   validTopic === 'deregister/response/' + client.id || 
                   validTopic === 'request/' + client.id) {
            // before registration, anyone can just subscribe to his own registeration and request channels
            cb(null, true);
        } else {
            if (shp.authPolicy && _.isFunction(shp.authPolicy.authorizeSubscribe))
                shp.authPolicy.authorizeSubscribe(client, topic, cb);
            else
                cb(null, true);
        }
    };

    broker.authorizeForward = function (client, packet, cb) {
        if (client.id === shpId) {
            cb(null, true);
        } else {
            if (shp.authPolicy && _.isFunction(shp.authPolicy.authorizeForward))
                shp.authPolicy.authorizeForward(client, packet, cb);
            else
                cb(null, true);
        }
    };

    deferred.resolve();
    return deferred.promise;
};

init._attachBrokerEventListeners = function (shp) {
    var deferred = Q.defer(),
        shpId = shp.clientId,
        broker = shp.mBroker;

    broker.on('clientConnected', function (client) {
        var qnode = shp._nodebox[client.id],
            dtime = 600 + _.random(400, 2000);

        if (client.id !== shpId)
            shp.emit('priphConnected', client);

        if (qnode) {     // if in nodebox, perform maintain after dtime msecs
            qnode.status = 'online';
            setTimeout(function () {
                process.nextTick(function () {
                    qnode.maintain().done();
                });
            }, dtime);
        }
    });

    broker.on('clientDisconnecting', function (client) { 
        if (client.id !== shpId)
            shp.emit('priphDisconnecting', client);
    });

    broker.on('clientDisconnected', function (client) {
        var qnode = shp._nodebox[client.id];

        if (client.id !== shpId)
            shp.emit('priphDisconnected', client);

        if (qnode) {
            qnode.status = 'offline';
            qnode.dbSave().done();
        }
    });

    broker.on('published', function (packet, client) {
        if (client && client.id !== shpId)
            shp.emit('priphPublished', client);
    });

    broker.on('subscribed', function (topic, client) {
        if (client && client.id !== shpId)
            shp.emit('priphSubscribed', client);
    });

    broker.on('unsubscribed', function (topic, client) {
        if (client && client.id !== shpId)
            shp.emit('priphUnsubscribed', client);
    });

    deferred.resolve();
    return deferred.promise;
};

/*************************************************************************************************/
/*** Protected Methods: Tackling the mClient Things                                            ***/
/*************************************************************************************************/
init._setShepherdAsClient = function (shp, mqtt) {
    var deferred = Q.defer(),
        shpId = shp.clientId,
        options = config.clientConnOptions,
        mc;

    options.clientId = shpId;

    if (!shp.mClient)
        shp.mClient = mqtt.connect('mqtt://localhost', options);

    mc = shp.mClient;

    mc.on('close', function () {
    });

    mc.on('offline', function () {
    });

    mc.on('reconnect', function () {
    });

    mc.on('connect', function (connack) {
        if (connack.sessionPresent) {   // session already exists, no need to subscribe again
            deferred.resolve();
        } else {
            mc.subscribe(shp._channels, function (err, granted) {  // subscribe to topics of all channels
                if (err)
                    deferred.reject(err);
                else
                    deferred.resolve(granted);
            });
        }
    });

    return deferred.promise;
};

init._testShepherdPubSub = function (shp) {
    var deferred = Q.defer(),
        mc = shp.mClient,
        shpId = shp.clientId,
        testTopics = [ 'register', 'deregister', 'update', 'notify', 'response', 'ping', 'request', 'announce', 'lwt' ],
        testMessage = '{"test": "testme"}',
        testMsgListener,
        totalCount = testTopics.length,
        checkCount = 0;

    testTopics = testTopics.map(function (tp) {
        return (tp + '/response/' + shpId);    // register/response/shpId
    });

    testMsgListener = function (topic, message, packet)  {
        var msgStr = message.toString(),
            parsedMsg = mutils.jsonify(msgStr);

        parsedMsg = parsedMsg ? _.assign(parsedMsg, { clientId: shpId }) : msgStr;

        switch (topic) {
            case testTopics[0]:    // register/response/shpId
            case testTopics[1]:    // deregister/response/shpId
            case testTopics[2]:    // update/response/shpId
            case testTopics[3]:    // notify/response/shpId
            case testTopics[4]:    // response/response/shpId
            case testTopics[5]:    // ping/response/shpId
            case testTopics[6]:    // request/response/shpId     -- should remove after test
            case testTopics[7]:    // announce/response/shpId    -- should remove after test
            case testTopics[8]:    // lwt/response/shpId
                if (parsedMsg.test === 'testme')
                    checkCount += 1;
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

init._attachShepherdMessageHandlers = function (shp) {
    var deferred = Q.defer(),
        mc = shp.mClient;

    mc.unsubscribe([ 'request/#', 'announce/#' ]);

    mc.on('error', function (err) {
        shp.emit('error', err);
    });

    // attach message handler for each channel topic
    mc.on('message', function (topic, message, packet) {
        // 'request/#', 'announce/#' were taken off
        // topics: 'register/*', 'deregister/*', 'notify/*', 'update/*', 'response/*', 'ping'
        // packet: { cmd: 'publish', messageId: 42, qos: 2, dup: false,
        //           topic: 'test', payload: new Buffer('test'), retain: false }
        // [NOTE] message is a buffer
        message = shp.decrypt(message);
        msgHdlr(shp, topic, message, packet);
    });

    deferred.resolve();
    return deferred.promise;
};

module.exports = init;
