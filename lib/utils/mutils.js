'use strict';

var util = require('util'),
    Enum = require('enum'),
    _ = require('lodash'),
    lwm2mid = require('lwm2m-id');

var mutils = {};

var CMD = new Enum({
    'read': 0,
    'write': 1,
    'discover': 2,
    'writeAttrs': 3,
    'execute': 4,
    'observe': 5,
    'notify': 6,
    'unknown': 255
});

var RSPCODE = new Enum({
    'OK': 200,
    'Created': 201,
    'Deleted': 202,
    'Changed': 204,
    'Content': 205,
    'BadRequest': 400,
    'Unauthorized': 401,
    'NotFound': 404,
    'MethodNotAllowed': 405,
    'Timeout': 408,
    'Conflict': 409,
    'InternalServerError': 500
});

mutils.isGoodResponse = function (status) {
    var statusCode = RSPCODE.get(status),
        goodCodes = [ 200, 201, 202, 204, 205 ];

    if (_.isUndefined(statusCode))
        return false;

    if (_.includes(goodCodes, statusCode.value))
        return true;
    else
        return false;
};

mutils.rspCodeKey = function (code) {
    var codeKey = mutils.getRspCode(code);
    return codeKey ? codeKey.key : undefined;
};
mutils.rspCodeNum = function (code) {
    var codeNum = mutils.getRspCode(code);
    return codeNum ? codeNum.value : undefined;
};

mutils.cmdIdNum = function (id) {
    var cmdNum = mutils.getCmd(id);
    return cmdNum ? cmdNum.value : undefined;
};

mutils.cmdIdKey = function (id) {
    var cmdKey = mutils.getCmd(id);
    return cmdKey ? cmdKey.key : undefined;
};

mutils.jsonify = function (str) {
    var obj;

    try {
        obj = JSON.parse(str);
    } catch (e) {
        return;
    }

    return obj;
};  // undefined/result

mutils.getCmd = function (cmdId) {
    if (!_.isString(cmdId) && !_.isNumber(cmdId))
        throw new TypeError('cmdId should be a type of string or number.');

    return CMD.get(cmdId);
};

mutils.getRspCode = function (code) {
    if (!_.isString(code) && !_.isNumber(code))
        throw new TypeError('code should be a type of string or number.');

    return RSPCODE.get(code);
};

mutils.getOid = function (oid) {
    return lwm2mid.getOid(oid);
};

mutils.getRid = function (oid, rid) {
    return lwm2mid.getRid(oid, rid);
};

mutils.oidKey = function (oid) {
    var oidItem = lwm2mid.getOid(oid);

    return oidItem ? oidItem.key : oid;     // if undefined, return itself
};

mutils.oidNumber = function (oid) {
    var oidItem = lwm2mid.getOid(oid);

    oidItem = oidItem ? oidItem.value : parseInt(oid);   // if undefined, return parseInt(itself)

    if (_.isNaN(oidItem))
        oidItem = oid;

    return oidItem;
};


mutils.ridKey = function (oid, rid) {
    var ridItem = lwm2mid.getRid(oid, rid);

    if (_.isUndefined(rid))
        rid = oid;

    return ridItem ? ridItem.key : rid;     // if undefined, return itself
};

mutils.ridNumber = function (oid, rid) {
    var ridItem = lwm2mid.getRid(oid, rid);

    if (_.isUndefined(rid))
        rid = oid;

    ridItem = ridItem ? ridItem.value : parseInt(rid);   // if undefined, return parseInt(itself)

    if (_.isNaN(ridItem))
        ridItem = rid;

    return ridItem;
};

mutils.getSpecificResrcChar = function (oid, rid) {
    return lwm2mid.getSpecificResrcChar(oid, rid);
};  // undefined / resrc characteristic

