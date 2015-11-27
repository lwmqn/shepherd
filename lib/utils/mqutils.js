'use strict';

var util = require('util'),
    _ = require('lodash'),
    MDEFS = require('../defs/mdefs'),
    OID = MDEFS.OID,
    RID = MDEFS.RID,
    RSPCODE = MDEFS.RSPCODE,
    CMD = MDEFS.CMD;

var mqUtils = {};

mqUtils.jsonify = function (str) {
    var obj;

    try {
        obj = JSON.parse(str);
    } catch (e) {
        return false;
    }
    return obj;
};

mqUtils.turnReqObjOfIds = function (reqObj) {
    _.forEach(reqObj, function (val, key) {
        var oidNum,
            ridNum;

        if (key === 'oid') {
            oidNum = MDEFS.getOidNumber(val);
            reqObj.oid = _.isUndefined(oidNum) ? val : oidNum;
        }

        if (key === 'rid') {
            ridNum = MDEFS.getRidNumber(val);
            reqObj.rid = _.isUndefined(ridNum) ? val : ridNum;
        }
    });

    return reqObj;
};

mqUtils.buildPathValuePairs = function (rootPath, obj) {
    var result = {};

    rootPath = mqUtils.returnPathInDotNotation(rootPath);

    if (_.isObject(obj)) {
        if (rootPath !== '' && rootPath !== '.' && rootPath !== '/' && !_.isUndefined(rootPath))
            rootPath = rootPath + '.';

        _.forEach(obj, function (n, key) {
            if (_.isObject(n)) {
                var tmp = mqUtils.buildPathValuePairs(rootPath + key, n);
                _.assign(result, tmp);
            } else {
                result[rootPath + key] = n;
            }
        });
    } else {
        result[rootPath] = obj;
    }

    return result;
};

mqUtils.returnPathInDotNotation = function (path) {
    path = path.replace(/\//g, '.');           // tranform slash notation into dot notation

    if (path[0] === '.')                       // if the first char of topic is '.', take it off
        path = path.slice(1);

    if (path[path.length-1] === '.')          // if the last char of topic is '.', take it off
        path = path.slice(0, path.length-1);


    return path;
};

mqUtils.returnPathInSlashNotation = function (path) {
    path = path.replace(/\./g, '/');           // tranform dot notation into slash notation

    if (path[0] === '/')                       // if the first char of topic is '/', take it off
        path = path.slice(1);

    if (path[path.length-1] === '/')          // if the last char of topic is '/', take it off
        path = path.slice(0, path.length-1);

    return path;
};

mqUtils.returnPathItemsInArray = function (path) {
    path = mqUtils.returnPathInSlashNotation(path);
    return path.split('/');
};

mqUtils.turnPathToReqArgs = function (path, clientId, data, callback) {
    var args,
        reqArgs = [],
        reqObj = {};

    reqArgs.push(clientId);

    path = mqUtils.returnPathInSlashNotation(path);
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

    if (util.isFunction(data))
        callback = data;
    else
        reqObj.data = data;

    reqArgs.push(reqObj);

    if (util.isFunction(callback))
        reqArgs.push(callback);

    return reqArgs;
};

mqUtils.lookupOidString = function (oid) {
    var omnaOid = OID.get(oid);

    return omnaOid ? omnaOid.key : undefined;
};

mqUtils.lookupRidString = function (rid) {
    var omnaRid = RID.get(rid);

    return omnaRid ? omnaRid.key : undefined;
};

module.exports = mqUtils;
