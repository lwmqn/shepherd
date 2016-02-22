var _ = require('lodash');
var mutils = require('./mutils');
var MqttNode = require('./mqtt-node');
var Q = require('q');
var rspCodeNum = mutils.rspCodeNum;

var msghdlr = {};

msghdlr._clientRegisterHandler = function (shepherd, msg) {
    // reg_data = { clientId, transId, ip, mac, lifetime, version, objList, port(opt) }
    var shepherdId = shepherd.clientId,
        transId = msg.transId,
        acceptedAttrs = [ 'clientId', 'transId', 'lifetime', 'version', 'objList', 'mac', 'ip' ],
        node = shepherd._nodebox[msg.clientId],
        so = node ? node.so : null,
        badAttr = false,
        oList = {};

    // shepherd itself no need to be in nodebox
    if (msg.clientId === shepherdId)
        return;

    // delete msg.transId;
    // unknown device attributes are not allowed
    _.forEach(msg, function (val, key) {
        if (!_.includes(acceptedAttrs, key))
            badAttr = true;
    });

    // mandatory attributes check (version is optional)
    _.forEach(acceptedAttrs, function (attrName) {
        if (!_.has(msg, attrName) && (attrName !== 'version')) {
            badAttr = true;
        }
    });

    if (badAttr) {
        shepherd._responseSender('register', msg.clientId, {
            transId: transId,
            status: rspCodeNum('BadRequest')
        }).done();
        return;
    }

    if (_.isString(msg.mac))    // mac address is unique and case-insensitive
        msg.mac = msg.mac.toLowerCase();

    if (!node && msg.clientId) {
        // do register procedure
        msg.objList = mutils.returnObjListOfSo(msg.objList);
        node = new MqttNode(shepherd, msg.clientId, msg);   // msg == devAttrs
        so = new MqttNode.SmartObject();
        node._registered = false;
        msghdlr._clientObjectDetailReq(shepherd, msg.clientId, msg.objList).then(function (objs) {
            // [ { oid: oids[idx], data: obj }, ... ]
            _.forEach(objs, function (obj) {
                so.addIObjects(obj.oid, obj.data);
            });
        }).then(function () {
            node.bindSo(so);
            shepherd._nodebox[msg.clientId] = node;
            node.status = 'online';
            node._registered = true;
            return node.dbSave();
        }).fail(function (err) {
            ERR(err);
            node.status = 'offline';
            node._registered = false;
            node.dbRemove();
            node.so = null;
            so.node = null;
            shepherd._nodebox[msg.clientId] = null;
            delete shepherd._nodebox[msg.clientId];

            shepherd._responseSender('register', msg.clientId, {
                transId: transId,
                status: rspCodeNum('InternalServerError')
            }).done();
        }).done(function () {
            shepherd._responseSender('register', msg.clientId, {
                transId: transId,
                status: rspCodeNum('Created')
            }).done();
            node.enableLifeChecker();
            shepherd.emit('registered', node);
            // APP('registered');
            // APP(shepherd._nodebox[msg.clientId].dump());
            // APP(shepherd._nodebox[msg.clientId].dump().so);
        });

    } else {    // if node exists
        if (node.mac !== msg.mac) {
            shepherd._responseSender('register', msg.clientId, {
                transId: transId,
                status: rspCodeNum('Conflict')
            }).done();
        } else {
            msg._fromRegisterHandler = true;
            msghdlr._clientUpdateHandler(shepherd, msg);
        }
    }
};

