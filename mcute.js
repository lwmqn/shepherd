'use strict';

const EventEmitter = require('events').EventEmitter,
      util = require('util'),
      _ = require('lodash'),
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
    this.joinable = false;
}
util.inherits(Mcute, EventEmitter);

Mcute.prototype.register = function () {
    // do work
    // pub result to '/register/{$id}'
};

Mcute.prototype.deregister = function () {
    // do work
    // pub result to '/deregister/{$id}'
};

Mcute.prototype.updateAttrs = function () {
    // do work
    // pub result to '/notify/{$id}'
    //            or '/update/{$id}'
};

// requests
Mcute.prototype.read = function (clientId) {
    // do work
    // pub result to '/request/{$id}'
    // listen to '/response/{$id}'
};

Mcute.prototype.write = function (clientId, data) {
    // do work
    // pub result to '/request/{$id}'
    // listen to '/response/{$id}'
};

Mcute.prototype.writeAttrs = function (clientId, datas) {
    // do work
    // pub result to '/request/{$id}'
    // listen to '/response/{$id}'
};

Mcute.prototype.execute = function (clientId) {
    // do work
    // pub result to '/request/{$id}'
    // listen to '/response/{$id}'
};

Mcute.prototype.discover = function () {
    // do work
    // pub result to '/request/{$id}'
    // listen to '/response/{$id}'
};

Mcute.prototype.observe = function () {
    // do work
    // pub result to '/request/{$id}'
    // listen to '/response/{$id}'
};

Mcute.prototype.registerHandler = function () {
    // listen to '/register'
    // call register(): pub to '/register/{$id}'
};

Mcute.prototype.deregisterHandler = function () {
    // listen to '/deregister'
    // call deregister(): pub to '/deregister/{$id}'
};

Mcute.prototype.notifyHandler = function () {
    // listen to '/notify'
    // pub to '/notify/{$id}'
};

Mcute.prototype.updateHandler = function () {
    // listen to '/update'
    // pub to '/update/{$id}'
};

Mcute.prototype.responseHandler = function () {
    // listen to '/response'
};

// broker = new mosca.Server(settings);
// this.client = mqtt.connect('mqtt://localhost', {
//     keepalive: 0,            // seconds, 0 is the default, can be any positive number
//     clientId: self.clientId,
//     protocolId: 'MQTT',      // or 'MQIsdp' in MQTT 3.1.1
//     protocolVersion: 4,      // or 3 in MQTT 3.1
//     clean: true,             // set to false to receive QoS 1 and 2 messages while offline
//     reconnectPeriod: 5000,   // interval between two reconnections
//     connectTimeout: 30*1000, // time to wait before a CONNACK is received
//     username: 'freebird',    // the username required by your broker, if any
//     password: new Buffer('skynyrd'),    // the pwd required by your broker, if any. passwords are buffers
//     will: {                             // a message that will sent by the broker automatically when the client disconnect badly
//         topic: 'mydevice/status'        // the topic to publish
//         payload: new Buffer('dead'),    //  the message to publish, payloads are buffers
//         // qos:,
//         // retain:,
//     }
// });


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



Mcute.prototype.init = function () {
    // setup client

    // client subscribe to topics
    this.subscribe('/register');     // => only goes to mcute
    this.subscribe('/deregister');   // => only goes to mcute
    this.subscribe('/update');       // => only goes to mcute
    this.subscribe('/notify');       // => only goes to mcute
    this.subscribe('/response');     // => only goes to mcute
};

/************************************************************************/
/* MCute Service Listeners                                              */
/************************************************************************/
var mcute;

mcute.on('register');
mcute.on('deregister');
mcute.on('update');
mcute.on('notify');
mcute.on('response');

/************************************************************************/
/* MCute Service APIs                                                   */
/************************************************************************/

Mcute.prototype.publish = function (topic, msg, options, callback) {
    if (util.isFunction(options)) {
        callback = options;
    }

    return this.mClient.publish(topic, msg, options, callback);
};

Mcute.prototype.subscribe = function (topic, options, callback) {
    if (util.isFunction(options)) {
        callback = options;
    }

    return this.client.subscribe(topic);
};

Mcute.prototype.unsubscribe = function (topic, options, callback) {
    return this.client.unsubscribe(topic);
};

Mcute.prototype.end = function (force, callback) {
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
// Mcute.prototype.setBindingEntry = function () {};
// Mcute.prototype.addGroup = function () {};
// Mcute.prototype.getGroupMembership = function () {};
// Mcute.prototype.removeFromGroup = function () {};
// Mcute.prototype.storeScene = function () {};
// Mcute.prototype.removeScene = function () {};
// Mcute.prototype.recallScene = function () {};
// Mcute.prototype.getSceneMembership = function () {};
Mcute.prototype.sleepyDevPacketPend = function () {};
Mcute.prototype.onSleepyCheckIn = function () {};
Mcute.prototype.onAttrChange = function () {};
Mcute.prototype.getAttrList = function () {};
Mcute.prototype.readAttr = function () {};
Mcute.prototype.writeAttr = function () {};
Mcute.prototype.setAttrReport = function () {};
Mcute.prototype.onAttrReport = function () {};
// Mcute.prototype.sendZclFrame = function () {};
// Mcute.prototype.onZclReceive = function () {};

server.authenticate = function (client, user, pass, cb) {
    if (!joinable) {
        reject this connection
    }

    var authorized = (user === 'freebird' && pass.toString() === 'skynyrd');

    if (authorized) client.user = user;
    cb(null, authorized);   // mosca will call this
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