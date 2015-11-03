
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
server.authenticate();
server.published();
server.authorizePublish();
server.authorizeSubscribe();
server.authorizeForward();
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

var mClient = mqtt.connect('localhost', options);
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