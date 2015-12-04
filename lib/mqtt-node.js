'use strict';

var _ = require('lodash'),
    Q = require('q'),
    mqdb = require('./mqdb'),
    SmartObject = require('./smartobject'),
    mutils = require('./utils/mutils');

function MqttNode(shepherd, clientId, devAttr) {
    if (!_.isObject(shepherd) || _.isArray(shepherd))
        throw new Error('shepherd should be an instance of MShepherd class');

    if (!_.isString(clientId) && !_.isNumber(clientId))
        throw new Error('clientId should be a string or a number');

    devAttr = devAttr || {};

    if (!_.isPlainObject(devAttr))
        throw new Error('devAttr should be an object');

    this.shepherd = shepherd;
    this._registered = false;
    this.status = 'offline';

    this.clientId = clientId;

    this.lifetime = devAttr.lifetime || 86400;
    this.ip = devAttr.ip || 'unknown';
    this.mac = devAttr.mac || 'unknown';
    this.version = devAttr.version || '';

    this.objList = devAttr.objList || {};
    this.so = null; // smart object

    this.lifeChecker = null;
}

MqttNode.SmartObject = SmartObject;     // SmartObject Class

/*************************************************************************************************/
/*** MqttNode Major Methods                                                                    ***/
/*************************************************************************************************/
MqttNode.prototype.bindSo = function (so) {
    if (!(so instanceof MqttNode.SmartObject))
        throw new TypeError('so should be an instance of SmartObject');

    so.node = this;
    this.so = so;
    return this;
};

MqttNode.prototype.dump = function (callback) {
    var self = this,
        excludedKeys = [ 'shepherd', '_registered', 'lifeChecker', 'status' ],
        dumped = {};

    _.forOwn(this, function (n , key) {
        if (!_.isFunction(n) && !_.includes(excludedKeys, key)) {
            if (key ==='so' && n)
                dumped[key] = n.dump();
            else
                dumped[key] = n;
        }
    });

    return _.clone(dumped);
};

