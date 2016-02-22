'use strict';

var _ = require('lodash'),
    mutils = require('./mutils');

function SmartObject(name) {
    if (!_.isUndefined(name) && !_.isString(name))
        throw new TypeError('name should be a string.');

    this.name = name || 'smart_object';
    this.node = null;
}

SmartObject.prototype.dump = function () {
    var self = this,
        dumped = {};

    _.forEach(this, function (n, key) {
        if (key !== 'node' && !_.isFunction(n))
            dumped[key] = n;
    });

    return _.cloneDeep(dumped);
};

SmartObject.prototype.addObjects = function (smObjs) {
    // smObj = { oid1: { iid1: rObjs, iid2: rObjs }, oid2: { iid: rObjs } };
    //      or [ { oid1: { iid1: rObjs, iid2: rObjs } }, { oid2: { iid1: rObjs, iid2: rObjs } }]
    var self = this,
        so = {};

    if (!_.isPlainObject(smObjs) && !_.isArray(smObjs))
        throw new Error('Invalid Object');

    if (_.isArray(smObjs)) {
        smObjs.forEach(function (s) {
            if (_.isArray(s))
                self.addObjects(s);
            else
                so = _.assign(so, s);
        });
    } else {
        so = smObjs;
    }

    _.forEach(so, function (iObj, oid) {
        var oidKey =  mutils.oidKey(oid);

        self[oidKey] = self[oidKey] || {};
        self.addIObjects(oid, iObj);
    });

    return this;
};

SmartObject.prototype.addIObjects = function (oid, iObjs) {
    // iObj = { iid1: [rObjs], iid2: [rObjs] }, or { iid1: rObj, iid2: rObj }
    //     or [ { iid1: [rObjs] }, { iid2: [rObjs] } ]
    //     or [ { iid1: rObj }, { iid2: rObjs } ]
    var self = this,
        oidKey =  mutils.oidKey(oid),
        iobj = {};

    if (!_.isPlainObject(iObjs) && !_.isArray(iObjs))
        throw new Error('Instance should be an object.');

    if (_.isArray(iObjs)) {
        iObjs.forEach(function (obj) {
            iobj = _.assign(iobj, obj);
        });
    } else {
        iobj = iObjs;
    }

    this[oidKey] = this[oidKey] || {};

    _.forEach(iobj, function (rObjs, iid) {
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
        oidKey = mutils.oidKey(oid),
        iobj;

    iid = iid || 0;

    this[oidKey] = this[oidKey] || {};
    iobj = this[oidKey][iid] = this[oidKey][iid] || {};

    rObjs.forEach(function (robj) {
        _.forEach(robj, function (rval, rkey) {
            var ridKey;

            if (!_.isNumber(rkey) && !_.isString(rkey))
                throw new TypeError('rid should be a number or a string');

            ridKey = mutils.ridKey(oid, rkey);
            iobj[ridKey] = rval;
        });
    });

    return this;
};

module.exports = SmartObject;