msghdlr._clientUpdateHandler = function (shepherd, msg) {
    // update_data = { clientId, transId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt), port(opt) }
    var node = shepherd._nodebox[msg.clientId],
        transId = msg.transId,
        acceptedAttrs = [ 'clientId', 'transId', 'lifetime', 'version', 'objList', 'mac', 'ip' ],
        badAttr = false,
        isFromRegister = msg._fromRegisterHandler,
        oldObjList,
        oldNodeData,
        so;

    // this msg is coming from register handler, delete the flag in msg
    delete msg._fromRegisterHandler;
    delete msg.transId;

    if (!node || !node.so) {
        shepherd._responseSender('update', msg.clientId, {
            transId: transId,
            status: rspCodeNum('NotFound')
        }).done();
        return;
    } else {
        node.status = 'online';
        so = node.so;
        oldNodeData = node.dump();
        oldObjList = node.objList;
    }

    if (!isFromRegister && _.has(msg, 'mac')) {
        if (node.mac !== msg.mac) {
            shepherd._responseSender('update', msg.clientId, {
                transId: transId,
                status: rspCodeNum('Conflict')
            }).done();
            return;
        }
    }

    _.forEach(msg, function (val, key) {
        if (!_.includes(acceptedAttrs, key))
            badAttr = true;
    });

    if (badAttr) {
        shepherd._responseSender('update', msg.clientId, {
            transId: transId,
            status: rspCodeNum('BadRequest')
        }).done();
        return;
    }

    msg.objList = mutils.returnObjListOfSo(msg.objList);
    // _clientObjectDetailReq(shepherd, clientId, objListOfSo, callback)

    node.updateAttrs(msg).then(function (diff) {
        node.enableLifeChecker();
        if (_.has(diff, 'objList')) {
            node._registered = false;
            // kill old objects
            _.forEach(oldObjList, function (iids, oid) {
                var oidKey = mutils.oidKey(oid);
                so[oidKey] = null;
                delete so[oidKey];
            });
            msghdlr._clientObjectDetailReq(shepherd, msg.clientId, msg.objList).then(function (objs) {
                // [ { oid: oids[idx], data: obj }, ... ]
                _.forEach(objs, function (obj) {
                    so.addIObjects(obj.oid, obj.data);
                });
            }).then(function () {
                // new object list
                node.objList = msg.objList;
                return node.dbSave();
            }).then(function () {
                node._registered = true;
                if (!isFromRegister) {
                    shepherd._responseSender('update', msg.clientId, {
                        transId: transId,
                        status: rspCodeNum('Changed')
                    }).done();
                }

                shepherd.emit('updated', { clientId: node.clientId, data: diff });
                // [TODO] instance update events?
            }).fail(function (err) {
                ERR(err);
                if (!isFromRegister) {
                    shepherd._responseSender('update', msg.clientId, {
                        transId: transId,
                        status: rspCodeNum('InternalServerError')
                    }).done();
                }
                // kill new objects
                _.forEach(node.objList, function (iids, oid) {
                    var oidKey = mutils.oidKey(oid);
                    so[oidKey] = null;
                    delete so[oidKey];
                });

                // recover old Objs
                node.objList = oldObjList;
                so.addObjects(oldNodeData.so);
                delete oldNodeData.so;

                _.merge(node, oldNodeData);
            }).done();
        } else {
            node.maintain().fail(function(err) {
                ERR(err);
            }).done();

            if (!isFromRegister) {
                shepherd._responseSender('update', msg.clientId, {
                    transId: transId,
                    status: rspCodeNum('Changed')
                }).done();
            }
            shepherd.emit('updated', { clientId: node.clientId, data: diff });
        }
        
    }).fail(function (err) {
        ERR(err);
        if (!isFromRegister) {
            shepherd._responseSender('update', msg.clientId, {
                transId: transId,
                status: rspCodeNum('InternalServerError')
            }).done();
        }
    }).done(function () {
        if (isFromRegister) { // if this msg is from register handler, send 'register' response to client
            shepherd.emit('registered', node);
            shepherd._responseSender('register', msg.clientId, {
                transId: transId,
                status: rspCodeNum('OK')
            }).done();
        }
    });
};

