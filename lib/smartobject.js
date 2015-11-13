'use strict';

// database: dbSave(), dbUpdate(), dbRead(), dbClean()
// generic methods:
//      dump(), restore()
//      updateAttrs(), updateObjectInstance(), updateResource(),
//      enableLifeChecker(), disableLifeChecker(), restartLifeChecker(),
// request methods:
//      readObjectReq(), readObjectInstanceReq(), readResourceReq(), writeObjectInstanceReq(), writeResourceReq(),
//      writeAttrsReq(), discoverReq(), executeReq(), observeReq()


// [TODO] in updateResource()
    // if data is an array: riid
    // else data is the resource it self

var _ = require('lodash'),
    Q = require('q'),
    mqdb = require('./mqdb'),
    MDEFS = require('./defs/mdefs'),
    OID = MDEFS.OID,
    RID = MDEFS.RID,
    RSPCODE = MDEFS.RSPCODE,
    CMD = MDEFS.CMD;

function SmartObject(shepherd, clientId, devAttr) {
    this.shepherd = shepherd;
    this._registered = false;
    this.clientId = clientId;
    this.lifetime = devAttr.lifetime || 86400;
    this.version = devAttr.version || '';
    this.objList = devAttr.objList || {};
    this.ip = devAttr.ip || null;
    this.port = devAttr.port || null;

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

// [TODO]
SmartObject.prototype.restore = function (callback) {
    var self = this,
        deferred = Q.defer();

    this.dbRead().fail(function (err) {
        deferred.reject(err);
    }).done(function (soData) {
        if (soData) {
            _.assing(self, soData);
            deferred.resolve(self);
        } else {
            // run discover process
        }
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

    mqdb.findOne({ clientId: this.clientId }, function (err, doc) { // doc will be null when not found
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(doc);
    });

    return deferred.promise.nodeify(callback);
};

SmartObject.prototype.dbSave = function (callback) {
    var deferred = Q.defer();

    if (!this._registered) {
        deferred.reject(new Error('smart object is not registered yet.'));
        return;
    }

    mqdb.insert(this.dump(), function (err, newDoc) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(newDoc);
    });

    return deferred.promise.nodeify(callback);
};

SmartObject.prototype.dbClean = function (callback) {
    var deferred = Q.defer();

    mqdb.remove({ clientId: this.clientId }, { multi: true }, function (err, numRemoved) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(numRemoved);
    });

    return deferred.promise.nodeify(callback);
};

// [TODO]
SmartObject.prototype.dbUpdate = function (path, data, callback) {
    var deferred = Q.defer();

    if (!this._registered) {
        deferred.reject(new Error('smart object is not registered yet.'));
        return;
    }

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** SmartObject Remote Request Methods                                                        ***/
/*************************************************************************************************/
// [TODO]
SmartObject.prototype.readReq = function (path, callback) {     // path example: oid/iid/rid
    // return this.shepherd.readReq.apply(this.shepherd, turnPathToReqArgs(path, this.clientId, callback));
    return this.shepherd.readReq.apply(this.shepherd, turnPathToReqArgs(path, this.clientId)).then(function (data) {
        // auto update
        // callback handling
    });
};

// [TODO]
SmartObject.prototype.writeReq = function (path, data, callback) {
    // after writing, should apply auto update?
    return this.shepherd.writeReq.apply(this.shepherd, turnPathToReqArgs(path, this.clientId, data, callback));
};

SmartObject.prototype.discoverReq = function (path, callback) {
    return this.shepherd.discoverReq.apply(this.shepherd, turnPathToReqArgs(path, this.clientId, callback));
};

SmartObject.prototype.writeAttrsReq = function (path, attrs, callback) {
    return this.shepherd.writeAttrsReq.apply(this.shepherd, turnPathToReqArgs(path, this.clientId, attrs, callback));
};

SmartObject.prototype.executeReq = function (path, callback) {
    return this.shepherd.executeReq.apply(this.shepherd, turnPathToReqArgs(path, this.clientId, callback));
};

SmartObject.prototype.observeReq = function (path, callback) {
    return this.shepherd.observeReq.apply(this.shepherd, turnPathToReqArgs(path, this.clientId, callback));
};

// [TODO]
/*************************************************************************************************/
/*** SmartObject Fill Up                                                                       ***/
/*************************************************************************************************/
SmartObject.prototype.addObjects = function (oid, obj) {
    var self = this,
        oidStr,
        omnaOid = OID.get(oid);

    oidStr = _.isUndefined(omnaOid) ? oid.toString() : omnaOid.key;

    this[oidStr] = this[oidStr] || {};

    _.forEach(obj, function (inst, iid) {

    });
};

SmartObject.prototype.addInstances = function (oid, obj) {
};

SmartObject.prototype.addResources = function (oid, iid, rObj) {
    var self = this,
        oidStr = _.isString(oid) ? oid : undefined,
        ridStr = RID.get(resrc.rid);

    oldStr = oldStr ? oldStr.key : null;
    ridStr = ridStr ? ridStr.key : null;

    this[oldStr][ridStr] = resrc.value;
};

function createResource(rid, riid, value) {
    var omnaRid = RID.get(rid),
        ridStr = _.isUndefined(omnaRid) ? rid.toString() : omnaRid.key,
        r = {};

    if (arguments.length < 3) {
        value = riid;
        riid = undefined;
    }

    if (riid) {
        r[ridStr][riid] = value;
    } else {
        r[ridStr] = value;
    }
    return r;
}

/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/
function turnPathToReqArgs(path, clientId, data, callback) {
    var args,
        reqArgs = [],
        reqObj = {};

    reqArgs.push(clientId);

    path = path.replace(/\./g, '/');           // tranform dot notation into slash notation
    if (path[0] === '/')                       // if the first char of topic is '/', take it off
        path = path.slice(1);

    if (path[path.length-1] === '/')          // if the last char of topic is '/', take it off
        path = path.slice(0, path.length-1);

    args = path.split('/');

    if (args.length === 1) {
        reqObj.oid = args[0];
    } else if (args.length === 2) {
        reqObj.oid = args[0];
        reqObj.iid = args[1];
    } else if (args.length === 3) {
        reqObj.oid = args[0];
        reqObj.iid = args[1];
        reqObj.rid = args[2];
    } else {
        throw new Error('Bad path');
    }

    if (_.isFunction(data))
        callback = data;
    else
        reqObj.data = data;

    reqArgs.push(reqObj);

    if (_.isFunction(callback))
        reqArgs.push(callback);

    return reqArgs;
}

module.exports = SmartObject;
