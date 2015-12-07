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
        deferred = Q.defer(),
        excludedKeys = [ 'shepherd', '_registered', 'lifeChecker', 'status' ],
        dumped = {};

    if (!this.so)
        throw new Error('No smart object bound to this node.');
    

    _.forOwn(this, function (n , key) {
        if (!_.isFunction(n) && !_.includes(excludedKeys, key)) {
            if (key ==='so')
                dumped[key] = self.so.dump();
            else if (_.isObject(n))
                dumped[key] = _.cloneDeep(n);
            else
                dumped[key] = n;
        }
    });

    return dumped;
};

MqttNode.prototype.restore = function (callback) {
    var self = this,
        recoveredSo,
        deferred = Q.defer();

    this.dbRead().done(function (ndata) {
        if (ndata) {
            // restore devAttrs
            self.lifetime = ndata.lifetime || self.lifetime;
            self.ip = ndata.ip || self.ip;
            self.mac = ndata.mac || self.mac;
            self.version = ndata.version || self.version;
            self.objList = ndata.objList || self.objList;

            recoveredSo = new MqttNode.SmartObject(ndata.so.name);
            _.assign(recoveredSo, ndata.so);

            self.bindSo(recoveredSo);
            // self._registered = true;
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
    if (! (this.so instanceof SmartObject))
        throw new Error('No smart object bound to this node.');

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

MqttNode.prototype.replaceObjectInstance = function (oid, iid, data, callback) {
    var self = this,
        deferred = Q.defer(),
        path = `so/${oid}/${iid}`,
        dotPath = `so.${oid}.${iid}`,
        iObj,
        chkErr = _noShepherdOrSoError(this);

    try {
        iObj = this.getIObject(oid, iid);
        if (!iObj)
            chkErr = new Error('No such oid or iid to update.');
    } catch (e) {
        chkErr = e;
    }
        
    if (!_.isPlainObject(data))
        chkErr = chkErr || new TypeError('data to update should be an object.');

    if (chkErr) {
        deferred.reject(chkErr);
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

MqttNode.prototype.updateObjectInstance = function (oid, iid, data, callback) {
    var self = this,
        deferred = Q.defer(),
        path,
        dotPath,
        iObj,
        chkErr = _noShepherdOrSoError(this);

    try {
        iObj = this.getIObject(oid, iid);
        if (!iObj)
            chkErr = new Error('No such oid or iid to update.');
    } catch (e) {
        chkErr = e;
    }

    if (!_.isPlainObject(data))
        chkErr = chkErr || new TypeError('data to update should be an object.');

    path = `so/${oid}/${iid}`;
    dotPath = `so.${oid}.${iid}`;

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        mqdb.modify(this.clientId, path, data).done(function (diff) {
            var target = _.get(self, dotPath);
            if (target)
                _.merge(target, data);

            deferred.resolve(diff);
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.updateResource = function (oid, iid, rid, data, callback) {
    var self = this,
        deferred = Q.defer(),
        path,
        dotPath,
        resrc,
        target,
        chkErr = _noShepherdOrSoError(this);

    if (arguments.length < 4)
        chkErr = chkErr || new Error('Bad Arguments. Data must be given.');

    try {
        resrc = this.getResource(oid, iid, rid);
        if (_.isUndefined(resrc))
            chkErr = chkErr || new Error('No such oid, iid or rid  to update.');
    } catch (e) {
        chkErr = chkErr || e;
    }

    path = `so/${oid}/${iid}/${rid}`;
    dotPath = `so.${oid}.${iid}.${rid}`;

    function rejectTheResult (err) {
        deferred.reject(err);
    }

    target = _.get(this, dotPath);

    if (chkErr) {
        deferred.reject(chkErr);
    } else if (_.isObject(target)) {
        if (_.isObject(data)) {     // target is an object, and data is an object, modify
            mqdb.modify(this.clientId, path, data).done(function (diff) {
                _.merge(target, diff);
                deferred.resolve(diff);
            }, rejectTheResult);

        } else {                    // target is a object, and data is an value, replace
            mqdb.replace(this.clientId, path, data).done(function (num) {
                _.set(self, dotPath, data);
                deferred.resolve(data);
            }, rejectTheResult);
        }
    } else {
        if (_.isObject(data)) {     // target is a value, and data is an object, replace
            mqdb.replace(this.clientId, path, data).done(function (num) {
                _.set(self, dotPath, data);
                deferred.resolve(data);
            }, rejectTheResult);

        } else {                    // target is a value, and data is a value, modify
            mqdb.modify(this.clientId, path, data).done(function (diff) {
                var updatedData = _.get(diff, dotPath);
                _.set(self, dotPath, data);
                deferred.resolve(updatedData);
            }, rejectTheResult);
        }
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.updateAttrs = function (attrs, callback) {
    // attrs = update_data = { clientId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt) }
    var self = this,
        deferred = Q.defer(),
        diff = {},
        chkErr = _noShepherdOrSoError(this);

    if (!_.isPlainObject(attrs))
        chkErr = chkErr || new TypeError('attrs to update should be an object.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
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
    }

    return deferred.promise.nodeify(callback);
};
/*************************************************************************************************/
/*** MqttNode Remote Request Methods                                                        ***/
/*************************************************************************************************/
MqttNode.prototype.readReq = function (path, callback) {     // path example: oid/iid/rid
    var self = this,
        deferred = Q.defer(),
        reqDataType = null,
        rspData = null,
        chkErr = _.isString(path) ? _noShepherdOrSoError(this) : new TypeError('path should be a string.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        this.shepherd.readReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId)).done(function (data) {
            self._checkAndUpdate(path, data);
            deferred.resolve(data);
        }, function (err) {
            deferred.reject(err);
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.writeReq = function (path, data, callback) {
    var deferred = Q.defer(),
        self = this,
        pathItems,
        readyToSend = false,
        reqDataType = null,
        chkErr = _.isString(path) ? _noShepherdOrSoError(this) : new TypeError('path should be a string.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        pathItems = mutils.pathItems(path);

        if (pathItems.length === 1 && pathItems[0] !== '')
            reqDataType = 'object';
        if (pathItems.length === 2)
            reqDataType = 'instance';
        if (pathItems.length > 2)
            reqDataType = 'resource';

        switch (reqDataType) {
            case 'object':
                if (!_.isObject(data))
                    deferred.reject(new TypeError('data should be an object.'));
                else
                    readyToSend = true;

                break;
            case 'instance':
                if (!_.isObject(data))
                    deferred.reject(new TypeError('data should be an object.'));
                else
                    readyToSend = true;
                break;
            case 'resource':
                readyToSend = true;
                break;
            default:
                deferred.reject(new Error('Bad path'));
                break;
        }
    }

    if (readyToSend) {
        self.shepherd.writeReq.apply(self.shepherd, mutils.turnPathToReqArgs(path, self.clientId, data)).then(function (rsp) {
            self.readReq(path).done();  // Asynchronously read and automatically update
            return rsp;
        }).fail(function (err) {
            deferred.reject(err);
        }).done(function (rsp) {
            deferred.resolve(rsp);
        });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.discoverReq = function (path, callback) {
    var deferred = Q.defer(),
        chkErr = _.isString(path) ? _noShepherdOrSoError(this) : new TypeError('path should be a string.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        this.shepherd.discoverReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId))
            .done(function (result) {
                deferred.resolve(result);
            }, function (err) {
                deferred.reject(err);
            });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.writeAttrsReq = function (path, attrs, callback) {
    var deferred = Q.defer(),
        chkErr = _.isString(path) ? _noShepherdOrSoError(this) : new TypeError('path should be a string.');

    if (!_.isPlainObject(attrs))
        chkErr = new TypeError('attrs should be an object.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        this.shepherd.writeAttrsReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId, attrs))
            .done(function (result) {
                deferred.resolve(result);
            }, function (err) {
                deferred.reject(err);
            });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.executeReq = function (path, callback) {
    var deferred = Q.defer(),
        chkErr = _.isString(path) ? _noShepherdOrSoError(this) : new TypeError('path should be a string.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        this.shepherd.executeReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId))
            .done(function (result) {
                deferred.resolve(result);
            }, function (err) {
                deferred.reject(err);
            });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.observeReq = function (path, callback) {
    var deferred = Q.defer(),
        chkErr = _.isString(path) ? _noShepherdOrSoError(this) : new TypeError('path should be a string.');

    if (chkErr) {
        deferred.reject(chkErr);
    } else {
        this.shepherd.observeReq.apply(this.shepherd, mutils.turnPathToReqArgs(path, this.clientId))
            .done(function (result) {
                deferred.resolve(result);
            }, function (err) {
                deferred.reject(err);
            });
    }

    return deferred.promise.nodeify(callback);
};

MqttNode.prototype.maintain = function (callback) {
    // objList = { oid1: [ iid1, iid2 ], oid2: [ iid3, iid4, iid5] }
    var self = this,
        deferred = Q.defer(),
        readAllProms = [];

    _.forEach(this.objList, function (iids, oid) {
        _.forEach(iids, function (iid) {
            var path = `${oid}/${iid}`;
            readAllProms.push(self.readReq(path));
        });
    });

    Q.all(readAllProms).done(function (results) {
        deferred.resolve(self.so);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Protected Methods                                                                         ***/
/*************************************************************************************************/
MqttNode.prototype._checkAndUpdate = function (path, data, callback) {
    var self = this,
        deferred = Q.defer(),
        pathItems = mutils.pathItems(path),
        reqDataType = null,
        iObjsUpdater = [],
        updateFinalizer,
        iidArray = [],
        oid,
        iid,
        rid;

    updateFinalizer = function (err, result) {
        if (err) {
            deferred.reject(err);
        } else {
            // notify_data = { clientId, oid, iid, rid, data }
            // self.shepherd.emit('notified', { clientId: self.clientId, oid: oid, iid: iid, rid: rid, data: data });
            deferred.resolve(result);
        }
    };

    path = mutils.dotPath(path);
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

    if (!reqDataType) {
        deferred.reject(new Error('Bad path'));
    } else {
        switch (reqDataType) {
            case 'object':
                _.forEach(data, function (iobj, iid) {
                    iObjsUpdater.push(self.updateObjectInstance(oid, iid, iobj));
                    iidArray.push(iid);
                });

                Q.all(iObjsUpdater).done(function (resArray) {
                    var resultObj = {};
                    _.forEach(resArray, function (res, idx) {
                        resultObj[iidArray[idx]] = res;
                    });

                    updateFinalizer(null, resultObj);
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
    }

    return deferred.promise.nodeify(callback);
};

/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/
function _noShepherdOrSoError(node) {
    if (!node.shepherd)
        return new Error('This node did not register to the mqtt-shepherd.');
    else if (!(node.so instanceof SmartObject))
        return new Error('No smart object bound to this node.');
    else
        return null;
}

module.exports = MqttNode;
