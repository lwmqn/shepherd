'use strict';

const util = require('util'),
      _ = require('lodash'),
      mosca = require('mosca'),
      mqtt = require('mqtt'),
      mqdb = require('./mqdb'),
      network = require('network');

const defaultServerName = 'freebird_MQTT_DevManager',
      borkerEvents = [ 'ready', 'clientConnected', 'clientDisconnecting', 'published', 'subscribed', 'unsubscribed' ],
      mClientEvents = [ 'connect', 'reconnect', 'close', 'offline', 'error', 'message' ],
      mClientOption = {
          keepalive: 0,
          clientId: null,
          protocolId: 'MQTT',      // or 'MQIsdp' in MQTT 3.1.1
          protocolVersion: 4,      // or 3 in MQTT 3.1
          clean: false,            // set to false to receive QoS 1 and 2 messages while offline
          reconnectPeriod: 5000,
          connectTimeout: 30*1000,
          username: 'freebird',
          password: new Buffer('skynyrd'),
          will: {
              topic: 'server/status',       // the topic to publish
              payload: new Buffer('dead')   // the message to publish, payloads are buffers
              // qos:,
              // retain:,
          }
      };

function MQServer(name, auth) {
    this._joinable = false;
 
    this.name = name || defaultServerName;
    this.auth = auth;
    this.broker = null;
    this.mClient = null;
}

MQServer.prototype.start = function (settings) {
    var self = this,
        broker;

    broker = this.broker = new mosca.Server(settings);

    broker.once('ready', function () {
        self._setupAuth();
        borkerEvents.map(function (event) {
            broker.removeAllListeners(event);
        });

        self.broker.on('clientConnected', self._clientConnectedHandler);          // client
        self.broker.on('clientDisconnecting', self._clientDisconnectingHandler);
        self.broker.on('published', self._clientPublishedHandler);                // packet, client
        self.broker.on('subscribed', self._clientSubscribedHandler);
        self.broker.on('unsubscribed', self._clientUnsubscribedHandler);

        self._setupClient(function (mClient) {

        });

        // get all peripherals from database
        // check their states, online or not
    });
};


MQServer.prototype._setupAuth = function () {
    var self = this,
        authorized;

    this.broker.authenticate = function (client, user, pass, cb) {
        if (client.id === self.name) {
            client.user = 'sivann';

            cb(null, true);
        } else {
            // check if already joined, if it is, always let it go
            // if not joined before, check if it is joinable now
            //      if not joinable: reject
            //      if joinable: check if auth ok
            //              if auth ok, let it go
            //              if auth not ok, reject
            if (!self._joinable) {
                cb(null, false);
                return;
            }
            if (self.auth) {
                self.auth.authenticate(client, user, pass, cb);
            } else {
                cb(null, true);
            }
        }
    };

    this.broker.authorizePublish = function (client, topic, payload, cb) {
        if (client.id === self.name) {
            cb(null, true);
        } else {
            if (self.auth && self.auth.authorizePublish) {
                self.auth.authorizePublish(client, topic, payload, cb);
            } else {
                cb(null, true);
            }
        }
    };

    this.broker.authorizeSubscribe = function (client, topic, cb) {
        if (client.id === self.name) {
            cb(null, true);
        } else {
            if (self.auth && self.auth.authorizeSubscribe) {
                self.auth.authorizeSubscribe(client, topic, cb);
            } else {
                cb(null, true);
            }
        }
    };

    this.broker.authorizeForward = function (client, packet, cb) {
        if (client.id === self.name) {
            cb(null, true);
        } else {
            if (self.auth && self.auth.authorizeForward) {
                self.auth.authorizeForward(client, topic, cb);
            } else {
                cb(null, true);
            }
        }
    };
};

MQServer.prototype._setupClient = function (callback) {
    var self = this,
        mc;

    mClientOption.clientId = this.name;
    mc = this.mClient = mqtt.connect('mqtt://localhost', mClientOption);

    mc.once('connect', function (connack) {
        callback(mc);
    });

    mc.on('reconnect', function () {

    });

    mc.on('close', function () {

    });

    mc.on('offline', function () {

    });

    mc.on('error', function (error) {
        self.emit('error', error);
    });

    mc.on('message', function (topic, message, packet) {
        // analyse topic, message, packet
        // register, deregister, notify, update, response
        // registerHandler();
        // deregisterHandler();
        // notifyHandler();
        // updateHandler();
        // responseHandler();
    });
};

MQServer.prototype._clientUnsubscribedHandler = function () {};
MQServer.prototype._clientSubscribedHandler = function () {};
MQServer.prototype._clientPublishedHandler = function () {};
MQServer.prototype._clientDisconnectingHandler = function () {};
MQServer.prototype._clientConnectedHandler = function () {};

MQServer.prototype._registerHandler = function () {};
MQServer.prototype._deregisterHandler = function () {};
MQServer.prototype._notifyHandler = function () {};
MQServer.prototype._updateHandler = function () {};
MQServer.prototype._responseHandler = function () {};


MQServer.prototype.stop = function (cb) {
    var self = this;

    this.mClient.end(false, function () {
        self.broker.close(cb);
    });
};

MQServer.prototype.reset = function () {
    this.stop(function () {
        this.start();    
    });
};

MQServer.prototype.getServerInfo = function () {
    // ip, mac, clientId, 
    network.get_active_interface(function(err, obj) {
      /*
      { name: 'eth0',
        ip_address: '10.0.1.3',
        mac_address: '56:e5:f9:e4:38:1d',
        type: 'Wired',
        netmask: '255.255.255.0',
        gateway_ip: '10.0.1.1' }
      */
    });

    network.get_public_ip(function(err, ip) {
      console.log(err || ip); // should return your public IP address 
    });
};

MQServer.prototype.getNetworkInfo = function () {
    // dev numbers
};

MQServer.prototype.setPermitJoin = function (timeout) {
    var self = this,
        delay = timeout || 30000;

    this._joinable = true;
    setTimeout(function () {
        self._joinable = false;
    }, delay);
};

MQServer.prototype.getDevList = function () {       // .discover()
};

MQServer.prototype.devListMaintain = function () {
};

MQServer.prototype.removeDevice = function () {     // .deregister()
};

MQServer.prototype.readAttrs = function (clientId, objId, rIds) { // .read()
    var topic = `/request/{$clientId}`,
        msg = {
            objId: objId,
            rIds: rIds
        };

    this.mClient.publish(topic, msg, { qos: 1, retain: false }, function () {

    });
};

MQServer.prototype.writeAttr = function () {        // .write(), .writeAttr()
};

MQServer.prototype.getAttrList = function () {      // .discover()
};

MQServer.prototype.setAttrReport = function () {    // .observe()
};

MQServer.prototype.execute = function () {
};

MQServer.prototype.onNwkReady = function () {};
MQServer.prototype.onDeviceJoin = function () {};
MQServer.prototype.onSleepyCheckIn = function () {};
MQServer.prototype.onAttrChange = function () {};
MQServer.prototype.onAttrReport = function () {};


module.exports = mServer;
