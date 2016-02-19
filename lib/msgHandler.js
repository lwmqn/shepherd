/*jslint node: true */
'use strict';

var _ = require('lodash'),
    Q = require('q');

var MqttNode = require('./mqtt-node'),
    mutils = require('./mutils');

module.exports = function msgHandler(shp, topic, message, packet) {
    // 'request/#', 'announce/#' were taken off
    // topics: 'register/*', 'deregister/*', 'notify/*', 'update/*', 'response/*', 'ping'
    // packet: { cmd: 'publish', messageId: 42, qos: 2, dup: false,
    //           topic: 'test', payload: new Buffer('test'), retain: false }
    // [NOTE] message is a buffer
    message = shp.decrypt(message);

    var topicItems = mutils.pathItems(topic),          // check and return the nice topic format
        intf = topicItems[0],                          // 'register' of example: 'register/ea:3c:4b:11:0e:6d'
        cId = topicItems[1] ? topicItems[1] : null;    // 'ea:3c:4b:11:0e:6d'

    if (cId === 'response')     // we dont accept an id like 'response', it is a reserved keyword
        return;

    var node = shp._nodebox[cId],
        msgStr = message.toString(),        // convert buffer to string
        parsedMsg = mutils.jsonify(msgStr), // jsonify the message, keep it as an string if get no object
        unknownIntf = false,
        messageHandler;

    parsedMsg = parsedMsg ? _.assign(parsedMsg, { clientId: cId }) : msgStr;    // all msgs must have clientId

    // deal with the unknown 'node' here, thus no need to check it in each _handler
    if (!node && intf !== 'register') {     // no node before 'register', continue if we received 'register'
        if (intf !== 'response') {          // need not send back while receiving a 'response'
            shp._responseSender(intf, cId, {
                transId: _.isObject(parsedMsg) ? parsedMsg.transId : null,
                status: mutils.rspCodeNum('NotFound')
            }).done();
        }
        return;
    }

    if (intf === 'lwt') {                   // last and will message
        parsedMsg = {
            clientId: cId,
            data: msgStr
        };
    }

    // if we are here, the node may exist, and it is alive, re-enable his life checker
    // if not register yet, got no node here
    if (node)
        node.enableLifeChecker();

    switch (intf) {
        case 'register':
            // reg_data = { clientId, transId, lifetime, version, objList, ip, mac, port(opt) }
            messageHandler = _clientRegisterHandler;
            break;
        case 'deregister':
            // dereg_data = { clientId, transId }; 
            messageHandler = _clientDeregisterHandler;
            break;
        case 'notify':
            // notify_data = { clientId, transId, oid, iid, rid, data }
            _.forEach(parsedMsg, function (val, key) {
                if (key === 'oid')
                    parsedMsg.oid = mutils.oidKey(val);
            });
            // we must get oid first, here is why another _.forEach() for getting rid key
            _.forEach(parsedMsg, function (val, key) {
                if (key === 'rid')
                    parsedMsg.rid = mutils.ridKey(parsedMsg.oid, val);
            });
            messageHandler = _clientNotifyHandler;
            break;
        case 'update':
            // update_data = { clientId, transId, lifeTime(opt), version(opt), objList(opt), ip(opt), mac(opt), port(opt) }
            messageHandler = _clientUpdateHandler;
            break;
        case 'response':
            // rsp_data = { clientId, transId, cmdId, status, data }
            parsedMsg.cmdId = mutils.cmdKey(parsedMsg.cmdId);
            messageHandler = _clientResponseHandler;
            break;
        case 'ping':
            // ping_data = { clientId, transId }
            messageHandler = _clientPingHandler;
            break;
        case 'lwt':
            // lwt_data = { clientId, data }
            messageHandler = _clientLwtHandler;
            break;
        default:
            // pass the orginal arguments to _clientOtherTopicsHandler()
            unknownIntf = true;
            messageHandler = _clientOtherTopicsHandler;
            break;
    }

    process.nextTick(function () {
        if (unknownIntf)
            messageHandler(shp, topic, message, packet);
        else
            messageHandler(shp, parsedMsg);
    });
};

