'use strict';

const util = require('util'),
      Server = require('mosca').Server;

function Broker(settings) {
    Server.call(this);
    // this.server = server = new mosca.Server(settings);
}

util.inherits(Broker, Server);

Broker.prototype.setAuthenticate = function (fn) {

};

Broker.prototype.setAuthorizePublish = function (fn) {

};

Broker.prototype.setAuthorizeSubscribe = function (fn) {

};

Broker.prototype.setAuthForward = function (fn) {

};

Broker.prototype.init = function () {

};

// Events
server.on('ready', function () {
    // excute  _initBroker()
});

server.on('clientConnected', function (client) {
    // when a client is connected; the client is passed as a parameter
    // This is the client incoming handler
    // register yet?
});

server.on('subscribed', function(topic, client) {
    // when a client is subscribed to a topic; the topic and the client are passed as parameters
});

server.on('unsubscribed', function() {
    // when a client is unsubscribed to a topic; the topic and the client are passed as parameters
});

server.on('published', function(packet, client) {
    // when a new message is published; the packet and the client are passed as parameters
});

server.on('clientDisconnecting', function () {
    // when a client is being disconnected; the client is passed as a parameter
    // This is the client leaving handler
});

server.on('clientDisconnected ', function () {
    // when a client is disconnected; the client is passed as a parameter
});

server.on('delivered', function() {
    // when a client has sent back a puback for a published message; the packet and the client are passed as parameters
});

module.exports = Broker;
