/*jslint node: true */
'use strict';

var util = require('util'),
    EventEmitter = require('events'),
    _ = require('lodash'),
    Q = require('q'),
    // network = require('network'),
    mqtt = require('mqtt'),
    debug = require('debug');

var init = require('./init'),
    mutils = require('./mutils'),
    msghdlr = require('./msghandler'),
    config = require('./config/config.js');

// set up debuggers
var SHP = debug('shp'),
    BRK = debug('brk'),
    AUTH = debug('auth'),
    MC = debug('mc'),
    ERR = debug('shp:err'),
    APP = debug('app');

var tpyTimeout = 8000,
    reqTimeout = config.reqTimeout || 10000;

function MShepherd(name, settings) {
    EventEmitter.call(this);

    var self = this,
        permitJoinCountdown,
        transId = 0;

    this._nodebox = {};         // { clientId: node } box that holds the registered mqtt-nodes
    this._rspsToResolve = {};   // { clientId: { cmd: { transid: { deferred, tmoutCtrl } } } }
    this._channels = {
        'register/#': 0,
        'deregister/#': 0,
        'notify/#': 1,
        'update/#': 1,
        'response/#': 1,
        'ping/#': 0,
        'lwt/#': 0,
        'request/#': 0,
        'announce/#': 0
    };

    this._joinable = false;
    this._enabled = false;
    this._permitJoinTime = 0;

    this.clientId = name || config.shepherdName;
    this.brokerSettings = settings || config.brokerSettings;

    this.mBroker = null;
    this.mClient = null;

    this.authPolicy = {
        // Override at will.
        authenticate: function (client, user, pass, cb) {
            var authorized = false;
            cb(null, authorized);
        },
        // Override at will.
        authorizePublish: function (client, topic, payload, cb) {
            var authorized = false;
            cb(null, authorized);
        },
        // Override at will.
        authorizeSubscribe: function (client, topic, cb) {
            var authorized = true;
            cb(null, authorized);
        },
        // Default: authorize any packet for any client. Override at will
        authorizeForward: function (client, packet, cb) {
            var authorized = true;
            cb(null, authorized);
        }
    };

    this.encrypt = function (msg) {         // Overide at will
        return msg;
    };

    this.decrypt = function (msg) {         // Overide at will
        return msg;
    };

    this.permitJoin = function (time) {
        time = time || 0;
        this._permitJoinTime = Math.floor(time);

        if (!time) { 
            this._joinable = false;
            this._permitJoinTime = 0;

            if (permitJoinCountdown) {
                clearInterval(permitJoinCountdown);
                permitJoinCountdown = null;
            }
            return this;
        }

        permitJoinCountdown = setInterval(function () {
            self._permitJoinTime -= 1;

            if (self._permitJoinTime === 0) {
                self._joinable = false;
                clearInterval(permitJoinCountdown);
                permitJoinCountdown = null;
            }
        }, 1000);

        this._joinable = true;

        return this;
    };

    this.nextTransId = function () {
        if (transId > 255)
            transId = 0;
        return transId++;
    };

    this.on('_ready', function () {
        self.emit('ready');
    });
}

util.inherits(MShepherd, EventEmitter);

/*************************************************************************************************/
/*** MShepherd Major Functions                                                                 ***/
/*************************************************************************************************/
MShepherd.prototype.find = function (clientId) {
    return this._nodebox[clientId];
};