/*************************************************************************************************/
/*** Handlers for Requests From Client                                                         ***/
/*************************************************************************************************/
function _clientRegisterHandler(shp, msg) {
    // reg_data = { clientId, transId, ip, mac, lifetime, version, objList, port(opt) }
    var shpId = shp.clientId,
        transId = msg.transId,
        acceptedAttrs = [ 'clientId', 'transId', 'lifetime', 'version', 'objList', 'mac', 'ip', 'port' ],
        node = shp._nodebox[msg.clientId],
        so = node ? node.so : null,
        badAttr = false,
        oList = {};

    // shp itself no need to be in nodebox
    if (msg.clientId === shpId)
        return;

    // unknown device attributes are not allowed
    _.forEach(msg, function (val, key) {
        if (!_.includes(acceptedAttrs, key))
            badAttr = true;
    });

    // mandatory attributes check (version and port are optional)
    _.forEach(acceptedAttrs, function (attrName) {
        if (attrName === 'version' || attrName === 'port')
            return;
        else if (!_.has(msg, attrName))
            badAttr = true;
    });

    if (badAttr) {
        shp._responseSender('register', msg.clientId, {
            transId: transId,
            status: mutils.rspCodeNum('BadRequest')
        }).done();
        return;
    }

    if (_.isString(msg.mac))    // mac address is unique and case-insensitive
        msg.mac = msg.mac.toLowerCase();

    if (!node && msg.clientId) {
        // do register procedure
        msg.objList = mutils.returnObjListOfSo(msg.objList);
        node = new MqttNode(shp, msg.clientId, msg);        // msg == devAttrs
        so = new MqttNode.SmartObject();
        node._registered = false;

        _clientObjectDetailReq(shp, msg.clientId, msg.objList).then(function (objs) {
            // [ { oid: oids[idx], data: obj }, ... ]
            _.forEach(objs, function (obj) {
                so.addIObjects(obj.oid, obj.data);
            });
        }).then(function () {
            node.bindSo(so);
            shp._nodebox[msg.clientId] = node;
            node.status = 'online';
            node._registered = true;
            return node.dbSave();
        }).fail(function (err) {
            node.status = 'offline';
            node._registered = false;
            node.dbRemove();
            node.so = null;
            so.node = null;
            shp._nodebox[msg.clientId] = null;
            delete shp._nodebox[msg.clientId];

            shp._responseSender('register', msg.clientId, {
                transId: transId,
                status: mutils.rspCodeNum('InternalServerError')
            }).done();
        }).done(function () {
            shp._responseSender('register', msg.clientId, {
                transId: transId,
                status: mutils.rspCodeNum('Created')
            }).done();
            node.enableLifeChecker();
            shp.emit('registered', node);
            shp.emit('IND:DEVICE_INCOMING', node);
        });

    } else {    // if node exists
        if (node.mac !== msg.mac) {
            shp._responseSender('register', msg.clientId, {
                transId: transId,
                status: mutils.rspCodeNum('Conflict')
            }).done();
        } else {
            msg._fromRegisterHandler = true;
            _clientUpdateHandler(shp, msg);
        }
    }
}

