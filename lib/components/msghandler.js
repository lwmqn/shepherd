var Q = require('q'),
    _ = require('busyman');

var mutils = require('./mutils'),
    MqttNode = require('./mqtt-node');

var debug = require('debug'),
    ERR = debug('err');

var msghdlr = {};

msghdlr._clientRegisterHandler = function (shepherd, msg) {
    // reg_data = { clientId, transId, ip, mac, lifetime, version, objList, port(opt) }
    var shepherdId = shepherd.clientId,
        transId = msg.transId,
        acceptedAttrs = [ 'clientId', 'transId', 'lifetime', 'version', 'objList', 'mac', 'ip' ],
        qnode = shepherd.find(msg.clientId),
        so = qnode ? qnode.so : null,
        badAttr = false,
        oList = {};

    // shepherd itself no need to be in nodebox
    if (msg.clientId === shepherdId)
        return;

    // unknown device attributes are not allowed
    _.forEach(msg, function (val, key) {
        if (!_.includes(acceptedAttrs, key))
            badAttr = true;
    });

    // mandatory attributes check (version is optional)
    _.forEach(acceptedAttrs, function (attrName) {
        if (!_.has(msg, attrName) && (attrName !== 'version'))
            badAttr = true;
    });

    if (badAttr) {
        shepherd._responseSender('register', msg.clientId, {
            transId: transId,
            status: mutils.rspCodeNum('BadRequest')
        }).done();
        return;
    }

    if (_.isString(msg.mac))    // mac address is unique and case-insensitive
        msg.mac = msg.mac.toLowerCase();

    if (!qnode && msg.clientId) {
        // do register procedure

        qnode = new MqttNode(shepherd, msg.clientId, msg);   // msg == devAttrs
        so = qnode.so;

        qnode._registered = false;
        qnode._setStatus('online');
        shepherd._nodebox[msg.clientId] = qnode;

        msghdlr._clientObjectDetailReq(shepherd, msg.clientId, msg.objList).then(function (objs) {
            // [ { oid: x, data: obj }, ... ]
            _.forEach(objs, function (obj) {
                so.addIObjects(obj.oid, obj.data);
            });
        }).then(function () {
            qnode._registered = true;
            return qnode.dbSave();
        }).then(function () {
            shepherd._responseSender('register', msg.clientId, {
                transId: transId,
                status: mutils.rspCodeNum('Created')
            }).done();
            qnode.enableLifeChecker();
            shepherd.emit('registered', qnode);
            shepherd.emit('ind:incoming', qnode);
        }).fail(function (err) {
            ERR(err);
            qnode._setStatus('offline');
            qnode._registered = false;
            qnode.dbRemove().done();
            qnode.so = null;
            shepherd._nodebox[msg.clientId] = null;
            delete shepherd._nodebox[msg.clientId];
            shepherd._responseSender('register', msg.clientId, {
                transId: transId,
                status: mutils.rspCodeNum('InternalServerError')
            }).done();
        }).done();

    } else {    // if node exists
        if (qnode.mac !== msg.mac) {
            shepherd._responseSender('register', msg.clientId, {
                transId: transId,
                status: mutils.rspCodeNum('Conflict')
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
            status: mutils.rspCodeNum('NotFound')
        }).done();
        return;
    } else {
        node._setStatus('online');
        so = node.so;
        oldNodeData = node.dump();
        oldObjList = node.objList;
    }

    if (!isFromRegister && _.has(msg, 'mac')) {
        msg.mac = msg.mac.toLowerCase();

        if (node.mac !== msg.mac) {
            shepherd._responseSender('update', msg.clientId, {
                transId: transId,
                status: mutils.rspCodeNum('Conflict')
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
            status: mutils.rspCodeNum('BadRequest')
        }).done();
        return;
    }

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
                        status: mutils.rspCodeNum('Changed')
                    }).done();
                }

                shepherd.emit('updated', { clientId: node.clientId, data: diff });
                // shepherd.emit('ind:updated', { clientId: node.clientId, data: diff });
                shepherd.emit('ind:updated', node, diff);
            }).fail(function (err) {
                ERR(err);
                if (!isFromRegister) {
                    shepherd._responseSender('update', msg.clientId, {
                        transId: transId,
                        status: mutils.rspCodeNum('InternalServerError')
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
                    status: mutils.rspCodeNum('Changed')
                }).done();
            }

            if (!_.isEmpty(diff)) {
                shepherd.emit('updated', { clientId: node.clientId, data: diff });
                // shepherd.emit('ind:updated', { clientId: node.clientId, data: diff });
                shepherd.emit('ind:updated', node, diff);
            }
        }
    }).fail(function (err) {
        ERR(err);
        if (!isFromRegister) {
            shepherd._responseSender('update', msg.clientId, {
                transId: transId,
                status: mutils.rspCodeNum('InternalServerError')
            }).done();
        }
    }).done(function () {
        if (isFromRegister) { // if this msg is from register handler, send 'register' response to client
            shepherd.emit('registered', node);
            shepherd.emit('ind:incoming', node);
            shepherd._responseSender('register', msg.clientId, {
                transId: transId,
                status: mutils.rspCodeNum('OK')
            }).done();
        }
    });
};

