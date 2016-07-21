/*jslint node: true */
'use strict';

var util = require('util'),
    _ = require('busyman'),
    SmartObject = require('smartobject'),
    mutils = require('./mutils');

SmartObject.prototype.addObjects = function (smObjs) {
    // smObj = { oid1: { iid1: rObjs, iid2: rObjs }, oid2: { iid: rObjs } };
    var self = this;
    _.forEach(smObjs, function (iObjs, oid) {
        self.addIObjects(oid, iObjs);
    });

    return this;
};

SmartObject.prototype.addIObjects = function (oid, iObjs) {
    // iObj = { iid1: rObj, iid2: rObj }
    var self = this;

    _.forEach(iObjs, function (rObjs, iid) {
        self.init(oid, iid, rObjs);
    });

    return this;
};

module.exports = SmartObject;
