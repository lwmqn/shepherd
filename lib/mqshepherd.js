'use strict';

const util = require('util'),
      _ = require('lodash'),
      mosca = require('mosca'),
      mqtt = require('mqtt'),
      mqdb = require('./mqdb'),
      network = require('network'),
      Q = require('q'),
      SO = require('./SmartObject'),
      MDEFS = require('./defs/mdefs'),
      OID = MDEFS.OID,
      RID = MDEFS.RID,
      RSPCODE = MDEFS.RSPCODE;

const SmartObjects = {
    // clientId: {}
};

var rspPendingPromises = {
    // clientId: { cmd: { transid: deferred } }
};

function MShepherd() {

}

MShepherd.protoype._registerHandler = function (msg) {
    var self = this,
        readAllObjectPromises = [],
        so = SmartObjects[msg.clientId],
        rspObj = {
            intf: 'register',
            status: RSPCODE.OK.value
        };

    if (_.isUndefined(so)) {
        // do register procedure
        so = new SO(msg.clientId, msg);
        SmartObjects[msg.clientId] = so;

        _.forEach(msg, function (item) {
            so.objList[item.oid] = so.objList[item.oid] || [];
            so.objList[item.oid].push(item.iid);
        });

        // read every object => dig into the structure and id-name transform
        _.forEach(so.objList, function (oid) {
            var prom = so.readObject(oid);
            readAllObjectPromises.push(prom);
        });

        Q.all(readAllObjectPromises).then(function () {
            so.enableLifeCheck();
            self._responseSender(so.clientId, rspObj)
                .then(function () {
                    self.emit('registered', so);
                });
        });
    } else {
        // do update procedure
        // [TODO]: Better hand off to _updateHandler
        so.update();    // update dev attr
        so.enableLifeCheck();
        self.emit('updated', so);   // [TODO]: send diff or what
    }

    this._responseSender(clientId, rspObj);
};

MShepherd.protoype._deregisterHandler = function (msg) {
    var clientId = msg.clientId,
        so = SmartObjects[clientId],
        rspObj = {
            intf: 'deregister',
            status: RSPCODE.OK.value
        };

    if (so) {
        delete SmartObjects[clientId];
        // [TODO]: clear database
        // then: this._responseSender(clientId, rspObj);
    } else {
        rspObj.status = RSPCODE.NotFound.value;
        this._responseSender(clientId, rspObj);
    }
};

MShepherd.protoype._notifyHandler = function (msg) {
    var self = this,
        clientId = msg.clientId,
        so = SmartObjects[clientId],
        rspObj = {
            intf: 'notify',
            status: RSPCODE.OK.value
        };

    if (so) {
        // [TODO]
    } else {
        rspObj.status = RSPCODE.NotFound.value;
        this._responseSender(clientId, rspObj);
    }
};

MShepherd.protoype._updateHandler = function (msg) {
    var self= this,
        clientId = msg.clientId,
        so = SmartObjects[clientId],
        rspObj = {
            intf: 'update',
            status: RSPCODE.OK.value
        };

    if (so) {
        // [TODO]
    } else {
        rspObj.status = RSPCODE.NotFound.value;
        this._responseSender(clientId, rspObj);
    }
};

MShepherd.protoype._clientResponseHandler = function (msg) {
    var self= this,
        clientId = msg.clientId,
        clientProms = rspPendingPromises[clientId],
        cmdProms = clientProms ? clientProms[msg.cmd] : undefined,
        cmdProm = cmdProms ? cmdProms[msg.transId] : undefined;


    if (cmdProm) {
        cmdProm.resolve(msg.data);
        delete rspPendingPromises[clientId][msg.cmd][msg.transId];
        if (_.isEmpty(cmdProms)) {
            delete rspPendingPromises[clientId][msg.cmd];

            if (_.isEmpty(clientProms)) {
                delete rspPendingPromises[clientId];
            }
        }
    }
};

// shepherd -> pheripheral
MShepherd.protoype._responseSender = function (clientId, rspObj, callback) {  // { intf: 'register', status: 200 }
    var deferred = Q.defer(),
        topic = `{$rspObj.intf}/{$clientId}/`,
        msg;

        delete rspObj.intf;

        msg = JSON.stringify(rspObj);

    this.publish(topic, msg, { qos: 1, retain: false }, function () {
        deferred.resolve();
    });

    return deferred.promise.nodeify(callback);
};

// shepherd -> pheripheral
MShepherd.protoype._requestSender = function (clientId, reqObj, callback) {
    var deferred = Q.defer(),
        topic = `request/{$clientId}/`,
        msg;

        reqObj.transId = this.nextTransId();
        msg = JSON.stringify(reqObj);

    this.cmdPend(clientId, reqObj, deferred);
    this.publish(topic, msg, { qos: 1, retain: false });

    return deferred.promise.nodeify(callback);
};
