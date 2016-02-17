// module.exports = require('./' + (process.env.NODE_ENV) || 'development') + '.json');
var mosca = require('mosca');
var account = {
        username: 'freebird',
        password: 'skynyrd'
    };

module.exports = {
    shepherdName: 'lwmqn-server',
    account: account,
    brokerUrl: 'mqtt://localhost',
    brokerSettings: {
        port: 1883,
        // backend: {               // use Mosca default ascoltatore
        //     type: 'redis',
        //     redis: redis,
        //     db: 12,
        //     port: 6379,
        //     return_buffers: true,
        //     host: 'localhost'
        // },
        persistence: {
            factory: mosca.persistence.LevelUp,
            path: './persist'
        }
    },
    clientConnOptions: {
        keepalive: 10,                      // seconds, default 0, can be any positive number
        clientId: null,
        protocolId: 'MQTT',                 // or 'MQIsdp' in MQTT 3.1.1
        protocolVersion: 4,                 // or 3 in MQTT 3.1
        clean: true,                        // set to false to receive QoS 1 and 2 msg while offline
        reconnectPeriod: 20000,              // interval between two reconnections
        connectTimeout: 30*1000,            // time to wait before a CONNACK is received
        username: account.username,         // the username required by your broker, if any
        password: new Buffer(account.password), // the pwd required by your broker, if any. passwords are buffers
        will: {                             // a msg that will sent by the broker automatically when the client disconnect badly
            topic: 'announce',              // the topic to pub
            payload: new Buffer('shepherd is down'),    // the msg to publish, payloads are buffers
            qos: 1,
            retain: 1,
        }
    },
    reqTimeout: 10000,
    dbPath: null
};
