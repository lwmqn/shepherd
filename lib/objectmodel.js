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
    this.registered = false;
    this.clientId = clientId;
    this.lifetime = devAttr.lifetime || 86400;
    this.version = devAttr.version || '';
    this.objList = devAttr.objList || {};
    this.ip = devAttr.ip || null;
    this.port = devAttr.port || null;

    this.lifeChecker = null;
}

/*************************************************************************************************/
/*** SmartObject Major Methods                                                                 ***/
/*************************************************************************************************/
// ok
SmartObject.prototype.restore = function (callback) {
    var self = this,
        deferred = Q.defer();

    this.dbRead().fail(function (err) {
        deferred.reject(err);
    }).done(function (soData) {
        _.assing(self, soData);
        deferred.resolve(self);
    });

    return deferred.promise.nodeify(callback);
};

// ok
SmartObject.prototype.dump = function (callback) {
    var excludeKeys = [ 'shepherd', 'registered', 'objList' ],
        exportData;
    // there are many things to report, like object, instances and their resources
    return _.filter(this, function (n, key) {
        return !_.isFunction(n) && !_.includes(excludeKeys, key);
    });
};

// ok
SmartObject.prototype.enableLifeChecker = function () {
    var self = this;

    if (this.lifeChecker)
        clearTimeout(this.lifeChecker);

    this.lifeChecker = setTimeout(function () {
        self.shepherd.deregister(self.clientId);
    }, this.lifetime * 1000);
};

// ok
SmartObject.prototype.disableLifeChecker = function () {
    if (this.lifeChecker) {
        clearTimeout(this.lifeChecker);
        this.lifeChecker = null;
    }
};

/*************************************************************************************************/
/*** SmartObject Database Access Methods                                                       ***/
/*************************************************************************************************/
// ok
SmartObject.prototype.dbSave = function (callback) {
    var self = this,
        deferred = Q.defer();

    if (!this.registered) {
        process.nextTick(function () {
            callback(new Error('smart object is not registered yet.'), null);
        });
    } else {
        mqdb.insert(this.dump());
    }
    return deferred.promise.nodeify(callback);
};

SmartObject.prototype.update = function (path, data, callback) {
    if (!this.registered) {
        process.nextTick(function () {
            callback(new Error('smart object is not registered yet.'), null);
        });
        return;
    }

    // [TODO]
};

/*************************************************************************************************/
/*** SmartObject Remote Request Methods                                                        ***/
/*************************************************************************************************/
function turnPathToArgs(path, head, tail, addition) {
    var args;

    path = path.replace(/\./g, '/');           // tranform dot notation into slash notation
    if (path[0] === '/')                       // if the first char of topic is '/', take it off
        path = path.slice(1);

    if (path[path.length-1] === '/')          // if the last char of topic is '/', take it off
        path = path.slice(0, path.length-1);

    args = path.split('/');

    if (!_.isUndefined(head))
        args.shift(head);

    if (!_.isUndefined(tail))
        args.push(head);

    if (!_.isUndefined(addition))
        args.push(addition);

    return args;
}

SmartObject.prototype.readReq = function (path, callback) {
    var args = turnPathToArgs(path, this.clientId, callback);  // path example: oid/iid/rid

    return this.shepherd.readReq.apply(this, args);
};

SmartObject.prototype.writeReq = function (path, value, callback) {
    var args = turnPathToArgs(path, this.clientId, value, callback); 
    return this.shepherd.writeReq.apply(this, args);
};

SmartObject.prototype.writeAttrsReq = function (path, attrs, callback) {
    var args = turnPathToArgs(path, this.clientId, attrs, callback); 
    return this.shepherd.writeAttrsReq.apply(this, args);
};

SmartObject.prototype.discoverReq = function (path, callback) {
    var args = turnPathToArgs(path, this.clientId, callback); 
    return this.shepherd.discoverReq.apply(this, args);
};

SmartObject.prototype.executeReq = function (path, callback) {
    var args = turnPathToArgs(path, this.clientId, callback);
    return this.shepherd.executeReq.apply(this, args);
};

SmartObject.prototype.observeReq = function (path, callback) {
    var args = turnPathToArgs(path, this.clientId, callback);
    return this.shepherd.observeReq.apply(this, args);
};



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

// data base
SmartObject.prototype.save = function () {

};

SmartObject.prototype.modify = function () {

};

// read
SmartObject.prototype.readObject = function () {

};

SmartObject.prototype.readObjectInstance = function () {

};

SmartObject.prototype.readResource = function () {

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

module.exports = SmartObject;
