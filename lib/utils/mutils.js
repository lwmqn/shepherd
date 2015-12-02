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
    'Conflict': 409,
    'InternalServerError': 500
});

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

    return oidItem ? oidItem.value : parseInt(oid);   // if undefined, return parseInt(itself)
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

    return ridItem ? ridItem.value : parseInt(rid);   // if undefined, return parseInt(itself)
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
            if (_.isObject(n))
                _.assign(result, mutils.buildPathValuePairs(rootPath + key, n));
            else
                result[rootPath + key] = n;
        });
    } else {
        result[rootPath] = obj;
    }

    return result;
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

module.exports = mutils;
