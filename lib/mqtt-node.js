/*jslint node: true */
'use strict';

var Q = require('q'),
    _ = require('lodash');

var mqdb = require('./mqdb'),
    mutils = require('./mutils'),
    SmartObject = require('./smartobject');

var debug = require('debug'),
    ERR = debug('err');

function MqttNode(shepherd, clientId, devAttr) {
    // no need for type check, since new MqttNode is internal operation
    // if (!_.isObject(shepherd) || _.isArray(shepherd))
    //     throw new Error('shepherd should be an instance of MShepherd class');

    // if (!_.isString(clientId) && !_.isNumber(clientId))
    //     throw new Error('clientId should be a string or a number');

    devAttr = devAttr || {};

    if (!_.isPlainObject(devAttr))
        throw new Error('devAttr should be an object');

    /**** will not be dumped to database ****/
    this.shepherd = shepherd;
    this._registered = false;
    this.status = 'offline';
    this.lifeChecker = null;
    /****************************************/

    this.clientId = clientId;
    this.joinTime = Date.now();
    this.so = null;     // smart object

    this.lifetime = devAttr.lifetime || 86400;
    this.ip = devAttr.ip || 'unknown';
    this.mac = devAttr.mac || 'unknown';
    this.version = devAttr.version || '';
    this.objList = devAttr.objList || {};
}

MqttNode.SmartObject = SmartObject;     // SmartObject Class

/*************************************************************************************************/
/*** MqttNode Major Methods                                                                    ***/
/*************************************************************************************************/
MqttNode.prototype.bindSo = function (so) {
    if (!(so instanceof SmartObject))
        throw new TypeError('so should be an instance of SmartObject');

    so.node = this;
    this.so = so;
    return this;
};

MqttNode.prototype.dump = function () {
    var self = this,
        deferred = Q.defer(),
        excludedKeys = [ 'shepherd', '_registered', 'lifeChecker', 'status' ],
        dumped = {};

    if (!this.so)
        throw new Error('No smart object bound to this node.');

    _.forOwn(this, function (n , key) {
        if (!_.isFunction(n) && !_.includes(excludedKeys, key)) {
            if (key ==='so')
                dumped[key] = self.so.dump();
            else if (_.isObject(n))
                dumped[key] = _.cloneDeep(n);
            else
                dumped[key] = n;
        }
    });

    return dumped;
};

