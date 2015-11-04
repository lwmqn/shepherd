
/************************************************************************/
/* Mosca Section                                                        */
/************************************************************************/
var pubSubSettings = {
    type: 'redis',
    redis: require('redis'),
    db: 12,
    port: 6379,
    return_buffers: true,
    host: 'localhost'
};

var moscaSettings = {
    port: 1883,
    backend: pubSubSettings,
    persistence: {
        factory: mosca.persistence.Redis
    }
};

var server = new mosca.Server(moscaSettings);

server.on('ready', function () {
    console.log('Mosca server is up and running.')
});

server.on('clientConnected', function (client) {
    console.log('client connected', client.id);
});

server.on('clientDisconnecting', function () {
});

server.on('published', function(packet, client) {
    console.log('Published', packet.payload);
});

server.on('subscribed', function() {
});

server.on('unsubscribed', function() {
});

server.publish();
// var message = {
//   topic: '/hello/world',
//   payload: 'abcde', // or a Buffer
//   qos: 0, // 0, 1, or 2
//   retain: false // or true
// };

server.authenticate();
server.authorizePublish();
server.authorizeSubscribe();
server.authorizeForward();

server.published();


server.storePacket();
server.deleteOfflinePacket();
server.forwardRetained();
server.restoreClientSubscriptions();
server.forwardOfflinePackets();
server.updateOfflinePacket();
server.persistClient();
server.close();
server.attachHttpServer();
server.buildServe();

/************************************************************************/
/* MQTT Client Section                                                  */
/************************************************************************/
var sto = mqtt.Store();
sto.put(packet, callback);
sto.createStream();
sto.del(packet, cb);
sto.close(cb);

var mClient = mqtt.connect('mqtt://localhost:1111', options);
// mClient.publish(topic, message, [options], [callback]);
// mClient.subscribe(topic/topic array/topic object, [options], [callback]);
// mClient.unsubscribe(topic/topic array, [options], [callback]);
// mClient.end([force], [callback]);
// mClient.handleMessage(packet, callback);

mClient.on('connect', function (connack) { });
mClient.on('reconnect', function () { });
mClient.on('close', function () { });
mClient.on('offline', function () { });
mClient.on('error', function (error) { });
mClient.on('message', function (topic, message, packet) { });













'use strict';
const EventEmitter = require('events').EventEmitter,
      util = require('util'),
      mosca = require('mosca'),
      mqtt = require('mqtt'),
      mqdb = require('mqdb'),
      CH = {
        REG: 'register',
        DEREG: 'deregister',
        UPDATE: 'update',
        NOTIFY: 'notify',
        RSP: 'response',
        REQ: 'request'
     },
     defaultAccount = {
        username: 'freebird',
        password: 'skynyrd'
     };

var broker;

function Mcute(clientId, settings) {
    this.clientId = clientId || 'mcute';
    this.broker = null;
    this.mClient = null;    // mcute service
}


function Mcute(settings) {
    var self = this;

    broker = new mosca.Server(settings);
    thie.clientId = 'mcute';
    this.joinable = false;
    broker.on('ready', function () {
        // going to next-step
    });

    this.client = mqtt.connect('mqtt://localhost', {
        keepalive: 0,            // seconds, 0 is the default, can be any positive number
        clientId: self.clientId,
        protocolId: 'MQTT',      // or 'MQIsdp' in MQTT 3.1.1
        protocolVersion: 4,      // or 3 in MQTT 3.1
        clean: true,             // set to false to receive QoS 1 and 2 messages while offline
        reconnectPeriod: 5000,   // interval between two reconnections
        connectTimeout: 30*1000, // time to wait before a CONNACK is received
        username: 'freebird',    // the username required by your broker, if any
        password: new Buffer('skynyrd'),    // the pwd required by your broker, if any. passwords are buffers
        will: {                             // a message that will sent by the broker automatically when the client disconnect badly
            topic: 'mydevice/status'        // the topic to publish
            payload: new Buffer('dead'),    //  the message to publish, payloads are buffers
            // qos:,
            // retain:,
        }
    });


}

util.inherits(Mcute, EventEmitter);

Mcute.prototype._initBroker = function (callback) {
    return setAuthenticate()
            .then(setAuthorizePublish)
            .then(setAuthorizeSubscribe)
            .then(setSubscribeAuthorizer)
            .then(setAuthForward)
            .then(startClientComingListener)
            .done(callback);
};

Mcute.prototype._mClient = function (callback) {
    return mClientConnection()
            .then(mClientSubs)
            .then(mClientPubTest)
            .then(mClientFinishTest)
            .done(() => {
                thie.emit('ready');
            });

    // this.client.on('connect', function (connack) {});
    // this.client.on('reconnect', function () {});
    // this.client.on('close', function () {});
    // this.client.on('offline', function () {});
    // this.client.on('error', function (error) {});
    // this.client.on('message', function (topic, message, packet) {});
};

broker.on('ready', function () {
    // excute  _initBroker()
});

broker.on('clientConnected', function (client) {
    // when a client is connected; the client is passed as a parameter
    // This is the client incoming handler
    // register yet?
});

broker.on('subscribed', function(topic, client) {
    // when a client is subscribed to a topic; the topic and the client are passed as parameters
});

broker.on('unsubscribed', function() {
    // when a client is unsubscribed to a topic; the topic and the client are passed as parameters
});

broker.on('published', function(packet, client) {
    // when a new message is published; the packet and the client are passed as parameters
});

