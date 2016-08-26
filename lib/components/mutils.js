var _ = require('busyman'),
    mutils = require('lwmqn-util');

mutils.isTimeout = function (err) {
    return _.isObject(err) && (err.code === 'ETIMEDOUT');
};

mutils.isGoodResponse = function (status) {
    var statusCode = mutils.getRspCode(status),
        goodCodes = [ 200, 201, 202, 204, 205 ];

    if (_.isUndefined(statusCode))
        return false;
    else if (_.includes(goodCodes, statusCode.value))
        return true;

    return false;
};

mutils.invalidPathOfTarget = function (target, objToUpdate) {
    var invalidPath = [];

    _.forEach(objToUpdate, function (n, p) {
        if (!_.has(target, p))
            invalidPath.push(p);
    });
    return invalidPath;
};

mutils.turnPathToReqArgs = function (path, clientId, data, callback) {
    var args,
        reqArgs = [],
        reqObj = {};

    reqArgs.push(clientId);

    path = mutils.slashPath(path);
    args = path.split('/');

    if (args.length === 1) {
        reqObj.oid = args[0];
    } else if (args.length === 2) {
        reqObj.oid = args[0];
        reqObj.iid = args[1];
    } else if (args.length === 3) {
        reqObj.oid = args[0];
        reqObj.iid = args[1];
        reqObj.rid = args[2];
    } else {
        throw new Error('Bad path');
    }

    if (_.isFunction(data))
        callback = data;
    else if (!_.isUndefined(data))
        reqObj.data = data;

    reqArgs.push(reqObj);

    if (_.isFunction(callback))
        reqArgs.push(callback);

    return reqArgs;
};

mutils.turnReqObjOfIds = function (reqObj) {
    var oidNum;

    if (_.has(reqObj, 'oid'))
        oidNum = reqObj.oid = mutils.oidNum(reqObj.oid);

    if (_.has(reqObj, 'rid'))
        reqObj.rid = mutils.ridNum(oidNum, reqObj.rid);

    if (_.has(reqObj, 'iid')) {
        var iidNum = parseInt(reqObj.iid);
        iidNum = _.isNaN(iidNum) ? reqObj.iid : iidNum;
        reqObj.iid = iidNum;
    }

    return reqObj;
};

mutils.requestDataType = function (path) {
    var pathItems,
        reqDataType;

    path = mutils.dotPath(path);
    pathItems = mutils.pathItems(path);

    if (pathItems.length === 1)
        reqDataType = 'object';
    else if (pathItems.length === 2)
        reqDataType = 'instance';
    else if (pathItems.length === 3)
        reqDataType = 'resource';

    return reqDataType;
};

mutils.readDataInfo = function (path, data) {
    var reqDataType = mutils.requestDataType(path),
        reqPathItems = mutils.pathItems(path),
        inData = _.cloneDeep(data),
        oidkey,
        iidkey,
        ridkey;

    if (reqDataType === 'object') {
        oidkey = mutils.oidKey(reqPathItems[0]);
        _.forEach(inData, function (inst, iid) {
            _.forEach(inst, function (val, rid) {
                var rkey = mutils.ridKey(oidkey, rid);
                inData[iid][rkey] = val;

                if (rkey !== rid)
                    delete inData[iid][rid];
            });
        });
    } else if (reqDataType === 'instance') {
        oidkey = mutils.oidKey(reqPathItems[0]);
        iidkey = reqPathItems[1];
        _.forEach(inData, function (val, rid) {
            var rkey = mutils.ridKey(oidkey, rid);
            inData[rkey] = val;
            if (rkey !== rid)
                delete inData[rid];
        });
    } else if (reqDataType === 'resource') {
        oidkey = mutils.oidKey(reqPathItems[0]);
        iidkey = reqPathItems[1];
        ridkey = mutils.ridKey(oidkey, reqPathItems[2]);
    }

    return {
        type: reqDataType,
        oid: oidkey,
        iid: iidkey,
        rid: ridkey,
        data: inData
    };
};

mutils.objectInstanceDiff = function (oldInst, newInst) {
    var badPath = mutils.invalidPathOfTarget(oldInst, newInst);

    if (badPath.length !== 0) {
        _.forEach(badPath, function (p) {
            _.unset(newInst, p);    // kill bad property, they will not be updated
        });
    }

    return mutils.objectDiff(oldInst, newInst);
};

mutils.resourceDiff = function (oldVal, newVal) {
    var badPath;

    if (typeof oldVal !== typeof newVal) {
        return newVal;
    } else if (_.isPlainObject(oldVal)) {
        // object diff
        badPath = mutils.invalidPathOfTarget(oldVal, newVal);
        if (badPath.length !== 0) {
            _.forEach(badPath, function (p) {
                _.unset(newVal, p);    // kill bad property, they will not be updated
            });
        }

        mutils.objectDiff(oldVal, newVal);
    } else if (oldVal !== newVal) {
        return newVal;
    } else {
        return null;
    }
};

mutils.objectDiff = function (oldObj, newObj) {
    var pvp = mutils.buildPathValuePairs('/', newObj),
        diff = {};

    _.forEach(pvp, function (val, path) {
        if (!_.has(oldObj, path) || _.get(oldObj, path) !== val)
            _.set(diff, path, val);
    });

    return diff;
};

mutils.devAttrsDiff = function (node, attrs) {
    // { clientId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt) }
    var diff = {};

    _.forEach(attrs, function (val, key) {
        var oList,
            isObjListDiff = false;

        if (!_.has(node, key)) {
            // throw new Error('Node has no attr: ' + key); // just ignore, no need to throw
        } else if (key === 'objList') {
            oList = val;

            _.forEach(oList, function (iids, oid) {
                var nodeIids = _.get(node.objList, oid);

                if (!nodeIids) {
                    isObjListDiff = true;
                } else if (!_.isEqual(iids.sort(), nodeIids.sort())) {
                    isObjListDiff = true;
                }
            });

            if (isObjListDiff)
                diff.objList = val;

        } else if (node[key] !== val) {
                diff[key] = val;
        }
    });

    return diff;
};

module.exports = mutils;
