var _ = require('busyman'),
    SmartObject = require('smartobject');

SmartObject.prototype.addObjects = function (smObjs) {
    // smObj = { oid1: { iid1: rObjs, iid2: rObjs }, oid2: { iid: rObjs } };
    var self = this;

    if (!_.isObject(smObjs) || _.isArray(smObjs))
        throw new TypeError('Objects should be objects.');

    _.forEach(smObjs, function (iObjs, oid) {
        self.addIObjects(oid, iObjs);
    });

    return this;
};

SmartObject.prototype.addIObjects = function (oid, iObjs) {
    // iObj = { iid1: rObj, iid2: rObj }
    var self = this;

    if (!_.isObject(iObjs) || _.isArray(iObjs))
        throw new TypeError('Object Instances should be objects.');

    _.forEach(iObjs, function (rObjs, iid) {
        self.init(oid, iid, rObjs);
    });

    return this;
};

SmartObject.prototype.acquire = function (oid, iid, rid) {
    if (arguments.length === 1)
        return this.findObject(oid);
    else if (arguments.length === 2)
        return this.findObjectInstance(oid, iid);
    else if (arguments.length === 3)
        return this.get(oid, iid, rid);
    else
        return undefined;
};

module.exports = SmartObject;