MqttNode.prototype.restore = function (callback) {
    var self = this,
        recoveredSo,
        deferred = Q.defer();

    this.dbRead().then(function (ndata) {
        if (ndata) {
            self.lifetime = ndata.lifetime || self.lifetime;
            self.ip = ndata.ip || self.ip;
            self.mac = ndata.mac || self.mac;
            self.version = ndata.version || self.version;
            self.objList = ndata.objList || self.objList;
            self.joinTime = ndata.joinTime || self.joinTime;

            recoveredSo = new SmartObject(ndata.so.name);   // Deprecated argument: ndata.so.name
            _.merge(recoveredSo, ndata.so);

            self.bindSo(recoveredSo);
            self._registered = true;
            deferred.resolve(self);
        } else {
            deferred.reject(new Error('No data in database.'));
        }
    }).fail(function (err) {
        ERR(err);
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.enableLifeChecker = function () {
    var self = this;

    if (this.lifeChecker)
        clearTimeout(this.lifeChecker);

    this.lifeChecker = setTimeout(function () {
        self.shepherd.deregisterNode(self.clientId);
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

/*************************************************************************************************/
/*** MqttNode Database Access Methods                                                       ***/
/*************************************************************************************************/
// database: dbSave(), dbRead(), dbRemove()      Deprecated: dbUpdate()
MqttNode.prototype.dbRead = function (callback) {
    var deferred = Q.defer();

    mqdb.findByClientId(this.clientId).done(function (ndata) {
        if (!ndata)
            deferred.reject(new Error('mqtt-node data not found'));
        else
            deferred.resolve(ndata);
    }, function (err) {
        ERR(err);
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.dbSave = function (callback) {
    var self = this,
        deferred = Q.defer();

    mqdb.findByClientIdWith_id(this.clientId).then(function (ndata) {
        if (!ndata) {
            return mqdb.insert(self.dump());
        } else {
            return self.dbRemove().then(function () {
                var nodeData = _.assign(self.dump(), { _id: ndata._id });
                return mqdb.insert(nodeData);
            });
        }
    }).done(function (savedNdata) {
        deferred.resolve(savedNdata);
    }, function (err) {
        ERR(err);
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.dbRemove = function (callback) {
    return  mqdb.removeByClientId(this.clientId, callback);
};

MqttNode.prototype.getRootObject = function (oid) {
    if (! (this.so instanceof SmartObject))
        throw new Error('No smart object bound to this node.');

    var oidKey = mutils.oidKey(oid);

    return this.so[oidKey];
};

MqttNode.prototype.getIObject = function (oid, iid) {
    var rootObj = this.getRootObject(oid);

    if (!_.isNumber(iid) && !_.isString(iid) )
        throw new TypeError('iid should be a number or a string.');

    return rootObj ? rootObj[iid] : undefined;
};

MqttNode.prototype.getResource = function (oid, iid, rid) {
    var iObj = this.getIObject(oid, iid),
        ridKey = mutils.ridKey(oid, rid);

    if (!_.isNumber(rid) && !_.isString(rid) )
        throw new TypeError('rid should be a number or a string.');

    return iObj ? iObj[ridKey] : undefined;
};

MqttNode.prototype.replaceObjectInstance = function (oid, iid, data, callback) {
    var self = this,
        deferred = Q.defer(),
        path = mutils.createPath('/', 'so', oid, iid),
        dotPath = mutils.createPath('.', 'so', oid, iid),
        iObj,
        chkErr = _noShepherdOrSoError(this);

    try {
        iObj = this.getIObject(oid, iid);
        if (!iObj)
            chkErr = new Error('No such oid or iid to update.');
    } catch (e) {
        chkErr = e;
    }
        
    if (!_.isPlainObject(data))
        chkErr = chkErr || new TypeError('data to update should be an object.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        mqdb.replace(this.clientId, path, data).done(function () {
            _.set(self, dotPath, data);
            deferred.resolve(data);
        }, function (err) {
            ERR(err);
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.updateObjectInstance = function (oid, iid, data, callback) {
    var self = this,
        deferred = Q.defer(),
        path,
        dotPath,
        diff,
        iObj,
        chkErr = _noShepherdOrSoError(this);

    try {
        iObj = this.getIObject(oid, iid);
        if (!iObj) {
            chkErr = new Error('No such oid or iid to update.');
        }

        diff = mutils.objectInstanceDiff(iObj, data);
    } catch (e) {
        chkErr = e;
    }

    if (!_.isPlainObject(data))
        chkErr = chkErr || new TypeError('data to update should be an object.');

    oid = mutils.oidKey(oid);

    path = mutils.createPath('/', 'so', oid, iid);
    dotPath = mutils.createPath('.', 'so', oid, iid);

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        if (!_.isEmpty(diff)) {
            mqdb.modify(this.clientId, path, data).done(function (delta) {
                var target = _.get(self, dotPath);
                if (target)
                    _.merge(target, diff);

                deferred.resolve(diff);
            }, function (err) {
                ERR(err);
                deferred.reject(err);
            });
        } else {
            deferred.resolve(diff);
        }
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.updateResource = function (oid, iid, rid, data, callback) {
    var self = this,
        deferred = Q.defer(),
        path,
        dotPath,
        resrc,
        target,
        diff,
        chkErr = _noShepherdOrSoError(this);

    if (arguments.length < 4)
        chkErr = chkErr || new Error('Bad Arguments. Data must be given.');

    try {
        resrc = this.getResource(oid, iid, rid);
        if (_.isUndefined(resrc))
            chkErr = chkErr || new Error('No such oid, iid or rid  to update.');
    } catch (e) {
        chkErr = chkErr || e;
    }

    oid = mutils.oidKey(oid);
    rid = mutils.ridKey(oid, rid);

    path = mutils.createPath('/', 'so', oid, iid, rid);
    dotPath = mutils.createPath('.', 'so', oid, iid, rid);

    function rejectTheResult (err) {
        ERR(err);
        deferred.reject(err);
    }

    target = _.get(this, dotPath);

    try {
        diff = mutils.resourceDiff(target, data);
    } catch (e) {
        chkErr = chkErr || e;
    }

    if (chkErr) {
        deferred.reject(chkErr);
    } else if (_.isNull(diff)) {
        deferred.resolve(target);
    } else if (typeof target !== typeof diff) {
        mqdb.replace(this.clientId, path, diff).done(function (num) {
            _.set(self, dotPath, diff);
            deferred.resolve(diff);
        }, rejectTheResult);
    } else if (_.isPlainObject(diff)) {
        mqdb.modify(this.clientId, path, diff).done(function (delta) {
            _.merge(target, diff);
            deferred.resolve(diff);
        }, rejectTheResult);
    } else {
        mqdb.modify(this.clientId, path, diff).done(function (delta) {
            _.set(self, dotPath, diff);
            deferred.resolve(diff);
        }, rejectTheResult);
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.updateAttrs = function (attrs, callback) {
    // attrs = update_data = { clientId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt) }
    var self = this,
        deferred = Q.defer(),
        diff,
        chkErr = _noShepherdOrSoError(this);

    if (!_.isPlainObject(attrs))
        chkErr = chkErr || new TypeError('attrs to update should be an object.');

    if (chkErr) {
        deferred.reject(chkErr);
        return deferred.promise.nodeify(callback);
    }

    try {
        diff = mutils.devAttrsDiff(this, attrs);
        if (_.isEmpty(diff)) {
            deferred.resolve(diff);
        } else {
            mqdb.modify(this.clientId, '/', diff).done(function () {
                _.forEach(diff, function (val, key) {
                    self[key] = val;
                });
                deferred.resolve(diff);
            }, function (err) {
                ERR(err);
                deferred.reject(err);
            });
        }
    } catch (e) {
        deferred.reject(e);
    }

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** MqttNode Remote Request Methods                                                        ***/
/*************************************************************************************************/
MqttNode.prototype.readReq = function (path, callback) {     // path example: oid/iid/rid
    var self = this,
        deferred = Q.defer(),
        result = {
            status: null,
            data: null
        },
        chkErr = _.isString(path) ? _noShepherdOrSoError(this) : new TypeError('path should be a string.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        this.shepherd.readReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId)).then(function (msg) {
            result.status = msg.status;
            mutils.isTimeout(msg.status, self);

            if (mutils.isGoodResponse(msg.status)) {
                result.data = mutils.readDataInfo(path, msg.data).data;
                return self._checkAndUpdate(path, result.data);
            }

            result.data = msg.data;
            return 'notChecked';
        }).done(function (res) {
            deferred.resolve(result);
        }, function (err) {
            ERR(err);
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.writeReq = function (path, data, callback) {
    var deferred = Q.defer(),
        self = this,
        pathItems,
        readyToSend = false,
        reqDataType = null,
        chkErr = _.isString(path) ? _noShepherdOrSoError(this) : new TypeError('path should be a string.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        pathItems = mutils.pathItems(path);

        if (pathItems.length === 1 && pathItems[0] !== '')
            reqDataType = 'object';
        if (pathItems.length === 2)
            reqDataType = 'instance';
        if (pathItems.length > 2)
            reqDataType = 'resource';

        switch (reqDataType) {
            case 'object':
                if (!_.isObject(data))
                    deferred.reject(new TypeError('data should be an object.'));
                else
                    readyToSend = true;

                break;
            case 'instance':
                if (!_.isObject(data))
                    deferred.reject(new TypeError('data should be an object.'));
                else
                    readyToSend = true;
                break;
            case 'resource':
                readyToSend = true;
                break;
            default:
                deferred.reject(new Error('Bad path'));
                break;
        }
    }

    if (readyToSend) {
        self.shepherd.writeReq.apply(self.shepherd, mutils.turnPathToReqArgs(path, self.clientId, data)).then(function (rsp) {
            mutils.isTimeout(rsp.status, self);
            if (mutils.isGoodResponse(rsp.status)) {
                self._checkAndUpdate(path, data).then(function () {     // immediatley perform local refresh
                    return self.readReq(path);                          // Asynchronously read again
                }).fail(function (err) {
                    ERR(err);
                }).done();
            }
            return rsp;
        }).fail(function (err) {
            ERR(err);
            deferred.reject(err);
        }).done(function (rsp) {
            deferred.resolve(rsp);
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.discoverReq = function (path, callback) {
    var self = this,
        deferred = Q.defer(),
        chkErr = _.isString(path) ? _noShepherdOrSoError(this) : new TypeError('path should be a string.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        this.shepherd.discoverReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId))
            .done(function (rsp) {
                mutils.isTimeout(rsp.status, self);
                deferred.resolve(rsp);
            }, function (err) {
                ERR(err);
                deferred.reject(err);
            });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.writeAttrsReq = function (path, attrs, callback) {
    var self = this,
        deferred = Q.defer(),
        chkErr = _.isString(path) ? _noShepherdOrSoError(this) : new TypeError('path should be a string.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        this.shepherd.writeAttrsReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId, attrs))
            .done(function (rsp) {
                mutils.isTimeout(rsp.status, self);
                deferred.resolve(rsp);
            }, function (err) {
                ERR(err);
                deferred.reject(err);
            });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.executeReq = function (path, args, callback) {
    var self = this,
        deferred = Q.defer(),
        chkErr = _.isString(path) ? _noShepherdOrSoError(this) : new TypeError('path should be a string.');

    if (_.isFunction(args)) {
        callback = args;
        args = [];
    }

    if (!_.isArray(args))
        args = [ args ];

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        this.shepherd.executeReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId, args))
            .done(function (rsp) {
                mutils.isTimeout(rsp.status, self);
                deferred.resolve(rsp);
            }, function (err) {
                ERR(err);
                deferred.reject(err);
            });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.observeReq = function (path, opt, callback) {
    var self = this,
        deferred = Q.defer(),
        chkErr = _.isString(path) ? _noShepherdOrSoError(this) : new TypeError('path should be a string.');

    if (chkErr) {
        deferred.reject(chkErr);
        return deferred.promise.nodeify(callback);
    }

    if (_.isFunction(opt)) {
        callback = opt;
        opt = null;
    }

    if (opt) {
        if (_.isObject(opt))
            opt = { option: opt.option ? 1 : 0 };
        else
            opt = { option: 1 };
    } else {
        opt = { option: 0 }; // default 0 (enable). Set to 1 to cancel reporting
    }

    this.shepherd.observeReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId, opt))
        .done(function (rsp) {
            mutils.isTimeout(rsp.status, self);
            deferred.resolve(rsp);
        }, function (err) {
            ERR(err);
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.pingReq = function (callback) {
    var self = this,
        deferred = Q.defer(),
        chkErr = _noShepherdOrSoError(this),
        txTime = Date.now();

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        this.shepherd.pingReq.apply(this.shepherd, [ this.clientId ])
            .done(function (rsp) {
                var tout = mutils.isTimeout(rsp.status, self);
                if (tout)
                    rsp.data = null;
                else
                    rsp.data = Date.now() - txTime;     // rxTime - txTime

                deferred.resolve(rsp);
            }, function (err) {
                ERR(err);
                deferred.reject(err);
            });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.maintain = function (callback) {
    // objList = { oid1: [ iid1, iid2 ], oid2: [ iid3, iid4, iid5 ] }
    var self = this,
        deferred = Q.defer(),
        readAllProms = [];

    _.forEach(this.objList, function (iids, oid) {
        _.forEach(iids, function (iid) {
            var path = mutils.createPath('/', oid, iid);
            readAllProms.push(self.readReq(path));  // readReq will update the database
        });
    });

    Q.all(readAllProms).done(function (rsps) {
        var allTimeout = true;

        _.forEach(rsps, function (rsp) {
            var rspkey = mutils.rspCodeKey(rsp.status);
            if (rspkey !== 'Timeout')
                allTimeout = false;
        });

        if (allTimeout)
            self._setStatus('offline');
            // self.status = 'offline';
        else
            self._setStatus('online');
            // self.status = 'online';

        deferred.resolve(self.so);
    }, function (err) {
        ERR(err);
        self._setStatus('offline');
        // self.status = 'offline';
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Protected Methods                                                                         ***/
/*************************************************************************************************/
MqttNode.prototype._setStatus = function (status) {
    var shepherd = this.shepherd;

    if (this.status !== status) {
        this.status = status;
        // shepherd.emit('IND:STATUS_CHANGED', this.clientId, this.status);
        shepherd.emit('ind:status', this, this.status);
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
        keyPathItems = [];


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
    var oldVal = _.get(self.so, keyPathItems);

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
            ERR(err);
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
                    ERR(err);
                    updateFinalizer(err, null);
                });
                break;
            case 'instance':
                this.updateObjectInstance(oidkey, iidkey, data).done(function (res) {
                    updateFinalizer(null, res);
                }, function (err) {
                    ERR(err);
                    updateFinalizer(err, null);
                });
                break;
            case 'resource':
                this.updateResource(oidkey, iidkey, ridkey, data).done(function (res) {
                    updateFinalizer(null, res);
                }, function (err) {
                    ERR(err);
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

module.exports = MqttNode;