function _clientDeregisterHandler(shp, msg) {
    // dereg_data = { clientId }; 
    var node = shp._nodebox[msg.clientId];

    if (!node) {
        shp._responseSender('deregister', msg.clientId, {
            transId: msg.transId,
            status: mutils.rspCodeNum('NotFound')
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
        shp._nodebox[msg.clientId] = null;
        delete shp._nodebox[msg.clientId];

        shp._responseSender('deregister', msg.clientId, {
            transId: msg.transId,
            status: mutils.rspCodeNum('Deleted')
        }).done();
        shp.emit('deregistered', msg.clientId);
        // IND:DEVICE_LEAVING
        shp.emit('IND:DEVICE_LEAVING', msg.clientId);
    }
}

function _clientNotifyHandler(shepherd, msg) {
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
    } else if (_.isUndefined(msg.oid) || _.isNull(msg.oid) || _.isUndefined(msg.iid) || _.isNull(msg.iid)) {
        shepherd._responseSender('notify', msg.clientId, {
            transId: msg.transId,
            status: mutils.rspCodeNum('BadRequest')
        }).done();
        return;
    }

    node.status = 'online';

    robj = node.getRootObject(msg.oid);
    iobj = node.getIObject(msg.oid, msg.iid);

    if (_.isUndefined(msg.oid) || _.isNull(msg.oid) || _.isUndefined(msg.iid) || _.isNull(msg.iid) || !robj || !iobj) {
        shepherd._responseSender('notify', msg.clientId, {
            transId: msg.transId,
            status: mutils.rspCodeNum('NotFound')
        }).done();
        return;
    }

    if (_.isUndefined(msg.rid)) {   // data is object instance
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
                badResrc = badResrc || _.isUndefined(node.getResource(msg.oid, msg.iid, rid));
            });

            if (badResrc) {
                shepherd._responseSender('notify', msg.clientId, {
                    transId: msg.transId,
                    status: mutils.rspCodeNum('BadRequest')
                }).done();
                return;
            } else {
                shepherd.emit('notify', msg);
                node.updateObjectInstance(msg.oid, msg.iid, msg.data).then(function (diff) {
                    msg.data = diff;
                    shepherd.emit('notify_update', msg);
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
        resrc = node.getResource(msg.oid, msg.iid, msg.rid);
        if (_.isUndefined(resrc)) {
            shepherd._responseSender('notify', msg.clientId, {
                transId: msg.transId,
                status: mutils.rspCodeNum('NotFound')
            }).done();
            return;
        } else {
            shepherd.emit('notify', msg);
            node.updateResource(msg.oid, msg.iid, msg.rid, msg.data).then(function (diff) {
                msg.data = diff;
                shepherd.emit('notify_update', msg);
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
}

function _clientUpdateHandler(shp, msg) {
    // update_data = { clientId, transId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt), port(opt) }
    var node = shp._nodebox[msg.clientId],
        transId = msg.transId,
        acceptedAttrs = [ 'clientId', 'transId', 'lifetime', 'version', 'objList', 'mac', 'ip', 'port' ],
        badAttr = false,
        isFromRegister = msg._fromRegisterHandler,
        oldObjList,
        oldNodeData,
        so;

    // this msg is coming from register handler, delete the flag in msg
    delete msg._fromRegisterHandler;
    delete msg.transId;

    if (!node || !node.so) {
        shp._responseSender('update', msg.clientId, {
            transId: transId,
            status: mutils.rspCodeNum('NotFound')
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
            shp._responseSender('update', msg.clientId, {
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
        shp._responseSender('update', msg.clientId, {
            transId: transId,
            status: mutils.rspCodeNum('BadRequest')
        }).done();
        return;
    }

    msg.objList = mutils.returnObjListOfSo(msg.objList);

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

            _clientObjectDetailReq(shp, msg.clientId, msg.objList).then(function (objs) {
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
                    shp._responseSender('update', msg.clientId, {
                        transId: transId,
                        status: mutils.rspCodeNum('Changed')
                    }).done();
                }

                shp.emit('updated', { clientId: node.clientId, data: diff });
                shp.emit('IND:DEV_ATTR_CHANGED', { clientId: node.clientId, data: diff });
                // [TODO] instance update events?
            }).fail(function (err) {
                if (!isFromRegister) {
                    shp._responseSender('update', msg.clientId, {
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

            }).done();

            if (!isFromRegister) {
                shp._responseSender('update', msg.clientId, {
                    transId: transId,
                    status: mutils.rspCodeNum('Changed')
                }).done();
            }
            shp.emit('updated', { clientId: node.clientId, data: diff });

            if (!_.isEmpty(diff))
                shp.emit('IND:DEV_ATTR_CHANGED', { clientId: node.clientId, data: diff });
        }
    }).fail(function (err) {
        if (!isFromRegister) {
            shp._responseSender('update', msg.clientId, {
                transId: transId,
                status: mutils.rspCodeNum('InternalServerError')
            }).done();
        }
    }).done(function () {
        if (isFromRegister) { // if this msg is from register handler, send 'register' response to client
            shp.emit('registered', node);
            shp._responseSender('register', msg.clientId, {
                transId: transId,
                status: mutils.rspCodeNum('OK')
            }).done();
        }
    });
}

function _clientResponseHandler(shp, msg) {
    // rsp_data = { clientId, transId, cmdId, status, data }
    var node = shp._nodebox[msg.clientId],
        cmdNum = mutils.cmdNum(msg.cmdId) || msg.cmdId,
        rspEvt = msg.clientId + ':' + cmdNum + ':' + msg.transId;

    if (node && mutils.rspCodeKey(msg.status) !== 'Timeout')
        node.status = 'online';

    shp.emit(rspEvt, _.omit(msg, [ 'transId', 'clientId', 'cmdId' ]));
}

function _clientPingHandler(shp, msg) {
    // ping_data = { clientId, transId }
    var node = shp._nodebox[msg.clientId];
    if (node)
        node.status = 'online';

    shp._responseSender('ping', msg.clientId, {
        transId: msg.transId,
        status: mutils.rspCodeNum('OK')
    }).done();
}

function _clientLwtHandler(shp, msg) {
    // lwt_data = { clientId, data }
    var node = shp._nodebox[msg.clientId];
    if (node)
        node.status = 'offline';
}

function _clientOtherTopicsHandler(shp, topic, message, packet) {
    shp.emit('unhandledTopic', topic, message, packet);
}

function _clientObjectDetailReq(shp, clientId, objListOfSo) {
    var deferred = Q.defer(),
        readAllObjectPromises = [],
        oids = [];

    // read every object => dig into the structure and id-name transform
    _.forEach(objListOfSo, function (iids, oid) {
        var oidNum = mutils.oidNum(oid);
        readAllObjectPromises.push(shp.readReq(clientId, { oid: oidNum }));
        oids.push(oidNum);
    });

    Q.all(readAllObjectPromises).then(function (rsps) {
        var objs = [],
            isAnyFail = false;

        _.forEach(rsps, function (rsp, idx) {
            if (mutils.isGoodResponse(rsp.status))
                    objs.push({ oid: oids[idx], data: rsp.data });
            else
                isAnyFail = true;
        });

        if (isAnyFail)
            throw new Error('Object requests fail.');
        else
            return objs;
    }).fail(function (err) {
        deferred.reject(err);
    }).done(function (obs) {
        deferred.resolve(obs);
    });

    return deferred.promise;
}