msghdlr._clientDeregisterHandler = function (shepherd, msg) {
    // dereg_data = { clientId }; 
    var node = shepherd._nodebox[msg.clientId],
        macAddr;

    if (!node) {
        shepherd._responseSender('deregister', msg.clientId, {
            transId: msg.transId,
            status: mutils.rspCodeNum('NotFound')
        }).done();
    } else {
        macAddr = node.mac;
        node.disableLifeChecker();
        node._registered = false;
        node._setStatus('offline');
        node.dbRemove().done();
        node.so = null;
        delete node.so;
        shepherd._nodebox[msg.clientId] = null;
        delete shepherd._nodebox[msg.clientId];

        shepherd._responseSender('deregister', msg.clientId, {
            transId: msg.transId,
            status: mutils.rspCodeNum('Deleted')
        }).done(function () {
            shepherd.emit('deregistered', msg.clientId);
            shepherd.emit('ind:leaving', msg.clientId, macAddr);
        });
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
            status: mutils.rspCodeNum('NotFound')
        }).done();
        return;
    } else if (_.isNil(msg.oid) || _.isNil(msg.iid)) {
        shepherd._responseSender('notify', msg.clientId, {
            transId: msg.transId,
            status: mutils.rspCodeNum('BadRequest')
        }).done();
        return;
    }

    node._setStatus('online');

    robj = node.so.acquire(msg.oid);
    iobj = node.so.acquire(msg.oid, msg.iid);

    if (!robj || !iobj) {
        shepherd._responseSender('notify', msg.clientId, {
            transId: msg.transId,
            status: mutils.rspCodeNum('NotFound')
        }).done();
        return;
    }

    if (_.isNil(msg.rid)) {   // data is object instance
        if (!_.isPlainObject(msg.data)) {
            shepherd._responseSender('notify', msg.clientId, {
                transId: msg.transId,
                status: mutils.rspCodeNum('BadRequest')
            }).done();
            return;
        } else {
            var badResrc = false;
            _.forEach(msg.data, function (val, rid) {
                var ridKey = mutils.ridKey(msg.oid, rid);
                delete msg.data[rid];
                msg.data[ridKey] = val;
                badResrc = badResrc || _.isUndefined(node.so.acquire(msg.oid, msg.iid, rid));
            });

            if (badResrc) {
                shepherd._responseSender('notify', msg.clientId, {
                    transId: msg.transId,
                    status: mutils.rspCodeNum('BadRequest')
                }).done();
                return;
            } else {
                shepherd.emit('ind:notified', node, msg);
                var ipath = msg.oid + '/' + msg.iid;
                node._checkAndUpdate(ipath, msg.data).then(function (diff) {
                    msg.data = diff;
                    return shepherd._responseSender('notify', msg.clientId, {
                        transId: msg.transId,
                        status: mutils.rspCodeNum('Changed')
                    });
                }).fail(function (err) {
                    shepherd.emit('error', err);
                    shepherd._responseSender('notify', msg.clientId, {
                        transId: msg.transId,
                        status: mutils.rspCodeNum('InternalServerError')
                    });
                }).done();
            }
        }
    } else {                        // data is an resource
        resrc = node.so.acquire(msg.oid, msg.iid, msg.rid);
        if (_.isUndefined(resrc)) {
            shepherd._responseSender('notify', msg.clientId, {
                transId: msg.transId,
                status: mutils.rspCodeNum('NotFound')
            }).done();
            return;
        } else {
            shepherd.emit('ind:notified', node, msg);

            var rpath = msg.oid + '/' + msg.iid + '/' + msg.rid;
            node._checkAndUpdate(rpath, msg.data).then(function (diff) {
                msg.data = diff;
                return shepherd._responseSender('notify', msg.clientId, {
                    transId: msg.transId,
                    status: mutils.rspCodeNum('Changed')
                });
            }).fail(function (err) {
                shepherd.emit('error', err);
                shepherd._responseSender('notify', msg.clientId, {
                    transId: msg.transId,
                    status: mutils.rspCodeNum('InternalServerError')
                });
            }).done();
        }
    }
};

msghdlr._clientResponseHandler = function (shepherd, msg) {
    var cmdIdString = mutils.cmdKey(msg.cmdId),
        evt;

    cmdIdString = cmdIdString ? cmdIdString : msg.cmdId;
    evt = msg.clientId + ':' + cmdIdString + ':' + msg.transId; // 'foo_id:2:101'
    shepherd.emit(evt, _.omit(msg, [ 'transId', 'clientId', 'cmdId' ]));
};

msghdlr._clientPingHandler = function (shepherd, msg) {
    // ping_data = { clientId, transId }
    var node = shepherd._nodebox[msg.clientId];
    if (node)
        node._setStatus('online');

    shepherd._responseSender('ping', msg.clientId, {
        transId: msg.transId,
        status: mutils.rspCodeNum('OK')
    }).done();
};

msghdlr._clientLwtHandler = function (shepherd, msg) {
    // lwt_data = { clientId, data }
    var node = shepherd._nodebox[msg.clientId];
    if (node)
        node._setStatus('offline');
};

msghdlr._clientBadMsgHandler = function (shepherd, cId, intf, msg) {
    var node = shepherd._nodebox[cId];
    if (node)
        node._setStatus('online');

    shepherd._responseSender(intf, cId, {
        transId: 0,
        status: mutils.rspCodeNum('BadRequest')
    }).done();
};

msghdlr._clientOtherTopicsHandler = function (shepherd, topic, message, packet) {
    shepherd.emit('unhandledTopic', topic, message, packet);
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
                objs.push({
                    oid: oids[idx],
                    data: rsp.data
                });
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

module.exports = msghdlr;
