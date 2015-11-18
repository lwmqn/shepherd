var util = require('util'),
    _ = require('lodash'),
    mqtt = require('mqtt');

var subRootTopics = [
    'register/response', 'deregister/response', 'notify/response',
    'update/response', 'ping/response', 'request', 'announce'
];

function PseudoClient(clientId) {
    this.clientId = clientId || 'pseudo_client';
    this.mc = null;
    this.so = null;
    this.SmartObject = SmartObject;
    this.IpObject = IpObject;

    this.on('_connected', this._connectedHandler);
    this.on('_request', this._requestHandler);
}

util.inherits(PseudoClient, EventEmitter);
module.exports = PseudoClient;

PseudoClient.prototype.registerSmartObject = function (so) {
    this.so = so;
};

PseudoClient.prototype.connect = function (brokerUrl, opts) {
    var mc = this.mc = mqtt.connect(brokerUrl, opts);

    mc.on('connect', function (connack) {
        pClient.emit('connect', mc);
    });

    mc.on('reconnect', function () {
        pClient.emit('reconnect');
    });

    mc.on('close', function () {
        pClient.emit('close');
    });

    mc.on('offline', function () {
        pClient.emit('offline');
    });

    mc.on('error', function (err) {
        pClient.emit('error', err);
    });

    return mc;
};

PseudoClient.prototype._connectedHandler = function (mc) {
    var self = this,
        subTopics = subRootTopics.map(function (t) {
            if (t !== 'announce')
                t = t + '/' + self.clientId;

            return t;
        });

    mc.subscribe(subTopics);

    mc.on('message', function (topic, message, packet) {
        var msg,
            evt;

        if (message instanceof Buffer)
            message = message.toString();

        msg = (message instanceof Buffer) ? message.toString() : message;

        if (msg[0] === '{' && msg[msg.length-1] === '}')
            msg = JSON.parse(msg);

        switch (topic) {
            case subTopics[0]:
                evt = 'reg_rsp';
                break;
            case subTopics[1]:
                evt = 'dereg_rsp';
                break;
            case subTopics[2]:
                evt = 'notify_rsp';
                break;
            case subTopics[3]:
                evt = 'update_rsp';
                break;
            case subTopics[4]:
                evt = 'ping_rsp';
                break;
            case subTopics[5]:
                evt = 'request';
                break;
            case subTopics[6]:
                evt = 'announce';
                break;
            default:
                break;
        }

        if (evt) {

            if (evt === 'request')
                pClient.emit('_request', msg);

            pClient.emit(evt, msg);
        }
    });
};

PseudoClient.prototype._requestHandler = function (msg) {
    var ipObj,
        ipObjInstance,
        ipResrc,
        oid = msg.oid,
        iid = msg.iid,
        rid = msg.rid,
        targetType = '',
        rspData;

    if (!_.isUndefined(oid) || !_.isNull(oid)) {
        ipObj = this.so[oid];
        targetType = 'object';
    }

    if (!_.isUndefined(iid) || !_.isNull(iid)) {
        ipObjInstance = this.so[oid][iid];
        targetType = 'instance';
    }

    if (!_.isUndefined(rid) || !_.isNull(rid)) {
        ipResrc = this.so[oid][iid][rid];
        targetType = 'resource';
    }


    switch (msg.cmdId) {
        case 0:     // read
            if (targetType === 'object')
                rspData = ipObj.dump();

            if (targetType === 'instance')
                rspData = ipObjInstance.dump();

            if (targetType === 'resource')
                rspData = ipObjInstance.readResrc(rid);
            break;
        case 1:     // write
            // if (targetType === 'object')         // not supported 
            // if (targetType === 'instance')       // not supported 
            if (targetType === 'resource')
                rspData = ipObjInstance.writeResrc(rid, msg.data);
            break;
        case 2:     // discover
            break;
        case 3:     // writeAttrs
            break;
        case 4:     // execute, leave it to developers
            break;
        case 5:     // observe
            break;
        case 6:     // notify, this is not a request, do nothing
            break;
        default:    // unknown
            break;
    }
};
/*************************************************************************************************/
/*** Smart Object Class                                                                        ***/
/*************************************************************************************************/
function SmartObject(name, ipObjects) {
    this.name = name;
    this.attrs = {
        pmin: 10,
        pmax: 60,
        gt: null,
        lt: null,
        step: null
    };
}

SmartObject.prototype.addIpObject = function (ipObject) {
    var target = this[ipObject.oid] = this[ipObject.oid] || {},
        iidNum = 0;

    while (target[iidNum]) {
        iidNum += 1;
    }

    target[iidNum] = ipObject;
    ipObject.iid = iidNum;
    ipObject.owner = this;

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

    this.owner = null;
    this.oid = oid;
    this.attrs = undefined;

    this.resrcAttrs = {};

    rids = rids || ridsOfOid[oid];
    rids.forEach(function (rid) {
        this[rid] = null;
    });
}

IpObject.prototype.setAttrs = function (attrs) {
    this.attrs = attrs;
};

IpObject.prototype.findAttrs = function () {
    var attrs = this.attrs;
    if (_.isUndefined(attrs))
        attrs = this.owner.attrs;

    return attrs;
};

IpObject.prototype.getAttrs = function () {
    return this.attrs;
};

IpObject.prototype.getResrcAttrs = function (rid) {
    return this.resrcAttrs[rid];
};

IpObject.prototype.setResrcAttrs = function (rid, attrs) {
    this.resrcAttrs[rid] = attrs;
};

IpObject.prototype.findResrcAttrs = function (rid) {
    var resrcAttrs = this.resrcAttrs[rid];

    if (_.isUndefined(resrcAttrs))
        resrcAttrs = this.attrs;

    if (_.isUndefined(resrcAttrs))
        resrcAttrs = this.owner.attrs;

    return resrcAttrs;
};

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
    // [TODO] check observation
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
    // [TODO] check observation
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

// [TODO]
IpObject.prototype.enableResrcReporter = function (rid, attrs) {
    if (attrs)
        this.setResrcAttrs(rid, attrs);
    else
        this.getResrcAttrs(rid);


};

IpObject.prototype.cancelResrcReporter = function (rid, attrs) {
    
};

IpObject.prototype.resrcChecker = function (rid, currentValue) {
    var resrcAttrs = this.findResrcAttrs(rid),
        lastReportedValue = this.reported[rid];

    if (resrcAttrs.gt && currentValue > resrcAttrs.gt) {
        // need report
        this.reported[rid] = currentValue;
    }

    if (resrcAttrs.lt && currentValue < resrcAttrs.lt) {
        // need report
        this.reported[rid] = currentValue;
    }

    if (resrcAttrs.step && Math.abs(currentValue - lastReportedValue) > resrcAttrs.step) {
        // need report
        this.reported[rid] = currentValue;
    }
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