MqttNode.prototype.restore = function (callback) {
    var self = this,
        newSo,
        deferred = Q.defer();

    this.dbRead().done(function (ndata) {
        var oldSo;
        if (ndata) {
            oldSo = ndata.so;
            newSo = new MqttNode.SmartObject(oldSo.name);

            _.forEach(oldSo.objList, function (iids, oid) {
                newSo.addIObject(oid, oldSo[oid]);
            });
            delete ndata.so;
            _.assign(self, ndata);
            self.hookSmartObject(newSo);
            self._registered = true;
            deferred.resolve(self);
        } else {
            deferred.reject(new Error('No data in database.'));
        }
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.enableLifeChecker = function () {
    var self = this;

    if (this.lifeChecker)
        clearTimeout(this.lifeChecker);

    this.lifeChecker = setTimeout(function () {
        self.shepherd.deregisterNode(self.clientId);
    }, this.lifetime * 1000);

    return this;
};

MqttNode.prototype.disableLifeChecker = function () {
    if (this.lifeChecker) {
        clearTimeout(this.lifeChecker);
        this.lifeChecker = null;
    }

    return this;
};

/*************************************************************************************************/
/*** MqttNode Database Access Methods                                                       ***/
/*************************************************************************************************/
// database: dbSave(), dbRead(), dbRemove()      Deprecated: dbUpdate()
MqttNode.prototype.dbRead = function (callback) {
    var deferred = Q.defer();

    mqdb.findByClientId(this.clientId).done(function (ndata) {
        if (!ndata)
            deferred.reject(new Error('mqtt-node data not found'));
        else
            deferred.resolve(ndata);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.dbSave = function (callback) {
    var self = this,
        deferred = Q.defer();

    // if (!this._registered) {
    //     deferred.reject(new Error('smart object is not registered yet.'));
    //     return;
    // }

    mqdb.findByClientId(this.clientId).then(function (ndata) {
        if (!ndata) {
            return mqdb.insert(self.dump());
        } else {
            return self.dbRemove().then(function () {
                return mqdb.insert(self.dump());
            });
        }
    }).done(function (savedNdata) {
        deferred.resolve(savedNdata);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.dbRemove = function (callback) {
    return  mqdb.removeByClientId(this.clientId, callback);
};

//----------------------------------------------------------------------------
// Deprecated
// MqttNode.prototype.dbUpdate = function (path, snippet, callback) {
//     var deferred = Q.defer();

//     if (!this._registered) {
//         deferred.reject(new Error('smart object is not registered yet.'));
//         return;
//     }

//     mqdb.modify(this.clientId, path, snippet).then(function (numReplaced) {
//         deferred.resolve(numReplaced);
//     }).fail(function (err) {
//         deferred.reject(err);
//     }).done();

//     return deferred.promise.nodeify(callback);
// };
//----------------------------------------------------------------------------
MqttNode.prototype.getRootObject = function (oid) {
    var oidKey = mutils.oidKey(oid);
    return this.so[oidKey];
};

MqttNode.prototype.getIObject = function (oid, iid) {
    var rootObj = this.getRootObject(oid);

    if (!_.isNumber(iid) && !_.isString(iid) )
        throw new TypeError('iid should be a number or a string.');

    return rootObj ? rootObj[iid] : undefined;
};

MqttNode.prototype.getResource = function (oid, iid, rid) {
    var iObj = this.getIObject(oid, iid),
        ridKey = mutils.ridKey(oid, rid);

    if (!_.isNumber(rid) && !_.isString(rid) )
        throw new TypeError('rid should be a number or a string.');

    return iObj ? iObj[ridKey] : undefined;
};

MqttNode.prototype.updateObjectInstance = function (oid, iid, data, callback) {
    if (!_.isPlainObject(data))
        throw new TypeError('data to update should be an object.');

    var self = this,
        deferred = Q.defer(),
        path = `so/${oid}/${iid}`,
        dotPath = `so.${oid}.${iid}`;

    if (!this.so) {
        deferred.reject(new Error('No smart object bound to this node.'));
    } else if (!this.getIObject(oid, iid)) {
        deferred.reject(new Error('No such oid or iid to update.'));
    } else {
        mqdb.replace(this.clientId, path, data).done(function () {
            _.set(self, dotPath, data);
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.updateResource = function (oid, iid, rid, data, callback) {
    var self = this,
        deferred = Q.defer(),
        path = `so/${oid}/${iid}/${rid}`,
        dotPath = `so.${oid}.${iid}.${rid}`;

    mqdb.modify(this.clientId, path, data).done(function () {
        _.set(self, dotPath, data);
        deferred.resolve(data);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.updateAttrs = function (attrs, callback) {
    // attrs = update_data = { clientId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt) }
    var self = this,
        deferred = Q.defer(),
        diff = {};

    mqdb.modify(this.clientId, '/', attrs).done(function () {
        _.forEach(attrs, function (val, key) {
            // if 'lifetime' attribue exists, always re-enable the life checker
            if (key === 'lifetime')
                self.enableLifeChecker();

            if (!_.isEqual(self[key], val)) {
                self[key] = val;
                diff[key] = val;
            }
        });
        deferred.resolve(diff);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};
/*************************************************************************************************/
/*** MqttNode Remote Request Methods                                                        ***/
/*************************************************************************************************/
MqttNode.prototype._checkAndUpdate = function (path, data, callback) {
    var self = this,
        deferred = Q.defer(),
        pathItems = mutils.pathItems(path),
        reqDataType = null,
        iObjsUpdater = [],
        updateFinalizer,
        oid,
        iid,
        rid;

    updateFinalizer = function (err, result) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data);
            // notify_data = { clientId, oid, iid, rid, data }
            self.shepherd.emit('notified', { clientId: self.clientId, oid: oid, iid: iid, rid: rid, data: data });
        }
    };

    path = mutils.returnPathInDotNotation(path);
    pathItems = mutils.pathItems(path);

    oid = pathItems[0];
    if (pathItems.length === 1) {
        reqDataType = 'object';
    } else if (pathItems.length === 2) {
        iid = pathItems[1];
        reqDataType = 'instance';
    } else if (pathItems.length === 3) {
        iid = pathItems[1];
        rid = pathItems[2];
        reqDataType = 'resource';
    }

    if (!reqDataType)
        deferred.reject(new Error('Bad path'));

    switch (reqDataType) {
        case 'object':
            _.forEach(data, function (iobj, iid) {
                iObjsUpdater.push(self.updateObjectInstance(oid, iid, iobj));
            });
            Q.all(iObjsUpdater).done(function (res) {
                updateFinalizer(null, res);
            }, function (err) {
                updateFinalizer(err, null);
            });
            break;
        case 'instance':
            this.updateObjectInstance(oid, iid, data).done(function (res) {
                updateFinalizer(null, res);
            }, function (err) {
                updateFinalizer(err, null);
            });
            break;
        case 'resource':
            this.updateResource(oid, iid, rid, data).done(function (res) {
                updateFinalizer(null, res);
            }, function (err) {
                updateFinalizer(err, null);
            });
            break;
        default:
            break;
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.readReq = function (path, callback) {     // path example: oid/iid/rid
    var self = this,
        deferred = Q.defer(),
        reqDataType = null,
        rspData = null;

    this.shepherd.readReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId)).done(function (data) {
        self._checkAndUpdate(path, data);
        deferred.resolve(data);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.writeReq = function (path, data, callback) {
    var deferred = Q.defer(),
        self = this,
        pathItems = mutils.pathItems(path),
        reqDataType = null;

    if (pathItems.length === 1)
        reqDataType = 'object';
    if (pathItems.length === 2)
        reqDataType = 'instance';
    if (pathItems.length === 3)
        reqDataType = 'resource';

    if (!reqDataType)
        deferred.reject(new Error('Bad path'));

    this.shepherd.writeReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId, data)).then(function (rsp) {
        self.readReq(path).done();  // Asynchronously read and automatically update
        return rsp;
    }).fail(function (err) {
        deferred.reject(err);
    }).done(function (rsp) {
        deferred.resolve(rsp);
    });

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.discoverReq = function (path, callback) {
    return this.shepherd.discoverReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId, callback));
};

MqttNode.prototype.writeAttrsReq = function (path, attrs, callback) {
    return this.shepherd.writeAttrsReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId, attrs, callback));
};

MqttNode.prototype.executeReq = function (path, callback) {
    return this.shepherd.executeReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId, callback));
};

MqttNode.prototype.observeReq = function (path, callback) {
    return this.shepherd.observeReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId, callback));
};

// [TODO]
MqttNode.prototype.maintain = function (callback) {
    // ther are many paths
    console.log('maintain triggered');
    //this.readReq();
};
/*************************************************************************************************/
/*** MqttNode Filling Up Methods                                                            ***/
/*************************************************************************************************/
MqttNode.prototype.addObjects = function (smObj) {
    // smObj = { oid1: { iid1: [rObjs], iid2: [rObjs] }, oid2: { iid: [rObjs] } };
    if (!_.isPlainObject(smObj)) throw new Error('Invalid Object');

    var self = this;

    _.forEach(smObj, function (iObj, oid) {
        var oidStr = mutils.oidKey(oid);

        self[oidStr] = self[oidStr] || {};

        self.addInstances(oid, iObj);
    });

    return this;
};

MqttNode.prototype.addInstances = function (oid, iObj) {
    // iObj = { iid1: [ rObjs ], iid2: [rObjs] };
    if (!_.isPlainObject(iObj)) throw new Error('Invalid Object Instances');

    var self = this,
        oidStr = mutils.oidKey(oid);

    this[oidStr] = this[oidStr] || {};

    _.forEach(iObj, function (rObjs, iid) {
        self.addResources(oid, iid, rObjs);
    });

    return this;
};

MqttNode.prototype.addResources = function (oid, iid, rObjs) {
    // rObjs = [ { rid, riid, value }, ... ]
    if (_.isPlainObject(rObjs)) rObjs = [ rObjs ];
    if (!_.isArray(rObjs)) throw new Error('Invalid rObjs');

    var self = this,
        oidStr = mutils.oidKey(oid);

    this[oidStr] = this[oidStr] || {};
    this[oidStr][iid] = this[oidStr][iid] || {};

    _.forEach(rObjs, function (r, idx) {
        if (_.isUndefined(r.rid)) throw new Error('Resource id should be given');
        var ridStr = mutils.ridKey(oid, r.rid);

        if (_.isUndefined(r.riid) || _.isNull(r.riid)) {
            this[oidStr][iid][ridStr] = r.value;
        } else {
            this[oidStr][iid][ridStr] = this[oidStr][iid][ridStr] || {};
            this[oidStr][iid][ridStr][r.riid] = r.value;
        }
    });

    return this;
};

module.exports = MqttNode;