MShepherd.prototype.start = function (callback) {
    var shepherd = this,
        deferred = Q.defer();

    init.setupShepherd(this)
        .timeout(tpyTimeout, 'Broker init timeout')
        .fail(function (err) {
            ERR(err);
            deferred.reject(err);
        }).done(function () {
            shepherd._enabled = true;   // 6. testings are done, shepherd is enabled 
            shepherd.emit('_ready');    // 7. if all done, shepherd fires '_ready' event for inner use
            deferred.resolve();
        });

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype.stop = function (callback) {
    var self = this,
        deferred = Q.defer(),
        mClient = this.mClient;

    if (!this._enabled) {
        deferred.resolve();
    } else {
        this.permitJoin(0);
        this._enabled = false;
        // close mClient, force = true, close immediately
        mClient.end(true, function () {    
            self.mClient = null;
            deferred.resolve();
        });
    }

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype.reset = function (callback) {
    var self = this,
        deferred = Q.defer();

    this.stop().then(function () {
        return self.start();
    }).done(function () {
        deferred.resolve();
    }, function (err) {
        ERR(err);
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype.deregisterNode = function (clientId, callback) {
    var self = this,
        deferred = Q.defer(),
        node = this._nodebox[clientId];

    if (!node) {
        this._responseSender('deregister', clientId, { status: mutils.rspCodeNum('NotFound') }).done();
    } else {
        node._setStatus('offline');
        // node.status = 'offline';
        node.disableLifeChecker();
        node.dbRemove().done(function () {
            node._registered = false;
            node.so = null;
            delete node.so;
            self._nodebox[clientId] = null;
            delete self._nodebox[clientId];

            self._responseSender('deregister', clientId, { status: mutils.rspCodeNum('Deleted') }).done();
            self.emit('deregistered', clientId);
        }, function (err) {
            ERR(err);
            deferred.reject(err);
        });
    }

    deferred.resolve(clientId);

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype.announce = function (msg, callback) {
    var self = this,
        deferred = Q.defer();

    process.nextTick(function () {
        self.mClient.publish('announce', msg, { qos: 0, retain: false }, function () {
            deferred.resolve();
        });
    });
};

// shepherd -> pheripheral
MShepherd.prototype._responseSender = function (intf, clientId, rspObj, callback) {
    var self = this,
        deferred = Q.defer(),
        topic = intf + '/response/' + clientId,
        msg = JSON.stringify(rspObj);           // rspObj won't be changed if it is a string

    msg = self.encrypt(msg);
    process.nextTick(function () {
        SHP('Send response with topic: ' + topic);
        self.mClient.publish(topic, msg, { qos: 1, retain: false }, function () {
            deferred.resolve();
        });
    });

    return deferred.promise.nodeify(callback);
};

// shepherd -> pheripheral
MShepherd.prototype._requestSender = function (cmdId, clientId, reqObj, callback) {
    var self = this,
        deferred = Q.defer(),
        topic = 'request/' + clientId,
        msg;

    var qnode = this.find(clientId);
    if (!qnode) {
        deferred.reject(new Error('No such node.'));
        return deferred.promise.nodeify(callback);
    } else if (qnode.status === 'offline') {
        deferred.reject(new Error('Client offline, clientId: ' + qnode.clientId));
        return deferred.promise.nodeify(callback);
    }
    // convert cmdId to number, get transId and stringify request object in this method
    if (reqObj)
        reqObj = mutils.turnReqObjOfIds(reqObj);

    if (arguments.length < 2) {
        deferred.reject(new Error('Bad arguments.'));
        return deferred.promise.nodeify(callback);
    }

    reqObj.cmdId = _.isUndefined(mutils.cmdNum(cmdId)) ? cmdId : mutils.cmdNum(cmdId); // 255: unknown cmd

    if (!this._enabled) {
        deferred.reject(new Error('Shepherd is not ready, cannot send request.'));
    } else if (reqObj.cmdId === 255) {
        deferred.reject(new Error('Unable to send the unknown command.'));
    } else {
        reqObj.transId = this.nextTransId();
        msg = JSON.stringify(reqObj);
        msg = self.encrypt(msg);
        // load the cmd promise to be resolved
        // { clientId: { cmd: { transid: { deferred, tmoutCtrl } } } }
        this._rspsToResolve[clientId] = this._rspsToResolve[clientId] || {};
        this._rspsToResolve[clientId][cmdId] = this._rspsToResolve[clientId][cmdId] || {};
        this._rspsToResolve[clientId][cmdId][reqObj.transId] = {
            deferred: deferred,
            tmoutCtrl: setTimeout(function () {         // pass 'inner timeout handling' to _clientResponseHandler
                msghdlr._clientResponseHandler(self, {
                    clientId: clientId,
                    transId: reqObj.transId,
                    cmdId: cmdId,
                    status: 408,
                    data: null
                });
            }, reqTimeout)
        };

        process.nextTick(function () {
            SHP('Send request with topic: ' + topic);
            self.mClient.publish(topic, msg, { qos: 1, retain: false });
        });
    }

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Request to Remote  APIs                                                                    ***/
/*************************************************************************************************/
MShepherd.prototype.readReq = function (clientId, reqObj, callback) {
    return this._requestSender('read', clientId, reqObj, callback);
};

MShepherd.prototype.writeReq = function (clientId, reqObj, callback) {
    return this._requestSender('write', clientId, reqObj, callback);
};

MShepherd.prototype.writeAttrsReq = function (clientId, reqObj, callback) {
    return this._requestSender('writeAttrs', clientId, reqObj, callback);
};

MShepherd.prototype.discoverReq = function (clientId, reqObj, callback) {
    return this._requestSender('discover', clientId, reqObj, callback);
};

MShepherd.prototype.executeReq = function (clientId, reqObj, callback) {
    return this._requestSender('execute', clientId, reqObj, callback);
};

MShepherd.prototype.observeReq = function (clientId, reqObj, callback) {
    return this._requestSender('observe', clientId, reqObj, callback);
};

MShepherd.prototype.pingReq = function (clientId, callback) {
    return this._requestSender('ping', clientId, {}, callback);
};

/*************************************************************************************************/
/*** Code Temp Zone                                                                            ***/
/*************************************************************************************************/
MShepherd.prototype.getInfo = function () {
    // embrace getNwkInfo
    // network module
};

MShepherd.prototype.getDevList = function (callback) {
    var deferred = Q.defer(),
        mqttNodes = [];

    _.forEach(this._nodebox, function (node, clientId) {
        mqttNodes.push({
            clientId: node.clientId,
            lifetime: node.lifetime,
            ip: node.ip,
            mac: node.mac
        });
    });

    deferred.resolve(mqttNodes);
    return deferred.promise.nodeify(callback);
};


MShepherd.prototype.devListMaintain = function () {};
// MShepherd.prototype.changeKey = function () {};
// MShepherd.prototype.getKey = function () {};
MShepherd.prototype.sleepyDevPacketPend = function () {};

MShepherd.prototype.onNwkReady = function () {};        // ready
MShepherd.prototype.onDeviceJoin = function () {};      // registered
MShepherd.prototype.onSleepyCheckIn = function () {};
MShepherd.prototype.onAttrChange = function () {};      // updated
MShepherd.prototype.onAttrReport = function () {};      // notified

module.exports = MShepherd;

/*************************************************************************************************/
/*** Upstream Events                                                                           ***/
/*************************************************************************************************/
// SYS_READY_IND
// NWK_READY_IND
// NWK_DEVICE_IND
// DEV_ATTRIBUTE_CHANGE_IND
// DEV_STATE_CHANGE_IND
// DEV_NET_CHANGE_IND
// DEV_ATTRIBUTE_REPORTING_IND
// DEV_SLEEPY_DEVICE_CHECK_IN_IND

// IND:NET_READY
// IND:DEVICE_INCOMING
// IND:DEVICE_LEAVING

// IND:SLEEPY_DEVICE_CHECKIN
// IND:NET_CHANGED
// IND:ATTR_CHANGED
// IND:REPORT

// STATUS_CHANGED
