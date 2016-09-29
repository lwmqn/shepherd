'use strict';

var IS_TESTING = (process.env.npm_lifecycle_event === 'test');

var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    crypto = require('crypto'),
    EventEmitter = require('events');

var Q = require('q'),
    _ = require('busyman'),
    Areq = require('areq'),
    network = IS_TESTING ? require('./components/network_mock') : require('network'),
    debug = require('debug')('mqtt-shepherd'),
    logReq = require('debug')('mqtt-shepherd:request');

var init = require('./init'),
    Mqdb = require('./components/mqdb'),
    mutils = require('./components/mutils'),
    msghdlr = require('./components/msghandler');

var config = require('./config.js'),
    quickPingWaitTime = config.quickPingWaitTime;

/*************************************************************************************************/
/*** MShepherd Class                                                                           ***/
/*************************************************************************************************/
function MShepherd(name, settings) {
    var self = this,
        transId = 0;

    var mqttClients = {};

    EventEmitter.call(this);

    if (arguments.length === 1 && _.isObject(name)) {
        settings = name;
        name = null;
    }

    settings = settings || {};

    if (!_.isNil(name) && !_.isString(name))
        throw new TypeError('name should be a string if gieven.');
    else if (!_.isPlainObject(settings))
        throw new TypeError('settings should be an object if gieven.');

    /***************************************************/
    /*** Prepare Shepherd Settings                   ***/
    /***************************************************/
    this.clientId = name || config.shepherdName;
    this.brokerSettings = settings.broker || config.brokerSettings;
    this.defaultAccount = settings.account || config.defaultAccount;
    this.clientConnOptions = settings.clientConnOptions || config.clientConnOptions;
    this.reqTimeout = settings.reqTimeout || config.reqTimeout;

    /***************************************************/
    /*** Protected Memebers                          ***/
    /***************************************************/
    this._startTime = 0;
    this._enabled = false;
    this._joinable = false;
    this._permitJoinTime = 0;
    this._permitJoinCountdown;
    this._net = { intf: '', ip: '', mac: '', routerIp: '' };
    this._channels = config.channelTopics;
    this._areq = new Areq(this, config.reqTimeout);

    this._nodebox = {};             // { clientId: node } box that holds the registered mqtt-nodes

    this._mqdb = null;              // setup later
    this._dbPath = settings.dbPath;

    if (!this._dbPath) {            // use default
        this._dbPath = config.defaultDbPath;
        // create default db folder if not there
        try {
            fs.statSync(config.defaultdBFolder);
        } catch (e) {
            fs.mkdirSync(config.defaultdBFolder);
        }
    }

    this._mqdb = new Mqdb(this._dbPath);

    /***************************************************/
    /*** Public Members                              ***/
    /***************************************************/
    this.mBroker = null;        // setup at init stage
    this.mClient = null;        // setup at init stage

    this.nextTransId = function () {
        if (transId > 255)
            transId = 0;
        return transId++;
    };

    // This method is required in testing
    this._currentTransId = function () {
        return transId;
    };

    this._setClient = function (client) {
        var clientId = client.id;

        if (!mqttClients[clientId]) {
            mqttClients[clientId] = client;
        } else if (mqttClients[clientId] !== client) {
            client.close();     // client conflicts, close the new comer
            return false;
        }

        return true;
    };

    this._getClient = function (clientId) {
        return mqttClients[clientId];
    };

    this._deleteClient = function (clientId) {
        var mqttClient = mqttClients[clientId];
        if (mqttClient) {
            mqttClient.close();
            mqttClients[clientId] = null;
            delete mqttClients[clientId];
        }
    };

    this.permitJoin = permitJoin.bind(this);

    this.authPolicy = {         // All methods in authPolicy can be overrided at will.
        authenticate: null,     // not provide default implement, use defaultAccount scheme
        authorizePublish: function (client, topic, payload, cb) {
            var authorized = true;
            cb(null, authorized);
        },
        authorizeSubscribe: function (client, topic, cb) {
            var authorized = true;
            cb(null, authorized);
        },
        authorizeForward: function (client, packet, cb) {
            var authorized = true;  // Default: authorize any packet for any client
            cb(null, authorized);
        }
    };

    this.encrypt = function (msgStr, clientId, callback) {  // Override at will.
        callback(null, msgStr);
    };

    this.decrypt = function (msgBuf, clientId, callback) {  // Override at will.
        callback(null, msgBuf);
    };

    /***************************************************/
    /*** Event Handlers                              ***/
    /***************************************************/
    this.on('_ready', function () {
        self._startTime = Math.floor(Date.now()/1000);
        setImmediate(function () {
            self.emit('ready');
        });
    });

    // 'ind:xxx' event bridges
    _bridgeEvents(this);
}