mutils.dotPath = function (path) {
    path = path.replace(/\//g, '.');           // tranform slash notation into dot notation

    if (path[0] === '.')                       // if the first char of topic is '.', take it off
        path = path.slice(1);

    if (path[path.length-1] === '.')           // if the last char of topic is '.', take it off
        path = path.slice(0, path.length-1);

    return path;
};

mutils.slashPath = function (path) {
    path = path.replace(/\./g, '/');           // tranform dot notation into slash notation

    if (path[0] === '/')                       // if the first char of topic is '/', take it off
        path = path.slice(1);

    if (path[path.length-1] === '/')           // if the last char of topic is '/', take it off
        path = path.slice(0, path.length-1);

    return path;
};

mutils.pathItems = function (path) {
    return mutils.slashPath(path).split('/');
};

mutils.buildPathValuePairs = function (rootPath, obj) {
    var result = {};

    rootPath = mutils.dotPath(rootPath);

    if (_.isObject(obj)) {
        if (rootPath !== '' && rootPath !== '.' && rootPath !== '/' && !_.isUndefined(rootPath))
            rootPath = rootPath + '.';

        _.forEach(obj, function (n, key) {
            // Tricky: objList is an array, don't buid its full path, or updating new list will fail
            if (_.isObject(n) && key !== 'objList')
                _.assign(result, mutils.buildPathValuePairs(rootPath + key, n));
            else
                result[rootPath + key] = n;
        });
    } else {
        result[rootPath] = obj;
    }

    return result;
};

mutils.invalidPathOfTarget = function (target, objToUpdate) {
    var invalidPath = [];

    _.forEach(objToUpdate, function (n, p) {
        if (!_.has(target, p)) {
            invalidPath.push(p);
        }
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
    else
        reqObj.data = data;

    reqArgs.push(reqObj);

    if (_.isFunction(callback))
        reqArgs.push(callback);

    return reqArgs;
};

mutils.turnReqObjOfIds = function (reqObj) {
    var oidNum;

    if (_.has(reqObj, 'oid'))
        oidNum = reqObj.oid = mutils.oidNumber(reqObj.oid);

    if (_.has(reqObj, 'rid'))
        reqObj.rid = mutils.ridNumber(oidNum, reqObj.rid);

    return reqObj;
};

mutils.requestDataType = function (path) {
    var pathItems,
        reqDataType;

    path = mutils.dotPath(path);
    pathItems = mutils.pathItems(path);

    if (pathItems.length === 1) {
        reqDataType = 'object';
    } else if (pathItems.length === 2) {
        reqDataType = 'instance';
    } else if (pathItems.length === 3) {
        reqDataType = 'resource';
    }

    return reqDataType;
};

mutils.turnReadDataOfIdKeys = function (path, data) {
    var reqDataType = mutils.requestDataType(path),
        reqPathItems = mutils.pathItems(path);

    if (reqDataType === 'object') {
        _.forEach(data, function (inst, iid) {
            _.forEach(inst, function (val, rid) {
                var rkey = mutils.ridKey(reqPathItems[0], rid);
                inst[rkey] = val;
                delete inst[rid];
            });
        });
    } else if (reqDataType === 'instance') {
        _.forEach(data, function (val, rid) {
            var rkey = mutils.ridKey(reqPathItems[0], rid);
            console.log(rkey);
            data[rkey] = val;
            delete data[rid];
        });
    }

    return data;
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
                inst[rkey] = val;
                delete inst[rid];
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

mutils.returnObjListOfSo = function (objList) {
    var oList = {};
    // objList: [ { oid, iid }, { oid, iid }, { oid, iid }, ... ]
    // transform to objList = { oid1: [ iid1, iid2 ], oid2: [ iid3, iid4, iid5 ] }

    _.forEach(objList, function (idPair) {
        var oid = idPair.oid,
            iid = idPair.iid;

        if (!_.isArray(oList[oid]))
            oList[oid] = [];

        oList[oid].push(iid);
    });

    return oList;
};

mutils.objectInstanceDiff = function (oldInst, newInst) {
    var badPath = mutils.invalidPathOfTarget(oldInst, newInst);

    if (badPath.length !== 0)
        throw new Error('No such property ' + badPath[0] + ' in targeting object instance.');
    else
        return mutils.objectDiff(oldInst, newInst);
};

mutils.resourceDiff = function (oldVal, newVal) {
    var badPath;

    if (typeof oldVal !== typeof newVal) {
        return newVal;
    } else if (_.isPlainObject(oldVal)) {
        // object diff
        badPath = mutils.invalidPathOfTarget(oldVal, newVal);
        if (badPath.length !== 0)
            throw new Error('No such property ' + badPath[0] + ' in targeting object.');
        else
            return mutils.objectDiff(oldVal, newVal);
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
            throw new Error('Node has no attr: ' + key);
        } else if (key === 'objList') {
            oList = mutils.returnObjListOfSo(val);

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
