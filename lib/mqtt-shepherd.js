/*jslint node: true */
'use strict';
// [TODO] many timeout request.... should stop by _online test
var util = require('util'),
    EventEmitter = require('events');

var Q = require('q'),
    _ = require('lodash'),
    mosca = require('mosca'),
    debug = require('debug');

var mutils = require('./mutils'),
    init = require('./initializer'),
    config = require('./config/config.js');

var defaultJoinTime = 60,  // seconds
    reqTimeout = config.reqTimeout || 10000;

// set up debuggers
var dbg_mode = true,
    SHP = debug('shp'),
    BRK = debug('brk'),
    AUTH = debug('auth'),
    MC = debug('mc'),
    ERR = debug('shp:err'),
    APP = debug('app');

function MShepherd(name, settings) {
    EventEmitter.call(this);

    var self = this,
        permitJoinCounter,
        transId = 0;

    this._joinable = false;
    this._enabled = false;
    this._permitJoinTime = 0;

    this.clientId = name || config.shepherdName;
    this.brokerSettings = settings || config.brokerSettings;

    this.mBroker = null;
    this.mClient = null;

    this._nodebox = {};         // holds the registered mqtt-nodes with KVP { clientId: node }

    // [TODO] change _rspsToResolve to event Hub
    this._rspsToResolve = {};   // { clientId: { cmd: { transid: { deferred, tmoutCtrl } } } }
    this._channels = {          // topic and qos of each channel 
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

    this.nextTransId = function () {
        if (transId++ > 255)
            transId = 0;
        return transId;
    };

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

    this.encrypt = function (msg) {                    // Overide at will
        return msg;
    };

    this.decrypt = function (msg) {                    // Overide at will
        // [Note] msg is a Buffer
        return msg;
    };

    this.permitJoin = function (time) {
        if (time === 0) {           // immediately close for joining if time = 0
            this._joinable = false;
            this._permitJoinTime = 0;

            if (permitJoinCounter) {
                clearInterval(permitJoinCounter);
                permitJoinCounter = null;
            }
            return this;
        }

        time = time || defaultJoinTime;
        this._permitJoinTime = Math.floor(time);

        permitJoinCounter = setInterval(function () {
            self._permitJoinTime -= 1;
            if (self._permitJoinTime < 1) {
                self._joinable = false;
                clearInterval(permitJoinCounter);
                permitJoinCounter = null;
            }
        }, 1000);

        this._joinable = true;

        return this;
    };

    this.on('_ready', function () {
        self.emit('ready');
        // IND:NET_READY
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
    var shp = this,
        deferred = Q.defer(),
        broker;

    init.loadNodesFromDb(shp).then(function () {
        if (!shp.mBroker)
            shp.mBroker = new mosca.Server(shp.brokerSettings);
        
        broker = shp.mBroker;
        broker.once('ready', function () {
            init.initProcedure(shp, function (err) {
                if (err)
                    deferred.reject(err);
                else
                    deferred.resolve();
            });
        });
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

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
        node.status = 'offline';
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
    // convert cmdId to number, get transId and stringify request object in this method
    var self = this,
        deferred = Q.defer(),
        topic = 'request/' + clientId,
        cmdNum = mutils.cmdNum(cmdId) || cmdId,
        rspEvt,
        reqTmout,
        msg;

    if (arguments.length < 2) {
        deferred.reject(new Error('Bad arguments.'));
        return deferred.promise.nodeify(callback);
    }

    reqObj = mutils.turnReqObjOfIds(reqObj);
    reqObj.cmdId = cmdNum;

    if (!this._enabled) {
        deferred.reject(new Error('Shepherd is not ready, cannot send request.'));
    } else if (reqObj.cmdId === 255) {
        deferred.reject(new Error('Unable to send the unknown command.'));
    } else {
        reqObj.transId = this.nextTransId();
        msg = JSON.stringify(reqObj);
        msg = self.encrypt(msg);

        reqTmout = setTimeout(function () {         // pass 'inner timeout handling' to _clientResponseHandler
            self.emit(rspEvt, { status: 408, data: null });
        }, reqTmout);

        rspEvt = clientId + ':' + cmdNum + ':' + reqObj.transId;

        self.once(rspEvt, function (rsp) {
            if (reqTmout) {
                clearTimeout(reqTmout);
                reqTmout = null;
            }
            deferred.resolve(rsp);
        });

        process.nextTick(function () {
            SHP('Send request with topic: ' + topic);
            self.mClient.publish(topic, msg, { qos: 1, retain: false });
        });
    }

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Request to Remote APIs                                                                    ***/
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

/*************************************************************************************************/
/*** Code Temp Zone                                                                            ***/
/*************************************************************************************************/
// [TODO] get router and self ip
MShepherd.prototype.getInfo = function () {
    var nwkInfo = {
        state: 0,           // 0: up, 1: down
        routerIp: '',
        ip: '',
        mac: '',
        permitRemainingTime: this._permitJoinTime
    };
    return nwkInfo;
};

MShepherd.prototype.getDevList = function (callback) {
    return _.map(this._nodebox, function (qnode) {
        return {
            clientId: qnode.clientId,
            lifetime: qnode.lifetime,
            ip: qnode.ip,
            mac: qnode.mac
        };
    });
};

MShepherd.prototype.devListMaintain = function (qnode) {
    if (qnode)
        qnode.maintain().end();
    else
        _.forEach(this._nodebox, function (qn) {
            qn.maintain().end();
        });

    return this;
};

// MShepherd.prototype.sleepyDevPacketPend = function () {};
// MShepherd.prototype.onSleepyCheckIn = function () {};
// MShepherd.prototype.changeKey = function () {};
// MShepherd.prototype.getKey = function () {};
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

// IND:DEVICE_INCOMING
// IND:DEV_ATTR_CHANGED

// IND:NET_READY

// IND:DEVICE_LEAVING
// IND:SLEEPY_DEVICE_CHECKIN
// IND:NET_CHANGED
// IND:ATTR_CHANGED
// IND:REPORT