util.inherits(MShepherd, EventEmitter);

/*************************************************************************************************/
/*** MShepherd Major Functions                                                                 ***/
/*************************************************************************************************/
MShepherd.prototype.start = function (callback) {
    var self = this;

    return init.setupShepherd(this).timeout(config.initTimeout,'Broker init timeout.').then(function () {
        self._enabled = true;   // 6. testings are done, shepherd is enabled 
        self.emit('_ready');    // 7. if all done, shepherd fires '_ready' event for inner use
    }).nodeify(callback);
};

MShepherd.prototype.stop = function (callback) {
    var self = this;

    return Q.fcall(function () {
        if (!self._enabled || !self.mClient) {
            return 'resolve';
        } else {
            self.permitJoin(0);
            return self.announce('stopped').then(function () {
                // close mClient, force = true, close immediately
                return Q.ninvoke(self.mClient, 'end', true);
            });
        }
    }).then(function () {
        self.mClient = null;
        self._enabled = false;
    }).nodeify(callback);
};

MShepherd.prototype.reset = function (mode, callback) {
    var self = this,
        deferred = Q.defer();

    if (_.isFunction(mode)) {
        callback = mode;
        mode = false;
    }

    mode = !!mode;

    this.announce('resetting').then(function () {
        if (mode === true) {
            // clear database
            if (self._mqdb) {
                self._mqdb.db.remove({}, { multi: true }, function (err, num) {
                    self._mqdb.db.loadDatabase(function (err) {
                        if (!err)
                            debug('Database cleared.');
                        else
                            debug(err);
                    });
                });
            } else {
                self._mqdb = new Mqdb(self._dbPath);
            }
        }

        self._nodebox = null;
        self._nodebox = {};

        setTimeout(function () {
            self.stop().then(function () {
                return self.start();
            }).done(deferred.resolve, deferred.reject);
        }, 200);
    }).fail(deferred.reject).done();

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype.find = function (clientId) {
    if (!_.isString(clientId))
        throw new TypeError('clientId should be a string.');

    return this._nodebox[clientId];
};

MShepherd.prototype.findByMac = function (macAddr) {
    if (!_.isString(macAddr))
        throw new TypeError('macAddr should be a string.');
    else
        macAddr = macAddr.toLowerCase();

    return _.filter(this._nodebox, function (qnode) {
        return qnode.mac === macAddr;
    });
};  // return []

MShepherd.prototype.updateNetInfo = function (callback) {
    var self = this;

    return Q.ninvoke(network, 'get_active_interface').then(function (info) {
            self._net.intf = info.name;
            self._net.ip = info.ip_address;
            self._net.mac = info.mac_address;
            self._net.routerIp = info.gateway_ip;
            return _.cloneDeep(self._net);
    }).nodeify(callback);
};

MShepherd.prototype.remove = function (clientId, callback) {
    var self = this,
        deferred = Q.defer(),
        qnode = this.find(clientId),
        macAddr;

    if (!_.isString(clientId))
        throw new TypeError('clientId should be a string.');

    if (!qnode) {
        this._responseSender('deregister', clientId, { status: mutils.rspCodeNum('NotFound') }).done();
        this._deleteClient(clientId);
        deferred.resolve(clientId);
    } else {
        macAddr = qnode.mac;
        qnode._setStatus('offline');
        qnode.disableLifeChecker();
        qnode.dbRemove().done(function () {
            qnode._registered = false;
            qnode.so = null;
            delete qnode.so;
            self._nodebox[clientId] = null;
            delete self._nodebox[clientId];

            self._responseSender('deregister', clientId, { status: mutils.rspCodeNum('Deleted') }).done(function () {
                setImmediate(function () {
                    self.emit('_deregistered', clientId);
                    self.emit('ind:leaving', clientId, macAddr);
                });
                self._deleteClient(clientId);
                deferred.resolve(clientId);
            });
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

MShepherd.prototype.announce = function (msg, callback) {
    var args = [ 'announce', msg, { qos: 0, retain: false } ];
    return Q.npost(this.mClient, 'publish', args).nodeify(callback);
};

// shepherd -> pheripheral
MShepherd.prototype._responseSender = function (intf, clientId, rspObj, callback) {
    if (!_.isString(clientId))
        throw new TypeError('clientId should be a string.');

    var self = this,
        deferred = Q.defer(),
        topic = intf + '/response/' + clientId,
        msg = JSON.stringify(rspObj);           // rspObj won't be changed if it is a string

    if (!this._enabled) {
        deferred.reject(new Error('Shepherd is not ready, cannot send response.'));
    } else {
        Q.ninvoke(this, 'encrypt', msg, clientId).then(function (encrypted) {
            return Q.ninvoke(self.mClient, 'publish', topic, encrypted, { qos: 1, retain: false });
        }).done(deferred.resolve, deferred.reject);
    }

    return deferred.promise.nodeify(callback);
};

// shepherd -> pheripheral
MShepherd.prototype._requestSender = function (cmdId, clientId, reqObj, waitTime, callback) {
    if (!_.isString(clientId))
        throw new TypeError('clientId should be a string.');

    var quickping = (cmdId === 'quickping');
    cmdId = quickping ? 'ping' : cmdId;

    var self = this,
        deferred = Q.defer(),
        areq = this._areq,
        qnode = this.find(clientId),
        topic = 'request/' + clientId,
        cmdIdString = mutils.cmdKey(cmdId),
        preError,
        evt,
        msg;

    if (_.isFunction(waitTime)) {
        callback = waitTime;
        waitTime = null;
    }

    waitTime = waitTime || self.reqTimeout;
    cmdIdString = cmdIdString ? cmdIdString : cmdId;

    if (arguments.length < 2)
        preError = new Error('Bad arguments.');
    else if (!this._enabled)
        preError = new Error('Shepherd is not ready, cannot send request.');
    else if (!qnode)
        preError = new Error('No such node, clientId: ' + clientId);
    else if (qnode.getStatus() === 'offline')
        preError = new Error('Client offline, clientId: ' + qnode.clientId);

    // convert cmdId to number, get transId and stringify request object in this method
    if (reqObj)
        reqObj = mutils.turnReqObjOfIds(reqObj);

    reqObj.cmdId = _.isUndefined(mutils.cmdNum(cmdId)) ? cmdId : mutils.cmdNum(cmdId); // 255: unknown cmd

    if (reqObj.cmdId === 255)
        preError = preError || new Error('Unable to send the unknown command.');

    if (preError) {
        deferred.reject(preError);
        return deferred.promise.nodeify(callback);
    }

    if (qnode.getStatus() === 'sleep' && !quickping) {
        qnode.quickPingReq().then(function () {
            doSending();
        }).fail(function () {
            var couldWait = false;
            if (qnode._nextCheckin)
                couldWait = (qnode._nextCheckin - _.now()) < qnode._CheckinMargin;

            if (couldWait)
                doSending();
            else
                deferred.reject('Client is sleeping, clientId: ' + qnode.clientId);
        }).done();
     } else {
        doSending();
     }

    function doSending() {
        reqObj.transId = self.nextTransId();
        evt = clientId + ':' + cmdIdString + ':' + reqObj.transId;  // 'foo_id:read:101'

        while (areq.isEventPending(evt)) {
            reqObj.transId = self.nextTransId();
            evt = clientId + ':' + cmdIdString + ':' + reqObj.transId;
        }

        logReq('REQ --> %s, transId: %d', cmdIdString, reqObj.transId);

        msg = JSON.stringify(reqObj);

        self.encrypt(msg, clientId, function (err, encrypted) {
            if (err) {
                 deferred.reject(err);
            } else {
                areq.register(evt, deferred, function (rsp) {
                    logReq('RSP <-- %s, transId: %d, status: %d', cmdIdString, reqObj.transId, rsp.status);
                    if (qnode.getStatus() !== 'sleep')
                        qnode._setStatus('online');
                        areq.resolve(evt, rsp);
                }, waitTime);

                setImmediate(function () {
                    self.mClient.publish(topic, encrypted, { qos: 1, retain: false });
                });
            }
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

MShepherd.prototype.pingReq = function (clientId, callback) {
    return this._requestSender('ping', clientId, {}, callback);
};

MShepherd.prototype.quickPingReq = function (clientId, callback) {
    return this._requestSender('quickping', clientId, {}, quickPingWaitTime, callback);
};

/*************************************************************************************************/
/*** Server Information                                                                        ***/
/*************************************************************************************************/
MShepherd.prototype.info = function () {
    return {
        name: this.clientId,
        enabled: this._enabled,
        net: _.cloneDeep(this._net),
        devNum: _.size(this._nodebox),
        startTime: this._startTime,
        joinTimeLeft: this._permitJoinTime
    };
};

MShepherd.prototype.list = function (cIds) {
    var self = this,
        foundNodes;

    if (_.isString(cIds))
        cIds = [ cIds ];
    else if (!_.isUndefined(cIds) && !_.isArray(cIds))
        throw new TypeError('cIds should be a string or an array of strings if given.');
    else if (!cIds)
        cIds = _.keys(this._nodebox);   // list all

    foundNodes = _.map(cIds, function (cid) {
        var rec,
            found = self.find(cid);

        if (found) {
            rec = found._dumpSummary();
            rec.status = found.status;
        }

        return rec; // will push undefined to foundNodes array if not found
    });

    return foundNodes;
};

MShepherd.prototype.devListMaintain = function (qnode, callback) {
    var deferred = Q.defer(),
        nodes,
        nodeIds = [],
        maintainNodes = [];

    if (_.isFunction(qnode)) {
        callback = qnode;
        qnode = undefined;
    }

    if (_.isArray(qnode))
        nodes = qnode;
    else if (qnode)
        nodes = [ qnode ];
    else
        nodes = this._nodebox;

    _.forEach(nodes, function (qn) {
        nodeIds.push(qn.clientId);
        maintainNodes.push(qn.maintain());
    });

    Q.allSettled(maintainNodes).then(function (resArr) {
        return _.map(resArr, function (r, i) {
            return {
                clientId: nodeIds[i],
                result: r.state === 'fulfilled' ? true : false
            };
        });
    }).done(deferred.resolve, deferred.reject);

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/
function permitJoin(time) {
    var self = this;

    if (!_.isNil(time) && !_.isNumber(time))
        throw new TypeError('time should be a number if given.');

    if (!this._enabled) {
        this._permitJoinTime = 0;
        return false;
    }

    time = time || 0;
    this._permitJoinTime = Math.floor(time);

    if (!time) { 
        this._joinable = false;
        this._permitJoinTime = 0;

        this.emit('permitJoining', this._permitJoinTime);
        if (this._permitJoinCountdown) {
            clearInterval(this._permitJoinCountdown);
            this._permitJoinCountdown = null;
        }
        return true;
    }

    this._joinable = true;
    this.emit('permitJoining', this._permitJoinTime);

    this._permitJoinCountdown = setInterval(function () {
        self._permitJoinTime -= 1;

        if (self._permitJoinTime === 0) {
            self._joinable = false;
            clearInterval(self._permitJoinCountdown);
            self._permitJoinCountdown = null;
        }

        self.emit('permitJoining', self._permitJoinTime);
    }, 1000);

    return true;
};

function _bridgeEvents(shepherd) {
    shepherd.on('ind:incoming', function (qnode) {
        shepherd.emit('ind', { type: 'devIncoming', qnode: qnode, data: undefined });
    });

    shepherd.on('ind:leaving', function (clientId, macAddr) {
        shepherd.emit('ind', { type: 'devLeaving', qnode: clientId, data: macAddr });
    });

    shepherd.on('ind:updated', function (qnode, diff) {
        shepherd.emit('ind', { type: 'devUpdate', qnode: qnode, data: diff });
    });


    shepherd.on('ind:status', function (qnode, status) {
        shepherd.emit('ind', { type: 'devStatus', qnode: qnode, data: status });
    });

    shepherd.on('ind:checkin', function (qnode) {
        shepherd.emit('ind', { type: 'devCheckin', qnode: qnode, data: undefined });
    });

    shepherd.on('ind:checkout', function (qnode) {
        shepherd.emit('ind', { type: 'devCheckout', qnode: qnode, data: undefined });
    });

    shepherd.on('ind:notified', function (qnode, msg) {
        var notifData = {
            oid: msg.oid,
            iid: msg.iid,
            rid: msg.rid,
            data: msg.data
        };

        if (_.isNil(notifData.rid))
            delete notifData.rid;

        shepherd.emit('ind', { type: 'devNotify', qnode: qnode, data: notifData });
    });

    shepherd.on('ind:changed', function (ind) {
        var qnode = shepherd.find(ind.clientId),
            notifData = {
                oid: ind.oid,
                iid: ind.iid,
                rid: ind.rid,
                data: ind.data
            };

        if (!qnode) return;

        if (_.isNil(notifData.rid))
            delete notifData.rid;

        shepherd.emit('ind', { type: 'devChange', qnode: qnode, data: notifData });
    });
}

module.exports = MShepherd;
