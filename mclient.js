'use strict';

const EventEmitter = require('events').EventEmitter,
      util = require('util'),
      mqtt = require('mqtt'),
      CH = {
        REG: 'register',
        DEREG: 'deregister',
        UPDATE: 'update',
        NOTIFY: 'notify',
        RSP: 'response',
        REQ: 'request'
     };

const subTopics = [ '/register', '/deregister', '/update', '/notify', '/response' ];

function mClient (host, port, account) {
  return mqtt.connect();
}

// mClient.prototype.
mClient.subscribe(subTopics);

mClient.on('message', (topic, message, packet) => {
    // packet {
    //     cmd: 'publish'
    //   , messageId: 42
    //   , qos: 2
    //   , dup: false
    //   , topic: 'test'  <=== topic
    //   , payload: new Buffer('test')  <=== message
    //   , retain: false
    // }

    this.emit('register', data);    // { clientId, ip, lifeTime, version, objList }
    this.emit('deregister', data);  // { clientId }
    this.emit('update', data);      // { clientId, ip, lifeTime, objList }
    this.emit('notify', data);      // { clientId, objId, instId, resrcId, value }
    this.emit('response', data);    // { clientId, objId, instId, resrcId, status }

});
// util.inherits(Broker, Server);

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