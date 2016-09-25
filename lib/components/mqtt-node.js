'use strict';

var Q = require('q'),
    _ = require('busyman'),
    mutils = require('./mutils'),
    SmartObject = require('./smartobject');

function MqttNode(shepherd, clientId, devAttr) {
    // no need to do type check, since new MqttNode is internal operation
    devAttr = devAttr || {};

    if (!_.isObject(shepherd) || _.isArray(shepherd) )
        throw new TypeError('shepherd should be an object');
    else if (!_.isString(clientId))
        throw new TypeError('clientId should be a string');
    else if (!_.isPlainObject(devAttr))
        throw new TypeError('devAttr should be an object');

    this.shepherd = shepherd;
    this._registered = false;
    this.status = 'offline';
    this.lifeChecker = null;
    this.sleepChecker = null;

    this._CheckinMargin = 2000;
    this._lastCheckin = 0;
    this._nextCheckin = 0;

    /**** These properties will be dumped to database ****/
    this.clientId = clientId;
    this.joinTime = Math.floor(Date.now()/1000);
    this.so = new SmartObject();
    this.lifetime = devAttr.lifetime || 86400;
    this.ip = devAttr.ip || 'unknown';
    this.mac = devAttr.mac || 'unknown';
    this.version = devAttr.version || '';
    this.objList = devAttr.objList || {};
    /*****************************************************/
}

/*************************************************************************************************/
/*** MqttNode Major Methods                                                                    ***/
/*************************************************************************************************/
MqttNode.prototype.getMqdb = function () {
    return this.shepherd ? this.shepherd._mqdb : undefined;
};

MqttNode.prototype.dump = function () {
    var self = this,
        dumped = {},
        includedKeys = [ 'clientId', 'joinTime', 'so', 'lifetime', 'ip', 'mac', 'version', 'objList' ];

    this.so = this.so || new SmartObject();

    _.forEach(includedKeys, function (nKey) {
        dumped[nKey] = (nKey === 'so') ? self.so.dumpSync() : _.cloneDeep(self[nKey]);
    });

    return dumped;
};

MqttNode.prototype.enableLifeChecker = function () {
    var self = this;

    if (this.lifeChecker)
        clearTimeout(this.lifeChecker);

    this.lifeChecker = setTimeout(function () {
        self.shepherd.remove(self.clientId).done();
    }, this.lifetime * 1000);

    return this;
};

MqttNode.prototype.disableLifeChecker = function () {
    if (this.lifeChecker) {
        clearTimeout(this.lifeChecker);
        this.lifeChecker = null;
    }
    return this;
};

MqttNode.prototype.enableSleepChecker = function (duration) {
    var self = this,
        times = 4,
        duMs = duration * 1000,
        checkTime = duMs + 500;

    function setSleepChecker(nextTimeout) {
        if (self.sleepChecker)
            clearTimeout(self.sleepChecker);

        self.sleepChecker = setTimeout(function () {
            var isCheckinRecently = ((_.now() - self._lastCheckin) <= self._CheckinMargin);

            if (self.getStatus() !== 'sleep' || isCheckinRecently)
                return;

            // if still sleep, start checking if it is offline by 4 times
            times -= 1;
            self.quickPingReq().then(function (rsp) {
                if (rsp.status === 408) {
                    // set it to offline if no response after 4 times of timeout
                    if (time === 0) {
                        self.sleepChecker = null;
                        self._setStatus('offline');
                    } else {
                        setSleepChecker(500);
                    }
                } else {
                    clearTimeout(self.sleepChecker);
                    self.sleepChecker = null;
                }
            }).fail(function (err) {
                console.log(err);
            }).done();
        }, nextTimeout);
    }

    setSleepChecker(checkTime);
    return this;
};


MqttNode.prototype.disableSleepChecker = function () {
    if (this.sleepChecker) {
        clearTimeout(this.sleepChecker);
        this.sleepChecker = null;
    }
    return this;
};

MqttNode.prototype.restore = function (callback) {
    var self = this;

    return this.dbRead().then(function (ndata) {
        if (!ndata)
            throw new Error('No data in database.');

        self.lifetime = ndata.lifetime || self.lifetime;
        self.ip = ndata.ip || self.ip;
        self.mac = ndata.mac || self.mac;
        self.version = ndata.version || self.version;
        self.objList = ndata.objList || self.objList;
        self.joinTime = ndata.joinTime || self.joinTime;

        self.so.addObjects(ndata.so);
        self._registered = true;
    }).nodeify(callback);
};

