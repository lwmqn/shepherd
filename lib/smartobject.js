'use strict';

var _ = require('lodash'),
    Q = require('q'),
    mqdb = require('./mqdb'),
    mqUtils = require('./utils/mqutils');

function SmartObject(shepherd, clientId, devAttr, options) {
    this.shepherd = shepherd;
    this._registered = false;
    this.clientId = clientId;
    this.lifetime = devAttr.lifetime || 86400;
    this.version = devAttr.version || '';
    this.objList = devAttr.objList || {};
    this.ip = devAttr.ip || null;
    this.port = devAttr.port || null;
    this.options = options || { omna: true };

    this.lifeChecker = function () {};
}

/*************************************************************************************************/
/*** SmartObject Major Methods                                                                 ***/
/*************************************************************************************************/
SmartObject.prototype.dump = function (callback) {
    var self = this,
        excludedKeys = [ 'shepherd', '_registered', 'lifeChecker' ];

    // there are many things to report, like object, instances and their resources
    return _.filter(this, function (n, key) {
        return !_.isFunction(n) && !_.includes(excludedKeys, key);
    });
};

SmartObject.prototype.restore = function (callback) {
    var self = this,
        deferred = Q.defer();

    this.dbRead().fail(function (err) {
        deferred.reject(err);
    }).done(function (soData) {
        if (soData)
            _.assing(self, soData);

        deferred.resolve(self);
    });

    return deferred.promise.nodeify(callback);
};

SmartObject.prototype.enableLifeChecker = function () {
    var self = this;

    if (this.lifeChecker)
        clearTimeout(this.lifeChecker);

    this.lifeChecker = setTimeout(function () {
        self.shepherd.deregister(self.clientId);
    }, this.lifetime * 1000);

    return this;
};

SmartObject.prototype.disableLifeChecker = function () {
    if (this.lifeChecker) {
        clearTimeout(this.lifeChecker);
        this.lifeChecker = null;
    }

    return this;
};

/*************************************************************************************************/
/*** SmartObject Database Access Methods                                                       ***/
/*************************************************************************************************/
// database: dbSave(), dbUpdate(), dbRead(), dbClean()
SmartObject.prototype.dbRead = function (callback) {
    var deferred = Q.defer();

    mqdb.findByClientId(this.clientId).fail(function (err) {
        deferred.reject(err);
    }).done(function (soData) {
        if (_.isNull(soData))
            deferred.reject(new Error('Data of the smart object is not found'));
        else
            deferred.resolve(soData);
    });

    return deferred.promise.nodeify(callback);
};