msghdlr._clientObjectDetailReq = function (shepherd, clientId, objListOfSo, callback) {
    var deferred = Q.defer(),
        readAllObjectPromises = [],
        oids = [];

    // read every object => dig into the structure and id-name transform
    _.forEach(objListOfSo, function (iids, oid) {
        var oidNum = mutils.oidNum(oid);
        readAllObjectPromises.push(shepherd.readReq(clientId, { oid: oidNum }));
        oids.push(oidNum);
    });

    Q.all(readAllObjectPromises).then(function (rsps) {
        var objs = [],
            isAnyFail = false;

        _.forEach(rsps, function (rsp, idx) {
            if (mutils.isGoodResponse(rsp.status)) {
                //_.forEach(rsp.data, function (obj, idx) {
                    objs.push({
                        oid: oids[idx],
                        data: rsp.data
                    });
                //});
            } else {
                isAnyFail = true;
            }
        });

        if (isAnyFail)
            throw new Error('Object requests fail.');
        else
            deferred.resolve(objs);

    }).fail(function (err) {
        ERR(err);
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

msghdlr._clientDeregisterHandler = function (shepherd, msg) {
    // dereg_data = { clientId }; 
    var node = shepherd._nodebox[msg.clientId];

    if (!node) {
        shepherd._responseSender('deregister', msg.clientId, {
            transId: msg.transId,
            status: rspCodeNum('NotFound')
        }).done();
    } else {
        node.disableLifeChecker();
        node._registered = false;
        node.status = 'offline';
        node.dbRemove();
        node.so.node = null;
        delete node.so.node;
        node.so = null;
        delete node.so;
        shepherd._nodebox[msg.clientId] = null;
        delete shepherd._nodebox[msg.clientId];

        shepherd._responseSender('deregister', msg.clientId, {
            transId: msg.transId,
            status: rspCodeNum('Deleted')
        }).done();
        shepherd.emit('deregistered', msg.clientId);
    }
};

msghdlr._clientNotifyHandler = function (shepherd, msg) {
    // notify_data = { clientId, transId, oid, iid, rid, data }
    // (oid + iid), (oid + iid + rid)
    var node = shepherd._nodebox[msg.clientId],
        robj,
        iobj,
        resrc;

    if (!node || !node.so) {
        shepherd._responseSender('notify', msg.clientId, {
            transId: msg.transId,
            status: rspCodeNum('NotFound')
        }).done();
        return;
    } else if (_.isUndefined(msg.oid) || _.isNull(msg.oid) || _.isUndefined(msg.iid) || _.isNull(msg.iid)) {
        shepherd._responseSender('notify', msg.clientId, {
            transId: msg.transId,
            status: rspCodeNum('BadRequest')
        }).done();
        return;
    }

    node.status = 'online';

    robj = node.getRootObject(msg.oid);
    iobj = node.getIObject(msg.oid, msg.iid);

    if (_.isUndefined(msg.oid) || _.isNull(msg.oid) || _.isUndefined(msg.iid) || _.isNull(msg.iid) || !robj || !iobj) {
        shepherd._responseSender('notify', msg.clientId, {
            transId: msg.transId,
            status: rspCodeNum('NotFound')
        }).done();
        return;
    }

    if (_.isUndefined(msg.rid)) {   // data is object instance
        if (!_.isPlainObject(msg.data)) {
            shepherd._responseSender('notify', msg.clientId, {
                transId: msg.transId,
                status: rspCodeNum('BadRequest')
            }).done();
            return;
        } else {
            var badResrc = false;
            _.forEach(msg.data, function (val, rid) {
                var ridKey = mutils.ridKey(msg.oid, rid);
                delete msg.data[rid];
                msg.data[ridKey] = val;
                badResrc = badResrc || _.isUndefined(node.getResource(msg.oid, msg.iid, rid));
            });

            if (badResrc) {
                shepherd._responseSender('notify', msg.clientId, {
                    transId: msg.transId,
                    status: rspCodeNum('BadRequest')
                }).done();
                return;
            } else {
                shepherd.emit('notify', msg);
                node.updateObjectInstance(msg.oid, msg.iid, msg.data).then(function (diff) {
                    msg.data = diff;
                    shepherd.emit('notify_update', msg);
                    return shepherd._responseSender('notify', msg.clientId, {
                        transId: msg.transId,
                        status: rspCodeNum('Changed')
                    });
                }).fail(function (err) {
                    ERR(err);
                    shepherd.emit('error', err);
                    shepherd._responseSender('notify', msg.clientId, {
                        transId: msg.transId,
                        status: rspCodeNum('InternalServerError')
                    });
                }).done();
            }
        }
    } else {                        // data is an resource
        resrc = node.getResource(msg.oid, msg.iid, msg.rid);
        if (_.isUndefined(resrc)) {
            shepherd._responseSender('notify', msg.clientId, {
                transId: msg.transId,
                status: rspCodeNum('NotFound')
            }).done();
            return;
        } else {
            shepherd.emit('notify', msg);
            node.updateResource(msg.oid, msg.iid, msg.rid, msg.data).then(function (diff) {
                msg.data = diff;
                shepherd.emit('notify_update', msg);
                return shepherd._responseSender('notify', msg.clientId, {
                    transId: msg.transId,
                    status: rspCodeNum('Changed')
                });
            }).fail(function (err) {
                ERR(err);
                shepherd.emit('error', err);
                shepherd._responseSender('notify', msg.clientId, {
                    transId: msg.transId,
                    status: rspCodeNum('InternalServerError')
                });
            }).done();
        }
    }
};



msghdlr._clientResponseHandler = function (shepherd, msg) {
    // rsp_data = { clientId, transId, cmdId, status, data }
    var clientId = msg.clientId,
        node = shepherd._nodebox[clientId],
        cmdId = mutils.cmdKey(msg.cmdId) || msg.cmdId,
        clientProms = shepherd._rspsToResolve[clientId],
        cmdProms = clientProms ? clientProms[cmdId] : undefined,
        cmdProm = cmdProms ? cmdProms[msg.transId] : undefined;

    if (!cmdProm)
        return;

    clearTimeout(cmdProm.tmoutCtrl);
    cmdProm.deferred.resolve(_.omit(msg, [ 'transId', 'clientId', 'cmdId' ]));

    if (node && mutils.rspCodeKey(msg.status) !== 'Timeout')
        node.status = 'online';

    cmdProm = null;
    shepherd._rspsToResolve[clientId][cmdId][msg.transId] = null;
    delete shepherd._rspsToResolve[clientId][cmdId][msg.transId];

    if (_.isEmpty(cmdProms)) {
        delete shepherd._rspsToResolve[clientId][cmdId];

        if (_.isEmpty(clientProms))
            delete shepherd._rspsToResolve[clientId];
    }
};

msghdlr._clientPingHandler = function (shepherd, msg) {
    // ping_data = { clientId, transId }
    var node = shepherd._nodebox[msg.clientId];
    if (node)
        node.status = 'online';

    shepherd._responseSender('ping', msg.clientId, {
        transId: msg.transId,
        status: rspCodeNum('OK')
    }).done();
};

msghdlr._clientLwtHandler = function (shepherd, msg) {
    // lwt_data = { clientId, data }
    var node = shepherd._nodebox[msg.clientId];
    if (node)
        node.status = 'offline';
};

msghdlr._clientOtherTopicsHandler = function (shepherd, topic, message, packet) {
    shepherd.emit('unhandledTopic', topic, message, packet);
};
module.exports = msghdlr;