/*************************************************************************************************/
/*** MqttNode Database Access Methods                                                       ***/
/*************************************************************************************************/
MqttNode.prototype.dbRead = function (callback) {
    var self = this;

    return Q.fcall(function () {
        return self.getMqdb();
    }).then(function (mqdb) {
        if (!mqdb)
            throw new Error('No datastore.');
        return mqdb.findByClientId(self.clientId);
    }).then(function (ndata) {
        if (!ndata)
            throw new Error('mqtt-node data not found');
        return ndata;
    }).nodeify(callback);
};

MqttNode.prototype.dbSave = function (callback) {
    var self = this,
        mqdb;

    return Q.fcall(function () {
        return self.getMqdb();
    }).then(function (db) {
        if (!db)
            throw new Error('No datastore.');
         mqdb = db;
        return mqdb.findByClientIdWith_id(self.clientId);
    }).then(function (ndata) {
        if (!ndata) {
            return mqdb.insert(self.dump());
        } else {
            return self.dbRemove().then(function () {
                var nodeData = _.assign(self.dump(), { _id: ndata._id });
                return mqdb.insert(nodeData);
            });
        }
    }).nodeify(callback);
};

MqttNode.prototype.dbRemove = function (callback) {
    var self = this;

    return Q.fcall(function () {
        return self.getMqdb();
    }).then(function (mqdb) {
        if (!mqdb)
            throw new Error('No datastore.');
        return mqdb.removeByClientId(self.clientId).then(function () {
            return self.clientId;
        });
    }).nodeify(callback);
};

