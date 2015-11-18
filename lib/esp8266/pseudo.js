var _ = require('lodash'),
    mq = require('mq');

// var device = mq.newObject();
var sensor1 = mq.newObject('tempSensor');   // sensor1 gets tempSensor template
var sensor2 = mq.newObject('tempSensor');
var sensor3 = mq.newObject('humidSensor');

var so = mq.newSmartObject();               // do we need name?
so.build([ device, sensor1, sensor2, sensor3 ]);

var clientId = 'mq-' + so.ip;

var reg_rsp_topic = 'register/response/' + clientId,
    dereg_rsp_topic = 'deregister/response/' + clientId,
    update_rsp_topic = 'update/response/' + clientId,
    notify_rsp_topic = 'notify/response/' + clientId,
    request_req_topic = 'request/' + clientId;

mq.on(reg_rsp_topic, function (msg) {
    // register ok?
});

mq.on(dereg_rsp_topic, function (msg) {
    // deregister ok?
});

mq.on(request_req_topic, function (msg) {
    // { transId, cmd, oid, iid, rid, data }
    var target,
        val,
        rsp = {
            transId: msg.transId,
            cmdId: msg.cmdId,
            data: null
        };

    if (msg.oid)
        target = so[oid];

    if (msg.iid)
        target = target[iid];

    if (msg.rid)
        target = target[rid];

    switch (cmd) {
        case 0:     // read
            if (_.isFunction(target))
                rsp.data = target('read');
            else
                rsp.data = target;  // rsp.data = target.dump()
                mq.readRsp(rsp);
            break;

        case 1:
            if (_.isFunction(target))
                target('write', msg.data);
            else
                target = msg.data;
                mq.writeRsp(rsp);
            break;
        
        default:
            break;
    }
});


// MDEFS.CMD = new Enum({
//     'read': 0,
//     'write': 1,
//     'discover': 2,
//     'writeAttrs': 3,
//     'execute': 4,
//     'observe': 5,
//     'notify': 6,
//     'unknown': 255
// });

/*************************************************************************************************/
/*** Smart Object Class                                                                        ***/
/*************************************************************************************************/
function SmartObject(name, ipObjects) {
    this.name = name;
}

SmartObject.prototype.addIpObject= function (ipObject) {
    var target = this[ipObject.oid] = this[ipObject.oid] || {},
        iidNum = 0;

    while (target[iidNum]) {
        iidNum += 1;
    }

    target[iidNum] = ipObject;
    ipObject.iid = iidNum;

    return iidNum;
};

SmartObject.prototype.build = function (ipObjects) {
    var self = this;

    ipObjects.forEach(function (obj) {
        self.addIpObject(obj);
    });
};

SmartObject.prototype.dump = function () {

};

SmartObject.prototype.readResrc = function (oid, iid, rid) {
    if (_.isUndefined(iid) || _.isNull(iid))
        iid = 0;

    var ipObj = this[oid][iid];
    return ipObj.readResrc(rid);
};

SmartObject.prototype.writeResrc = function (oid, iid, rid, value) {
    if (_.isUndefined(iid) || _.isNull(iid))
        iid = 0;

    var ipObj = this[oid][iid];
    return ipObj.writeResrc(rid, value);
};

/*************************************************************************************************/
/*** Object Class                                                                              ***/
/*************************************************************************************************/
function IpObject(oid, rids) {
    var self = this;

    this.oid = oid;

    rids = rids || ridsOfOid[oid];
    rids.forEach(function (rid) {
        this[rid] = null;
    });
}

IpObject.prototype.initResrc = function (rid, value, read, write) {
    var resrc = this[rid];

    if (_.isFunction (value)) {
        if (_.isFunction (read))
            write = read;
        read = value;

        resrc = {
            read: read,
            write: write
        };
    } else {
        resrc = value;
    }

    return this;
};

IpObject.prototype.readResrc = function (rid) {
    var resrc = this[rid];

    if (_.isUndefined(resrc))
        return;

    if (_.isObject(resrc)) {            // [TODO] how about array
        if (_.isFunction(resrc.read))
            return resrc.read();
    } else {
        return resrc;
    }
};

IpObject.prototype.writeResrc = function (rid, data) {
    var resrc = this[rid];

    if (_.isUndefined(resrc))
        return;

    if (_.isObject(resrc)) {
        if (_.isFunction(resrc.write))
            return resrc.write(data);
    } else {
        resrc = data;
        return resrc;
    }
};

IpObject.prototype.dump = function () {
    var self = this,
        data = {};

    _.forEach(this, function (n, key) {
        if (!_.isFunction(n)) {
            data[key] = self.readResrc(key);
        }
    });
};


/*var ridsOfOid = {
    'lwm2mSecurity': 0,
    'lwm2mServer': 1,
    'accessControl': 2,
    'device': [ 0, 17, 1, 2, 18, 3, 19, 4, 5, 6, 7, 8, 9, 20, 10, 21, 11, 12, 13, 14, 15, 16 ],
    'connMonitor': 4,
    'firmware': 5,
    'location': 6,
    'connStatistics': 7,
    'lockAndWipe': 8,
    'swUpdate': 9,
    'cellularConn': 10,
    'apnConnProfile': 11,
    'wlanConn': 12,
    'bearerSelection': 13,
    'devCapMgmt': 14,
    'cmdhPolicy': 2048,
    'activeCmdhPolicy': 2049,
    'cmdhDefaults': 2050,
    'CmdhDefEcValues': 2051,
    'cmdhDefEcParamsValues': 2052,
    'CmdhLimits': 2053,
    'CmdhNetworkAccessRules': 2054,
    'CmdhNwAccessRule': 2055,
    'CmdhBuffer': 2056,
    'digitalInput': 3200,
    'digitalOutput': 3201,
    'analogInput': 3202,
    'analogOutput': 3203,
    'genericSensor': 3300,
    'illumSensor': 3301,
    'presenceSensor': 3302,
    'tempSensor': 3303,
    'humidSensor': 3304,    'pwrMea': 3305,
    'actuation': 3306,
    'setPoint': 3308,
    'loadCtrl': 3310,
    'lightCtrl': 3311,
    'pwrCtrl': 3312,
    'accelerometer': 3313,
    'magnetometer': 3314,
    'barometer': 3315
};*/