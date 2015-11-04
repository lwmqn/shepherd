var server;

function Broker(settings) {
    this.server = server = new mosca.Server(settings);
    this.server.on('ready', () => {
        
    });
}

Broker.prototype.init = function () {
    return setAuthenticate()
            .then(setAuthorizePublish)
            .then(setAuthorizeSubscribe)
            .then(setSubscribeAuthorizer)
            .then(setAuthForward)
            .then(startClientComingListener)
            .done(callback);
};


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