MqttNode.prototype.replaceObjectInstance = function (oid, iid, data, callback) {
    var self = this,
        deferred = Q.defer(),
        mqdb = this.getMqdb(),
        path,
        dotPath;

    Q.fcall(function () {
        var chkErr = _noShepherdOrSoError(self);
        var iObj = self.so.acquire(oid, iid);

        path = mutils.createPath('/', 'so', oid, iid);
        dotPath = mutils.createPath('.', 'so', oid, iid);

        if (!iObj)
            chkErr = chkErr || new Error('No such oid or iid to update.');
        else if (!mqdb)
            chkErr = chkErr || new Error('No database. Is shepherd ready?');
        else if (!_.isPlainObject(data))
            chkErr = chkErr || new TypeError('data to update should be an object.');

        if (chkErr)
            throw chkErr;
    }).then(function () {
        return mqdb.replace(self.clientId, path, data).then(function () {
            self.so.init(oid, iid, data);
            return data;
        });
    }).done(deferred.resolve, deferred.reject);

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.updateObjectInstance = function (oid, iid, data, callback) {
    var self = this,
        deferred = Q.defer(),
        mqdb = this.getMqdb(),
        path,
        dotPath;

    Q.fcall(function () {
        var chkErr = _noShepherdOrSoError(self);
        var iObj = self.so.acquire(oid, iid);

        oid = mutils.oidKey(oid);
        path = mutils.createPath('/', 'so', oid, iid);
        dotPath = mutils.createPath('.', 'so', oid, iid);

        if (!iObj)
            chkErr = chkErr || new Error('No such oid or iid to update.');
        else if (!mqdb)
            chkErr = chkErr || new Error('No database. Is shepherd ready?');
        else if (!_.isPlainObject(data))
            chkErr = chkErr || new TypeError('data to update should be an object.');

        if (chkErr)
            throw chkErr;
        else
            return mutils.objectInstanceDiff(iObj, data);
    }).then(function (diff) {
        if (_.isEmpty(diff)) {
            return diff;
        } else {
            return mqdb.modify(self.clientId, path, data).then(function (delta) {
                var target = _.get(self, dotPath);
                if (target)
                    _.merge(target, diff);
                return diff;
            });
        }
    }).done(deferred.resolve, deferred.reject);
    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.updateResource = function (oid, iid, rid, data, callback) {
    var self = this,
        deferred = Q.defer(),
        argLength = arguments.length,
        mqdb = this.getMqdb(),
        path,
        dotPath,
        target;

    Q.fcall(function () {
        var chkErr = _noShepherdOrSoError(self),
            resrc = self.so.acquire(oid, iid, rid);

        if (argLength < 4)
            chkErr = chkErr || new Error('Bad Arguments. Data must be given.');
        else if (!mqdb)
            chkErr = chkErr || new Error('No datastore.');
        if (_.isUndefined(resrc))
            chkErr = chkErr || new Error('No such oid, iid or rid  to update.');

        if (chkErr)
            throw chkErr;

        oid = mutils.oidKey(oid);
        rid = mutils.ridKey(oid, rid);

        path = mutils.createPath('/', 'so', oid, iid, rid);
        dotPath = mutils.createPath('.', 'so', oid, iid, rid);

        target = _.get(self, dotPath);
        return mutils.resourceDiff(target, data);
    }).then(function (diff) {
        if (_.isNull(diff)) {
            return target;
        } else if (typeof target !== typeof diff) {
            return mqdb.replace(self.clientId, path, diff).then(function (num) {
                _.set(self, dotPath, diff);
                return diff;
            });
        } else if (_.isPlainObject(diff)) {
            return mqdb.modify(self.clientId, path, diff).then(function (delta) {
                _.merge(target, diff);
                 return diff;
            });
        } else {
            return mqdb.modify(self.clientId, path, diff).then(function (delta) {
                _.set(self, dotPath, diff);
                return diff;
            });
        }
    }).done(deferred.resolve, deferred.reject);

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.updateAttrs = function (attrs, callback) {
    // attrs = update_data = { clientId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt) }
    var self = this,
        deferred = Q.defer(),
        mqdb = this.getMqdb();

    Q.fcall(function () {
        var chkErr = _noShepherdOrSoError(self);

        if (!_.isPlainObject(attrs))
            chkErr = chkErr || new TypeError('attrs to update should be an object.');
        else if (!mqdb)
            chkErr = chkErr || new Error('No datastore.');

        if (chkErr)
            throw chkErr;

        return mutils.devAttrsDiff(self, attrs);
    }).then(function (diff) {
        if (_.isEmpty(diff)) {
            return diff;
        } else {
            return mqdb.modify(self.clientId, '/', diff).then(function () {
                _.forEach(diff, function (val, key) {
                    self[key] = val;
                });
                return diff;
            });
        }
    }).done(deferred.resolve, deferred.reject);

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** MqttNode Remote Request Methods                                                        ***/
/*************************************************************************************************/
MqttNode.prototype.readReq = function (path, callback) {     // path example: oid/iid/rid
    var self = this,
        result = { status: null, data: null };

    return Q.fcall(function () {
        var chkErr = _.isString(path) ? _noShepherdOrSoError(self) : new TypeError('path should be a string.');
        if (chkErr)
            throw chkErr;
        return self.shepherd.readReq.apply(self.shepherd, mutils.turnPathToReqArgs(path, self.clientId));
    }).then(function (rsp) {
        var isGoodResponse = mutils.isGoodResponse(rsp.status);
        result.status = rsp.status;
        result.data = isGoodResponse ? mutils.readDataInfo(path, rsp.data).data : rsp.data;

        return isGoodResponse ? self._checkAndUpdate(path, result.data) : 'notChecked';
    }).then(function (res) {
        return result;
    }).fail(function (err) {
        return makeTimeoutResponse(self, err);
    }).nodeify(callback);
};

MqttNode.prototype.writeReq = function (path, data, callback) {
    var self = this,
        badPath, badData, badPathOrDataErr,
        pathItems,
        reqDataType;

    try {
        pathItems = mutils.pathItems(path);
        if (pathItems.length === 1 && pathItems[0] !== '')
            reqDataType = 'object';
        if (pathItems.length === 2)
            reqDataType = 'instance';
        if (pathItems.length > 2)
            reqDataType = 'resource';

        badPath = !(reqDataType === 'object' || reqDataType === 'instance' || reqDataType === 'resource'),
        badData = (reqDataType === 'object' || reqDataType === 'instance') && !_.isObject(data);
    } catch (e) {
        badPathOrDataErr = e;
    }

    if (!badPathOrDataErr && (badPath || badData))
        badPathOrDataErr = badPath ? new Error('Bad path') : new TypeError('data should be an object.');

    return Q.fcall(function () {
        var chkErr = _.isString(path) ? _noShepherdOrSoError(self) : new TypeError('path should be a string.');
        chkErr = chkErr || badPathOrDataErr;
        if (chkErr)
            throw chkErr;
        return self.shepherd.writeReq.apply(self.shepherd, mutils.turnPathToReqArgs(path, self.clientId, data));
    }).then(function (rsp) {
        if (mutils.isGoodResponse(rsp.status)) {
            self._checkAndUpdate(path, data).then(function () {     // immediatley perform local refresh
                return self.readReq(path);                          // Secretely read again
            }).done();
        }
        return { status: rsp.status, data: rsp.data };
    }).fail(function (err) {
        return makeTimeoutResponse(self, err);
    }).nodeify(callback);
};

MqttNode.prototype.discoverReq = function (path, callback) {
    var self = this;

    return Q.fcall(function () {
        var chkErr = _.isString(path) ? _noShepherdOrSoError(self) : new TypeError('path should be a string.');
        if (chkErr)
            throw chkErr;
        return self.shepherd.discoverReq.apply(self.shepherd, mutils.turnPathToReqArgs(path, self.clientId));
    }).then(function (rsp) {
        return { status: rsp.status, data: rsp.data };
    }).fail(function (err) {
        return makeTimeoutResponse(self, err);
    }).nodeify(callback);
};

MqttNode.prototype.writeAttrsReq = function (path, attrs, callback) {
    var self = this;

    return Q.fcall(function () {
        var chkErr = _.isString(path) ? _noShepherdOrSoError(self) : new TypeError('path should be a string.');
        if (chkErr)
            throw chkErr;
        return self.shepherd.writeAttrsReq.apply(self.shepherd, mutils.turnPathToReqArgs(path, self.clientId, attrs));
    }).then(function (rsp) {
        return { status: rsp.status };
    }).fail(function (err) {
        return makeTimeoutResponse(self, err);
    }).nodeify(callback);
};

MqttNode.prototype.executeReq = function (path, args, callback) {
    var self = this;

    if (_.isFunction(args)) {
        callback = args;
        args = [];
    }
    args = !_.isArray(args) ? [ args ] : args;

    return Q.fcall(function () {
        var chkErr = _.isString(path) ? _noShepherdOrSoError(self) : new TypeError('path should be a string.');
        if (chkErr)
            throw chkErr;
        return self.shepherd.executeReq.apply(self.shepherd, mutils.turnPathToReqArgs(path, self.clientId, args));
    }).then(function (rsp) {
        return { status: rsp.status, data: rsp.data };
    }).fail(function (err) {
        return makeTimeoutResponse(self, err);
    }).nodeify(callback);
};

MqttNode.prototype.observeReq = function (path, opt, callback) {
    var self = this;

    if (_.isFunction(opt)) {
        callback = opt;
        opt = { option: 0 };    // default 0 (enable). Set to 1 to cancel reporting
    }

    opt = (opt && _.isObject(opt)) ? { option: opt.option ? 1 : 0 } : { option: 0 };

    return Q.fcall(function () {
        var chkErr = _.isString(path) ? _noShepherdOrSoError(self) : new TypeError('path should be a string.');
        if (chkErr)
            throw chkErr;
        return self.shepherd.observeReq.apply(self.shepherd, mutils.turnPathToReqArgs(path, self.clientId, opt));
    }).then(function (rsp) {
        return { status: rsp.status };
    }).fail(function (err) {
        return makeTimeoutResponse(self, err);
    }).nodeify(callback);
};

MqttNode.prototype.pingReq = function (callback) {
    var self = this,
        txTime = _.now();

    return Q.fcall(function () {
        var chkErr = _noShepherdOrSoError(self);
        if (chkErr)
            throw chkErr;
        return self.shepherd.pingReq(self.clientId);
    }).then(function (rsp) {
        return { status: 200, data: (_.now() - txTime) };
    }).fail(function (err) {
        return makeTimeoutResponse(self, err);
    }).nodeify(callback);
};

MqttNode.prototype.quickPingReq = function (callback) {
    var self = this,
        txTime = _.now();

    return Q.fcall(function () {
        var chkErr = _noShepherdOrSoError(self);
        if (chkErr)
            throw chkErr;
        return self.shepherd.quickPingReq(self.clientId);
    }).then(function (rsp) {
        return { status: 200, data: (_.now() - txTime) };
    }).fail(function (err) {
        return makeTimeoutResponse(self, err);
    }).nodeify(callback);
};

MqttNode.prototype.maintain = function (callback) {
    // objList = { oid1: [ iid1, iid2 ], oid2: [ iid3, iid4, iid5 ] }
    if (!_.isUndefined(callback) && !_.isFunction(callback))
        throw new TypeError('Callback should be a function if given.');

    var self = this,
        deferred = Q.defer(),
        readAllProms = [];

    return this.quickPingReq().then(function (rsp) {
        if (rsp.status === 408) {
            if  (self.getStatus() !== 'sleep')
                self._setStatus('offline');
            throw new Error('qnode maybe sleep or offline, maintenance failed.');
        }

        _.forEach(self.objList, function (iids, oid) {
            _.forEach(iids, function (iid) {
                var path = mutils.createPath('/', oid, iid);
                readAllProms.push(self.readReq(path));  // readReq will update the database
            });
        });
        return Q.all(readAllProms);
    }).then(function (rsps) {
        var anyTimeout = false;

        _.forEach(rsps, function (rsp) {
            anyTimeout = anyTimeout || (rsp.status === 408);
        });

        if (anyTimeout) {
            if  (self.getStatus() !== 'sleep')
                self._setStatus('offline');
            throw new Error('Timeout. Maintenance failed.');
        }
        return _.now();
    }).done(deferred.resolve, deferred.reject);

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Protected Methods                                                                         ***/
/*************************************************************************************************/
MqttNode.prototype.getStatus = function () {
    return this.status;
};

MqttNode.prototype._setStatus = function (status) {
    var shepherd = this.shepherd;

    if (this.getStatus() !== status) {
        this.status = status;
        shepherd.emit('ind:status', this, this.getStatus());
    }
};

MqttNode.prototype._checkAndUpdate = function (path, data, callback) {
    var self = this,
        deferred = Q.defer(),
        iObjsUpdater = [],
        updateFinalizer,
        iidArray = [],
        readInfo = mutils.readDataInfo(path, data),     // { type, oid, iid, rid, data }
        reqDataType = readInfo.type,
        oidkey = readInfo.oid,
        iidkey = readInfo.iid,
        ridkey = readInfo.rid,
        keyPathItems = [],
        oldVal;

    if (this._registered === false) {
        deferred.reject(new Error('node registering not done yet'));
        return deferred.promise.nodeify(callback);
    }

    if (!_.isNil(oidkey))
        keyPathItems.push(oidkey);

    if (!_.isNil(iidkey))
        keyPathItems.push(iidkey);

    if (!_.isNil(ridkey))
        keyPathItems.push(ridkey);

    data = readInfo.data;
    oldVal = _.get(self.so, keyPathItems);

    updateFinalizer = function (err, result) {
        var ind = {
            clientId: self.clientId,
            type: reqDataType,
            oid: readInfo.oid,
            iid: readInfo.iid,
            rid: readInfo.rid,
            data: result
        };

        if (err) {
            deferred.reject(err);
        } else {
            // notify_data = { clientId, oid, iid, rid, data }  oid: oid, iid: iid, rid: rid
            if (reqDataType === 'object') {
                _.forEach(result, function (instDiff, iid) {
                    if (_.isEmpty(instDiff))
                        delete result[iid];
                });
            }

            if (reqDataType === 'resource' && oldVal !== result) 
                self.shepherd.emit('ind:changed', ind);
            else if (!_.isEmpty(result))
                self.shepherd.emit('ind:changed', ind);

            deferred.resolve(result);
        }
    };

    if (!reqDataType) {
        deferred.reject(new Error('Bad path'));
    } else {
        switch (reqDataType) {
            case 'object':
                _.forEach(data, function (iobj, iid) {
                    iObjsUpdater.push(self.updateObjectInstance(oidkey, iid, iobj));
                    iidArray.push(iid);
                });

                Q.all(iObjsUpdater).done(function (resArray) {
                    var resultObj = {};
                    _.forEach(resArray, function (res, idx) {
                        resultObj[iidArray[idx]] = res;
                    });

                    updateFinalizer(null, resultObj);
                }, function (err) {
                    updateFinalizer(err, null);
                });
                break;
            case 'instance':
                this.updateObjectInstance(oidkey, iidkey, data).done(function (res) {
                    updateFinalizer(null, res);
                }, function (err) {
                    updateFinalizer(err, null);
                });
                break;
            case 'resource':
                this.updateResource(oidkey, iidkey, ridkey, data).done(function (res) {
                    updateFinalizer(null, res);
                }, function (err) {
                    updateFinalizer(err, null);
                });
                break;
            default:
                break;
        }
    }
    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/
function _noShepherdOrSoError(node) {
    if (!node.shepherd)
        return new Error('This node did not register to the mqtt-shepherd.');
    else if (!node._registered)
        return new Error('This node was deregistered.');
    else if (!(node.so instanceof SmartObject))
        return new Error('No smart object bound to this node.');
    else
        return null;
}

function makeTimeoutResponse(qnode, err) {
    if (!mutils.isTimeout(err))
        throw err;

    if (qnode.getStatus() !== 'sleep')
        qnode._setStatus('offline');

    return { status: 408 }; // timeout
}

module.exports = MqttNode;
