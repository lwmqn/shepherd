var MDEFS = require('./defs/mdefs'),
    OID = MDEFS.OID,
    RID = MDEFS.RID;

function SmartObject(objMdls) {
    var self = this;

    objMdls.forEach(function (mdl) {
        self.addObject(mdl.oid, mdl.resrcs);
    });
}

SmartObject.prototype.addObject = function (oid, resrcs) {
    var self = this,
        oidStr = OID.get(oid).key;

    this[oidStr] = this[oidStr] || {};

    resrcs.forEach(function (r) {
        self.addResource(oid, r);
    });
};

SmartObject.prototype.addResource = function (oid, resrc) {
    var self = this,
        oidStr = OID.get(oid),
        ridStr = RID.get(resrc.rid);

    oldStr = oldStr ? oldStr.key : null;
    ridStr = ridStr ? ridStr.key : null;

    if (oldStr === null || this[oidStr] === undefined)
        throw new Error('No such object with oid: ' + oid);

    if (ridStr === null)
        throw new Error('No such resource with rid: ' + rid);

    if (this[oidStr][ridStr] !== undefined)
        throw new Error('Resource exists, rid: ' + resrc.rid);

    this[oldStr][ridStr] = resrc.value;
};