SmartObject.prototype.dbSave = function (callback) {
    var deferred = Q.defer();

    if (!this._registered) {
        deferred.reject(new Error('smart object is not registered yet.'));
        return;
    }

    mqdb.findByClientId(this.clientId).then(function (soData) {
        if (!soData) {
            return mqdb.insert(this.dump());
        } else {
            return mqdb.remove(this.clientId).then(function () {
                return mqdb.insert(this.dump());
            });
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done(function (newSoData) {
        deferred.resolve(newSoData);
    });

    return deferred.promise.nodeify(callback);
};

SmartObject.prototype.dbClean = function (callback) {
    var deferred = Q.defer();

    mqdb.remove(this.clientId).fail(function (err) {
        deferred.reject(err);
    }).done(function (numRemoved) {
        deferred.resolve(numRemoved);
    });

    return deferred.promise.nodeify(callback);
};

// [TODO] tackle 'updated' event
SmartObject.prototype.dbUpdate = function (path, snippet, callback) {
    var deferred = Q.defer();

    if (!this._registered) {
        deferred.reject(new Error('smart object is not registered yet.'));
        return;
    }

    mqdb.modify(this.clientId, path, snippet).fail(function (err) {
        deferred.reject(err);
    }).done(function (numReplaced) {
        deferred.resolve(numReplaced);
    });

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** SmartObject Remote Request Methods                                                        ***/
/*************************************************************************************************/
SmartObject.prototype.readReq = function (path, callback) {     // path example: oid/iid/rid
    var self = this,
        deferred = Q.defer(),
        pathItems = mqUtils.returnPathItemsInArray(path),
        reqDataType = null,
        rspData = null;

    if (pathItems.length === 1)
        reqDataType = 'object';
    if (pathItems.length === 2)
        reqDataType = 'instance';
    if (pathItems.length === 3)
        reqDataType = 'resource';

    if (!reqDataType)
        deferred.reject(new Error('Bad path'));

    this.shepherd.readReq.apply(this.shepherd, mqUtils.turnPathToReqArgs(path, this.clientId)).then(function (data) {
        // [TODO]
        switch (reqDataType) {
            case 'object':
                break;
            case 'instance':
                break;
            case 'resource':
                break;
            default:
                break;
        }
    }).then(function (data) {
        rspData = data;
        return self.dbUpdate(path, data);
    }).fail(function (err) {
        deferred.reject(err);
    }).done(function () {
        deferred.resolve(rspData);
    });

    return deferred.promise.nodeify(callback);
};

SmartObject.prototype.writeReq = function (path, data, callback) {
    var deferred = Q.defer(),
        self = this,
        pathItems = mqUtils.returnPathItemsInArray(path),
        reqDataType = null;

    if (pathItems.length === 1)
        reqDataType = 'object';
    if (pathItems.length === 2)
        reqDataType = 'instance';
    if (pathItems.length === 3)
        reqDataType = 'resource';

    if (!reqDataType)
        deferred.reject(new Error('Bad path'));

    this.shepherd.writeReq.apply(this.shepherd, mqUtils.turnPathToReqArgs(path, this.clientId, data)).then(function (rsp) {
        self.readReq(path).done();  // Asynchronously read and automatically update
        return rsp;
    }).fail(function (err) {
        deferred.reject(err);
    }).done(function (rsp) {
        deferred.resolve(rsp);
    });

    return deferred.promise.nodeify(callback);
};

SmartObject.prototype.discoverReq = function (path, callback) {
    return this.shepherd.discoverReq.apply(this.shepherd, mqUtils.turnPathToReqArgs(path, this.clientId, callback));
};

SmartObject.prototype.writeAttrsReq = function (path, attrs, callback) {
    return this.shepherd.writeAttrsReq.apply(this.shepherd, mqUtils.turnPathToReqArgs(path, this.clientId, attrs, callback));
};

SmartObject.prototype.executeReq = function (path, callback) {
    return this.shepherd.executeReq.apply(this.shepherd, mqUtils.turnPathToReqArgs(path, this.clientId, callback));
};

SmartObject.prototype.observeReq = function (path, callback) {
    return this.shepherd.observeReq.apply(this.shepherd, mqUtils.turnPathToReqArgs(path, this.clientId, callback));
};

/*************************************************************************************************/
/*** SmartObject Filling Up Methods                                                            ***/
/*************************************************************************************************/
SmartObject.prototype.addObjects = function (smObj) {
    // smObj = { oid1: { iid1: [rObjs], iid2: [rObjs] }, oid2: { iid: [rObjs] } };
    if (!_.isPlainObject(smObj)) throw new Error('Invalid Object');

    var self = this;

    _.forEach(smObj, function (iObj, oid) {
        var oidStr = mqUtils.lookupOidString(oid);

        oidStr = oidStr ? oidStr : oid;
        self[oidStr] = self[oidStr] || {};

        self.addInstances(oid, iObj);
    });

    return this;
};

SmartObject.prototype.addInstances = function (oid, iObj) {
    // iObj = { iid1: [ rObjs ], iid2: [rObjs] };
    if (!_.isPlainObject(iObj)) throw new Error('Invalid Object Instances');

    var self = this,
        oidStr = mqUtils.lookupOidString(oid);

    oidStr = oidStr ? oidStr : oid;
    this[oidStr] = this[oidStr] || {};

    _.forEach(iObj, function (rObjs, iid) {
        self.addResources(oid, iid, rObjs);
    });

    return this;
};

SmartObject.prototype.addResources = function (oid, iid, rObjs) {
    // rObjs = [ { rid, riid, value }, ... ]
    if (_.isPlainObject(rObjs)) rObjs = [ rObjs ];
    if (!_.isArray(rObjs)) throw new Error('Invalid rObjs');

    var self = this,
        oidStr = mqUtils.lookupOidString(oid);

    oidStr = oidStr ? oidStr : oid;
    this[oidStr] = this[oidStr] || {};
    this[oidStr][iid] = this[oidStr][iid] || {};

    _.forEach(rObjs, function (r, idx) {
        if (_.isUndefined(r.rid)) throw new Error('Resource id should be given');
        var ridStr = mqUtils.lookupRidString(r.rid);

        ridStr = ridStr ? ridStr : r.rid;

        if (_.isUndefined(r.riid) || _.isNull(r.riid)) {
            this[oidStr][iid][ridStr] = r.value;
        } else {
            this[oidStr][iid][ridStr] = this[oidStr][iid][ridStr] || {};
            this[oidStr][iid][ridStr][r.riid] = r.value;
        }
    });

    return this;
};

module.exports = SmartObject;
