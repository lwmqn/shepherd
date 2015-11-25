'use strict';

var _ = require('lodash'),
    MDEFS = require('./defs/mdefs');

function SmartObject(name) {
    this.name = name || 'smart_object';
    this.node = null;
}

SmartObject.prototype.dump = function (callback) {
    var self = this,
        dumped = {};

    _.forEach(this, function (n, key) {
        if (key !== 'node' && !_.isFunction(n))
            dumped[key] = n;
    });

    return _.cloneDeep(dumped);
};

SmartObject.prototype.addObjects = function (smObj) {
    // smObj = { oid1: { iid1: rObjs, iid2: rObjs }, oid2: { iid: rObjs } };
    if (!_.isPlainObject(smObj)) throw new Error('Invalid Object');

    var self = this;

    _.forEach(smObj, function (iObj, oid) {
        var oidKey =  MDEFS.getOidString(oid);

        oidKey = _.isUndefined(oidKey) ? oid : oidKey;
        self[oidKey] = self[oidKey] || {};

        self.addIObject(oid, iObj);
    });

    return this;
};

SmartObject.prototype.addIObject = function (oid, iObj) {
    // iObj = { iid1: [ rObjs ], iid2: [rObjs] }, or { iid1: rObj, iid2: rObj }
    if (!_.isPlainObject(iObj)) throw new Error('Instance should be an object.');

    var self = this,
        oidKey =  MDEFS.getOidString(oid);

    oidKey = _.isUndefined(oidKey) ? oid : oidKey;

    this[oidKey] = this[oidKey] || {};

    _.forEach(iObj, function (rObjs, iid) {
        self.addResources(oid, iid, rObjs);
    });

    return this;
};

SmartObject.prototype.addResources = function (oid, iid, rObjs) {
    // rObjs = [ { rid: value }, ... ] or { rid1: value, rid2: vaule, ... }
    if (_.isPlainObject(rObjs))
        rObjs = [ rObjs ];

    if (!_.isArray(rObjs))
        throw new Error('Invalid rObjs');

    var self = this,
        oidKey = MDEFS.getOidString(oid),
        iobj;

    oidKey = _.isUndefined(oidKey) ? oid : oidKey;
    iid = iid || 0;

    this[oidKey] = this[oidKey] || {};
    iobj = this[oidKey][iid] = this[oidKey][iid] || {};

    rObjs.forEach(function (robj) {
        _.forEach(robj, function (rval, rkey) {
            var ridKey;

            if (!_.isNumber(rkey) && !_.isString(rkey))
                throw new TypeError('rid should be a number or a string');

            ridKey = MDEFS.getRidKey(oid, rkey);
            ridKey = _.isUndefined(ridKey) ? rkey : ridKey;
            iobj[ridKey] = rval;
        });
    });

    return this;
};

module.exports = SmartObject;
