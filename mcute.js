'use strict';
const EventEmitter = require('events').EventEmitter,
      util = require('util');

const mosca = require('mosca'),
      mqtt = require('mqtt');

const mqdb = require('mqdb');

const CH = {
    REG: '/register',
    DEREG: '/deregister',
    UPDATE: '/update',
    NOTIFY: '/notify',
    RSP: '/response',
    REQ: '/request'
};

// what we need
// 1. mqtt broker
// 2. database
// 3. mqtt client - mcute is a mqtt client

var mcute = {};
var broker;
mcute.init = function (settings) {
    broker = new mosca.Server(settings);
    broker.on('ready', function () {});

        // set up broker
    broker.on('ready', function () {});
    broker.on('clientConnected', function (client) {});
    broker.on('clientDisconnecting', function () {});
    broker.on('published', function(packet, client) {});
    broker.on('subscribed', function() {});
    broker.on('unsubscribed', function() {});
};

function Mcute() {
    var self = this;

    thie.clientId = 'mcute';
    this.joinable = false;

    this.client = mqtt.connect('mqtt://localhost', {
        keepalive: 0,            // seconds, 0 is the default, can be any positive number
        clientId: self.clientId,
        protocolId: 'MQTT',      // or 'MQIsdp' in MQTT 3.1.1
        protocolVersion: 4,      // or 3 in MQTT 3.1
        clean: true,             // set to false to receive QoS 1 and 2 messages while offline
        reconnectPeriod: 5000,   // interval between two reconnections
        connectTimeout: 30*1000, // time to wait before a CONNACK is received
        username: 'sivann',      // the username required by your broker, if any
        password: new Buffer('freebird'),   // the pwd required by your broker, if any. passwords are buffers
        will: {                             // a message that will sent by the broker automatically when the client disconnect badly
            topic: 'mydevice/status'        // the topic to publish
            payload: new Buffer('dead'),    //  the message to publish, payloads are buffers
            // qos:,
            // retain:,
        }
    });

    this.client.on('connect', function (connack) {});
    this.client.on('reconnect', function () {});
    this.client.on('close', function () {});
    this.client.on('offline', function () {});
    this.client.on('error', function (error) {});
    this.client.on('message', function (topic, message, packet) {});
}

util.inherits(Mcute, EventEmitter);

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