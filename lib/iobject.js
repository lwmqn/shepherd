'use strict';

var _ = require('lodash'),
    MDEFS = require('./defs/mdefs');

function IObject(oid, ridSets) {   // [ { rid: value }, { rid: value } ]
    var self = this,
        oidKey = MDEFS.getOidKey(oid);

    this.oid = _.isUndefined(oidKey) ? oid : oidKey;

    if (!_.isArray(ridSets))
        ridSets = [ ridSets ];

    ridSets.forEach(function (rset) {
        _.forEach(rset, function (rval, rkey) {
            var ridKey;

            if (!_.isNumber(rkey) && !_.isString(rkey))
                throw new TypeError('rid should be a number or a string');

            ridKey = MDEFS.getRidKey(oid, rkey);
            ridKey = _.isUndefined(ridKey) ? rkey : ridKey;
            self[ridKey] = rval;
        });
    });
}

IObject.prototype.dump = function () {  // dump data is orginized with ids in number
    var self = this,
        excludeKeys = [ 'oid', 'iid', 'owner' ],
        dumped = {};

    _.forOwn(this, function (n, k) {
        var ridNum;
        if (!_.isFunction(n) && k !== 'oid') {
            ridNum = MDEFS.getRidNumber(self.oid, k);
            ridNum = _.isUndefined(ridNum) ? k : ridNum;

            dumped[ridNum] = self.readResrc(k);
        }
    });

    return dumped;
};

module.exports = IObject;