broker.on('clientDisconnecting', function () {
    // when a client is being disconnected; the client is passed as a parameter
    // This is the client leaving handler
});

broker.on('clientDisconnected ', function () {
    // when a client is disconnected; the client is passed as a parameter
});

broker.on('delivered', function() {
    // when a client has sent back a puback for a published message; the packet and the client are passed as parameters
});


Mcute.prototype.init = function () {
    // setup client

    // client subscribe to topics
    this.subscribe('/register');     // => only goes to mcute
    this.subscribe('/deregister');   // => only goes to mcute
    this.subscribe('/update');       // => only goes to mcute
    this.subscribe('/notify');       // => only goes to mcute
    this.subscribe('/response');     // => only goes to mcute
};

Mcute.prototype.publish = function (topic, msg) {
    return this.client.publish(topic, msg);
};

Mcute.prototype.subscribe = function (topic) {
    return this.client.subscribe(topic);
};

Mcute.prototype.unsubscribe = function (topic) {
    return this.client.unsubscribe(topic);
};

Mcute.prototype.end = function () {
    // [force], [cb]
    return this.client.end();
};

Mcute.prototype.handleMessage = function (packet, callback) {
    // Handle messages with backpressure support, one at a time. Override at will,
    // but __always call callback__, or the client will hang.
    return this.client.handleMessage(packet, callback);
};

Mcute.prototype.register = function (clientId, data) {
    // if success
    // this.subscribe
    // this.publish(`{$CHNL.REG}/{$clientId}`, data);
};

// requests
Mcute.prototype.read = function (clientId) {

};

Mcute.prototype.write = function (clientId, data) {

};

Mcute.prototype.writeAttrs = function (clientId, datas) {

};

Mcute.prototype.execute = function (clientId) {

};

Mcute.prototype.discover = function () {

};

Mcute.prototype.observe = function () {

};


Mcute.prototype.reset = function () {};
Mcute.prototype.getCoordInfo = function () {};
Mcute.prototype.getNwkInfo = function () {};
Mcute.prototype.onNwkReady = function () {};
Mcute.prototype.setPermitJoin = function () {};
Mcute.prototype.getNeighborTable = function () {};
Mcute.prototype.getRoutingTable = function () {};
Mcute.prototype.changeKey = function () {};
Mcute.prototype.getKey = function () {};
Mcute.prototype.onDeviceJoin = function () {};
Mcute.prototype.getDevList = function () {};
Mcute.prototype.devListMaintain = function () {};
Mcute.prototype.removeDevice = function () {};
Mcute.prototype.setBindingEntry = function () {};
Mcute.prototype.addGroup = function () {};
Mcute.prototype.getGroupMembership = function () {};
Mcute.prototype.removeFromGroup = function () {};
Mcute.prototype.storeScene = function () {};
Mcute.prototype.removeScene = function () {};
Mcute.prototype.recallScene = function () {};
Mcute.prototype.getSceneMembership = function () {};
Mcute.prototype.sleepyDevPacketPend = function () {};
Mcute.prototype.onSleepyCheckIn = function () {};
Mcute.prototype.onAttrChange = function () {};
Mcute.prototype.getAttrList = function () {};
Mcute.prototype.readAttr = function () {};
Mcute.prototype.writeAttr = function () {};
Mcute.prototype.setAttrReport = function () {};
Mcute.prototype.onAttrReport = function () {};
Mcute.prototype.sendZclFrame = function () {};
Mcute.prototype.onZclReceive = function () {};



server.authenticate = function (client, user, pass, cb) {
    if (!joinable) {
        reject this connection
    }

    var authorized = (user === 'freebird' && pass.toString() === 'skynyrd');

    if (authorized) client.user = user;
    cb(null, authorized);
};
/************************************************************************/
/* Client Section                                                       */
/************************************************************************/

mClient.publish(topic, message, [options], [callback]);
mClient.subscribe(topic/topic array/topic object, [options], [cb]);
// mClient.unsubscribe(topic/topic array, [options], [callback]);
// mClient.end([force], [callback]);
// mClient.handleMessage(packet, callback);

mClient.on('connect', function (connack) {
    // {
    //     cmd: 'connack'
    //   , returnCode: 0            // or whatever else you see fit
    //   , sessionPresent: false    // or true.
    // }
    var topics = ['/register', '/deregister', '/update', '/notify', '/response'],
        QoS = 0;

    if (!connack.sessionPresent) {
        mClient.subscribe(topics, QoS, (err, granted) => {
            // err: a subscription error
            // granted: is an array of {topic, qos} where:
            //     topic: is a subscribed to topic
            //     qos: is the granted qos level on it
        });

        mClient.on('message', (topic, message, packet) => {

        });

        mClient.on('error', error => {

        });
    } else {
        // reflash, update
    }
});


// mClient.on('reconnect', function () { });
// mClient.on('close', function () { mqtt.connect('mqtt:localhost', opt});
// mClient.on('offline', function () { });

function setAuthenticate(brk, callback) {
    var deferred = Q.defer();

    return deferred.promise.nodeify(callback);
}

function setAuthorizePublish(brk, callback) {
    var deferred = Q.defer();

    return deferred.promise.nodeify(callback);
}

function setSubscribeAuthorizer(brk, callback) {
    var deferred = Q.defer();

    return deferred.promise.nodeify(callback);
}

function setAuthForward(brk, callback) {
    var deferred = Q.defer();

    return deferred.promise.nodeify(callback);
}