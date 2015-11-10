'use strict';

var _ = require('lodash'),
    mqdb = require('./mqdb'),
    MDEFS = require('./defs/mdefs'),
    OID = MDEFS.OID,
    RID = MDEFS.RID,
    RSPCODE = MDEFS.RSPCODE;

function SmartObject(shepherd, clientId, devAttr) {
    this.shepherd = shepherd;
    this.registered = false;
    this.clientId = clientId;
    this.lifetime = devAttr.lifetime || 86400;
    this.version = devAttr.version || '';
    this.objList = devAttr.objList || {};
}

// ok
SmartObject.prototype.dump = function (callback) {
    var excludeKeys = [ 'shepherd', 'registered', 'objList' ],
        exportData;
    // there are many things to report, like object, instances and their resources
    return _.filter(this, function (n, key) {
        return !_.isFunction(n) && !_.includes(excludeKeys, key);
    });
};

SmartObject.prototype.save = function (callback) {
    if (!this.registered) {
        process.nextTick(function () {
            callback(new Error('smart object is not registered yet.'), null);
        });
    } else {
        mqdb.insert(this.dump());
    }
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

// ok
SmartObject.prototype.enableLifeCheck = function () {
    var self = this;

    if (this.lifechecker) {
        clearTimeout(this.lifechecker);
    }

    this.lifechecker = setTimeout(function () {
        self.shepherd.deregister(self.clientId);
    }, this.lifetime*1000);
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
