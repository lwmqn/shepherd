'use strict';

var Enum = require('enum'),
    _ = require('lodash');

var MDEFS = {};

MDEFS.getOidKey = function (oid) {
    var oidKey = this.OID.get(oid);

    if (oidKey)
        oidKey = oidKey.key;

    return oidKey;
};

MDEFS.getOidNumber = function (oid) {
    var oidNum = this.OID.get(oid);

    if (oidNum)
        oidNum = oidNum.value;

    return oidNum;
};

MDEFS._getRidEnum = function (oid, rid) {
    var oidKey,
        ridEnum;

    if (_.isUndefined(rid)) {
        if (_.isUndefined(oid)) throw new Error('Bad arguments');

        rid = oid;
        oid = undefined;
    }

    if (!_.isUndefined(oid)) {           // searching in MDEFS.RIDOFOID
        if (_.isUndefined(rid))
            throw new Error('rid should be given');

        oidKey = this.getOidKey(oid);
        ridEnum = _.isUndefined(oidKey) ? this.RID : this.RIDOFOID[oidKey];
        ridEnum = _.isUndefined(ridEnum) ? this.RID : ridEnum;
    } else {                            // searching in MDEFS.RID
        ridEnum = this.RID;
    }

    return ridEnum;
};

MDEFS.getRidKey = function (oid, rid) {
    var ridEnum = MDEFS._getRidEnum(oid, rid);
    console.log('0000000000000000000000000');
    console.log(ridEnum);
    return _.isUndefined(ridEnum) ? undefined : ridEnum.get(parseInt(rid)).key;
};

MDEFS.getRidNumber = function (oid, rid) {
    var ridEnum = MDEFS._getRidEnum(oid, rid);
    return _.isUndefined(ridEnum) ? undefined : ridEnum.get(rid).value;
};

module.exports = MDEFS;

/*************************************************************************************************/
/*** Smarthing Prototype                                                                       ***/
/*************************************************************************************************/
MDEFS.OID = new Enum({
    'lwm2mSecurity': 0,
    'lwm2mServer': 1,
    'accessControl': 2,
    'device': 3,
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
    'humidSensor': 3304,
    'pwrMea': 3305,
    'actuation': 3306,
    'setPoint': 3308,
    'loadCtrl': 3310,
    'lightCtrl': 3311,
    'pwrCtrl': 3312,
    'accelerometer': 3313,
    'magnetometer': 3314,
    'barometer': 3315
});

MDEFS.RID = new Enum({
    'objectInstanceHandle': 4000,
    'objectVersion': 4001,
    'dInState': 5500,
    'counter': 5501,
    'dInPolarity': 5502,
    'debouncePeriod': 5503,
    'edgeSelection': 5504,
    'counterReset': 5505,
    'dOutState': 5550,
    'dOutpolarity': 5551,
    'aInCurrValue': 5600,
    'minMeaValue': 5601,
    'maxMeaValue': 5602,
    'minRangeValue': 5603,
    'maxRangeValue': 5604,
    'resetMinMaxMeaValues': 5605,
    'aOutCurrValue': 5650,
    'sensorValue': 5700,
    'units': 5701,
    'xValue': 5702,
    'yValue': 5703,
    'zValue': 5704,
    'compassDir': 5705,
    'colour': 5706,
    'appType': 5750,
    'sensorType': 5751,
    'instActivePwr': 5800,
    'minMeaActivePwr': 5801,
    'maxMeaActivePwr': 5802,
    'minRangeActivePwr': 5803,
    'maxRangeActivePwr': 5804,
    'cumulActivePwr': 5805,
    'activePwrCal': 5806,
    'instReactivePwr': 5810,
    'minMeaReactivePwr': 5811,
    'maxMeaReactivePwr': 5812,
    'minRangeReactivePwr': 5813,
    'maxRangeReactivePwr': 5814,
    'cumulReactivePwr': 5815,
    'reactivePwrCal': 5816,
    'pwrFactor': 5820,
    'currCal': 5821,
    'resetCumulEnergy': 5822,
    'eventId': 5823,
    'startTime': 5824,
    'durationInMin': 5825,
    'criticalLevel': 5826,
    'avgLoadAdjPct': 5827,
    'dutyCycle': 5828,
    'onOff': 5850,
    'dimmer': 5851,
    'onTime': 5852,
    'mstateOut': 5853,
    'setPointValue': 5900,
    'busyToClearDelay': 5903,
    'clearToBusyDelay': 5904,
    'hostDeviceManuf': 5905,
    'hostDeviceMdl': 5906,
    'hostDeviceUID': 5907,
    'hostDeviceSwVer': 5908
});

MDEFS.RSPCODE = new Enum({
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

MDEFS.CMD = new Enum({
    'read': 0,
    'write': 1,
    'discover': 2,
    'writeAttrs': 3,
    'execute': 4,
    'observe': 5,
    'notify': 6,
    'unknown': 255
});

MDEFS.RIDOFOID = {
    lwm2mSecurity: new Enum({
        'lwm2mServerURI': 0,
        'bootstrapServer': 1,
        'securityMode': 2,
        'pubKeyId': 3,
        'serverPubKeyId': 4,
        'secretKey': 5,
        'smsSecurityMode': 6,
        'smsBindingKeyParam': 7,
        'smsBindingSecretKey': 8,
        'lwm2mServerSmsNum': 9,
        'shortServerId': 10,
        'clientHoldOffTime': 11
    }),
    lwm2mServer: new Enum({
        'shortServerId': 0,
        'lifetime': 1,
        'defaultMinPeriod': 2,
        'defaultMaxPeriod': 3,
        'disable': 4,
        'disableTimeout': 5,
        'notificationStoring': 6,
        'binding': 7,
        'regUpdateTrigger': 8
    }),
    accessControl: new Enum({
        'objectId': 0,
        'objectInstanceId': 1,
        'ACL': 2,
        'accessControlOwner': 3
    }),
    device: new Enum({
        'manuf': 0,
        'model': 1,
        'serial': 2,
        'firmware': 3,
        'reboot': 4,
        'factoryReset': 5,
        'availPwrSrc': 6,
        'pwrSrcVoltage': 7,
        'pwrSrcCurrent': 8,
        'battLevel': 9,
        'memFree': 10,
        'errCode': 11,
        'resetErrCode': 12,
        'currTime': 13,
        'UTCOffset': 14,
        'timezone': 15,
        'suppBindAndMode': 16,
        'devType': 17,
        'hwVer': 18,
        'swVer': 19,
        'battStatus': 20,
        'memTotal': 21,
    }),
    connMonitor: new Enum({
        'nwkBearer': 0,
        'availNwkBearer': 1,
        'radioSS': 2,
        'linkQuality': 3,
        'ip': 4,
        'routeIp': 5,
        'linkUtil': 6,
        'APN': 7,
        'cellId': 8,
        'SMNC': 9,
        'SMCC': 10
    }),
    firmware: new Enum({
        'package': 0,
        'packageURI': 1,
        'update': 2,
        'state': 3,
        'updateSuppObjects': 4,
        'updateResult': 5,
        'pkgName': 6,
        'pkgVer': 7
    }),
    location: new Enum({
        'lat': 0,
        'lon': 1,
        'alt': 2,
        'uncertainty': 3,
        'velocity': 4,
        'timestamp': 5
    }),
    connStatistics: new Enum({
        'SMSTxCounter': 0,
        'SMSRxCounter': 1,
        'txData': 2,
        'rxData': 3,
        'maxMsgSize': 4,
        'avgMsgSize': 5,
        'startOrReset': 6
    }),
    digitalInput: new Enum({
        'dInState': 5500,
        'counter': 5501,
        'dInPolarity': 5502,
        'debouncePeriod': 5503,
        'edgeSelection': 5504,
        'counterReset': 5505,
        'appType': 5750,
        'sensorType': 5751
    }),
    digitalOutput: new Enum({
        'dOutState': 5550,
        'dOutpolarity': 5551,
        'appType': 5750
    }),
    analogInput: new Enum({
        'aInCurrValue': 5600,
        'minMeaValue': 5601,
        'maxMeaValue': 5602,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'resetMinMaxMeaValues': 5605,
        'appType': 5750,
        'sensorType': 5751
    }),
    analogOutput: new Enum({
        'aOutCurrValue': 5650,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'appType': 5750
    }),
    genericSensor: new Enum({
        'sensorValue': 5700,
        'units': 5701,
        'minMeaValue': 5601,
        'maxMeaValue': 5602,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'resetMinMaxMeaValues': 5605,
        'appType': 5750,
        'sensorType': 5751
    }),
    illumSensor: new Enum({
        'sensorValue': 5700,
        'units': 5701,
        'minMeaValue': 5601,
        'maxMeaValue': 5602,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'resetMinMaxMeaValues': 5605,
    }),
    presenceSensor: new Enum({
        'dInState': 5500,
        'counter': 5501,
        'counterReset': 5505,
        'sensorType': 5751,
        'busyToClearDelay': 5903,
        'clearToBusyDelay': 5904,
    }),
    tempSensor: new Enum({
        'sensorValue': 5700,
        'units': 5701,
        'minMeaValue': 5601,
        'maxMeaValue': 5602,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'resetMinMaxMeaValues': 5605
    }),
    humidSensor: new Enum({
        'sensorValue': 5700,
        'units': 5701,
        'minMeaValue': 5601,
        'maxMeaValue': 5602,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'resetMinMaxMeaValues': 5605
    }),
    pwrMea: new Enum({
        'instActivePwr': 5800,
        'minMeaActivePwr': 5801,
        'maxMeaActivePwr': 5802,
        'minRangeActivePwr': 5803,
        'maxRangeActivePwr': 5804,
        'cumulActivePwr': 5805,
        'activePwrCal': 5806,
        'instReactivePwr': 5810,
        'minMeaReactivePwr': 5811,
        'maxMeaReactivePwr': 5812,
        'minRangeReactivePwr': 5813,
        'maxRangeReactivePwr': 5814,
        'resetMinMaxMeaValues': 5605,
        'cumulReactivePwr': 5815,
        'reactivePwrCal': 5816,
        'pwrFactor': 5820,
        'currCal': 5821,
        'resetCumulEnergy': 5822
    }),
    actuation: new Enum({
        'onOff': 5850,
        'dimmer': 5851,
        'onTime': 5852,
        'mstateOut': 5853,
        'appType': 5750
    }),
    setPoint: new Enum({
        'setPointValue': 5900,
        'colour': 5706,
        'units': 5701,
        'appType': 5750
    }),
    loadCtrl: new Enum({
        'eventId': 5823,
        'startTime': 5824,
        'durationInMin': 5825,
        'criticalLevel': 5826,
        'avgLoadAdjPct': 5827,
        'dutyCycle': 5828
    }),
    lightCtrl: new Enum({
        'onOff': 5850,
        'dimmer': 5851,
        'colour': 5706,
        'units': 5701,
        'onTime': 5852,
        'cumulActivePwr': 5805,
        'pwrFactor': 5820
    }),
    pwrCtrl: new Enum({
        'onOff': 5850,
        'dimmer': 5851,
        'onTime': 5852,
        'cumulActivePwr': 5805,
        'pwrFactor': 5820
    }),
    accelerometer: new Enum({
        'units': 5701,
        'xValue': 5702,
        'yValue': 5703,
        'zValue': 5704,
        'minRangeValue': 5603,
        'maxRangeValue': 5604
    }),
    magnetometer: new Enum({
        'units': 5701,
        'xValue': 5702,
        'yValue': 5703,
        'zValue': 5704,
        'compassDir': 5705
    }),
    barometer: new Enum({
        'sensorValue': 5700,
        'units': 5701,
        'minMeaValue': 5601,
        'maxMeaValue': 5602,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'resetMinMaxMeaValues': 5605,
    })
};

MDEFS.RESOURCEOFOID = {
    lwm2mSecurity: {
        lwm2mServerURI:      { access: null, multi: false, mand: true,  type: 'string',   range: 255,   init: ''    },
        bootstrapServer:     { access: null, multi: false, mand: true,  type: 'boolean',  range: null,  init: false },
        securityMode:        { access: null, multi: false, mand: true,  type: 'interger', range: 3,     init: false },
        pubKeyId:            { access: null, multi: false, mand: true,  type: 'opaque',   range: null,  init: 0     },
        serverPubKeyId:      { access: null, multi: false, mand: true,  type: 'opaque',   range: null,  init: 0     },
        secretKey:           { access: null, multi: false, mand: true,  type: 'opaque',   range: null,  init: 0     },
        smsSecurityMode:     { access: null, multi: false, mand: false, type: 'interger', range: 255,   init: 3     },
        smsBindingKeyParam:  { access: null, multi: false, mand: false, type: 'opaque',   range: 6,     init: 0     },
        smsBindingSecretKey: { access: null, multi: false, mand: false, type: 'opaque',   range: 48,    init: 0     },
        lwm2mServerSmsNum:   { access: null, multi: false, mand: false, type: 'interger', range: null,  init: 0     },
        shortServerId:       { access: null, multi: false, mand: false, type: 'interger', range: 65535, init: 1     },
        clientHoldOffTime:   { access: null, multi: false, mand: false, type: 'interger', range: null,  init: 0     }
    },    
    lwm2mServer: {
        shortServerId:       { access: 'R',  multi: false, mand: true,  type: 'interger', range: 65535, init: 1     },
        lifetime:            { access: 'RW', multi: false, mand: true,  type: 'interger', range: null,  init: 86400 },
        defaultMinPeriod:    { access: 'RW', multi: false, mand: false, type: 'interger', range: null,  init: 1     },
        defaultMaxPeriod:    { access: 'RW', multi: false, mand: false, type: 'interger', range: null,  init: 60    },
        disable:             { access: 'E',  multi: false, mand: false, type: 'execute',  range: null,  init: null  },
        disableTimeout:      { access: 'RW', multi: false, mand: false, type: 'interger', range: null,  init: 86400 },
        notificationStoring: { access: 'RW', multi: false, mand: true,  type: 'boolean',  range: null,  init: true  },
        binding:             { access: 'RW', multi: false, mand: true,  type: 'string',   range: null,  init: 'TCP' },
        regUpdateTrigger:    { access: 'E',  multi: false, mand: true,  type: 'execute',  range: null,  init: null  }
    },
    accessControl: {
        objectId:         { access: 'R',  multi: false,  mand: true,  type: 'interger', range: 65534, init: 1 },    // 1-65534
        objectInstanceId: { access: 'R',  multi: false,  mand: true,  type: 'interger', range: 65535, init: 0 },
        ACL:              { access: 'RW', multi: true,   mand: false, type: 'interger', range: 65535, init: 0 },
        ACLOwner:         { access: 'RW', multi: false,  mand: true,  type: 'interger', range: 65535, init: 0 }
    },
    device: {
        manuf:           { access: 'R',  multi: false,  mand: false, type: 'string',   range: null, init: 'freebird'       },
        model:           { access: 'R',  multi: false,  mand: false, type: 'string',   range: null, init: 'freebird-smarthing-v1' },
        serial:          { access: 'R',  multi: false,  mand: false, type: 'string',   range: null, init: 'fb-0000-0001'   },
        firmware:        { access: 'R',  multi: false,  mand: false, type: 'string',   range: null, init: '0.0.1'          },
        reboot:          { access: 'E',  multi: false,  mand: true,  type: 'execute',  range: null, init: null             },
        factoryReset:    { access: 'E',  multi: false,  mand: false, type: 'execute',  range: null, init: null             },
        availPwrSrc:     { access: 'R',  multi: true,   mand: false, type: 'interger', range: 7,    init: 0                },
        pwrSrcVoltage:   { access: 'R',  multi: true,   mand: false, type: 'interger', range: null, init: 3300             },
        pwrSrcCurrent:   { access: 'R',  multi: true,   mand: false, type: 'interger', range: null, init: 0                },
        battLevel:       { access: 'R',  multi: false,  mand: false, type: 'interger', range: 100,  init: 100              },
        memFree:         { access: 'R',  multi: false,  mand: false, type: 'interger', range: null, init: 0                },
        errCode:         { access: 'R',  multi: true,   mand: true,  type: 'interger', range: 8,    init: 0                },
        resetErrCode:    { access: 'E',  multi: true,   mand: false, type: 'execute',  range: null, init: null             },
        currTime:        { access: 'RW', multi: false,  mand: false, type: 'time',     range: null, init: 0                },
        UTCOffset:       { access: 'RW', multi: false,  mand: false, type: 'string',   range: null, init: 'UTC+08:00'      },
        timezone:        { access: 'RW', multi: false,  mand: false, type: 'string',   range: null, init: 'Asia/Taipei'    },
        suppBindAndMode: { access: 'R',  multi: false,  mand: true,  type: 'string',   range: null, init: 'TCP'            },
        devType:         { access: 'R',  multi: false,  mand: false, type: 'string',   range: null, init: 'mqtt-smarthing' },
        hwVer:           { access: 'R',  multi: false,  mand: false, type: 'string',   range: null, init: '0.0.1'          },
        swVer:           { access: 'R',  multi: false,  mand: false, type: 'string',   range: null, init: '0.0.1'          },
        battStatus:      { access: 'R',  multi: false,  mand: false, type: 'interger', range: 6,    init: 0                },
        memTotal:        { access: 'R',  multi: false,  mand: false, type: 'interger', range: null, init: 0                },
    },
    connMonitor: {
        nwkBearer:      { access: 'R', multi: false,  mand: true,  type: 'interger', range: null, init: 21     },
        availNwkBearer: { access: 'R', multi: true,   mand: true,  type: 'interger', range: null, init: 21     },
        radioSS:        { access: 'R', multi: false,  mand: true,  type: 'interger', range: null, init: 64     },
        linkQuality:    { access: 'R', multi: false,  mand: false, type: 'interger', range: null, init: 100    },
        ip:             { access: 'R', multi: true,   mand: true,  type: 'string',   range: null, init: ''     },
        routeIp:        { access: 'R', multi: true,   mand: false, type: 'string',   range: null, init: ''     },
        linkUtil:       { access: 'R', multi: false,  mand: false, type: 'interger', range: 100,  init: 50     },
        APN:            { access: 'R', multi: true,   mand: false, type: 'string',   range: null, init: ''     },
        cellId:         { access: 'R', multi: false,  mand: false, type: 'interger', range: null, init: 1      },
        SMNC:           { access: 'R', multi: false,  mand: false, type: 'interger', range: null, init: 0      },
        SMCC:           { access: 'R', multi: false,  mand: false, type: 'interger', range: null, init: 0      }
    },
    firmware: {
        package:           { access: 'W',  multi: false, mand: true,  type: 'opaque',   range: null, init: 0       },
        packageURI:        { access: 'W',  multi: false, mand: true,  type: 'string',   range: 255,  init: ''      },
        update:            { access: 'E',  multi: false, mand: true,  type: 'execute',  range: null, init: null    },
        state:             { access: 'R',  multi: false, mand: true,  type: 'interger', range: 3,    init: 1       },
        updateSuppObjects: { access: 'RW', multi: false, mand: false, type: 'boolean',  range: null, init: false   },
        updateResult:      { access: 'R',  multi: false, mand: true,  type: 'interger', range: 6,    init: 0       },
        pkgName:           { access: 'R',  multi: false, mand: false, type: 'string',   range: 255,  init: ''      },
        pkgVer:            { access: 'R',  multi: false, mand: false, type: 'string',   range: 255,  init: ''      }
    },
    location: {
        lat:         { access: 'R', multi: false, mand: true,  type: 'string', range: null, init: '0.00'   },
        lon:         { access: 'R', multi: false, mand: true,  type: 'string', range: null, init: '0.00'   },
        alt:         { access: 'R', multi: false, mand: false, type: 'string', range: null, init: '0.00'   },
        uncertainty: { access: 'R', multi: false, mand: false, type: 'string', range: null, init: '0.00'   },
        velocity:    { access: 'R', multi: false, mand: false, type: 'opaque', range: null, init: 0        },
        timestamp:   { access: 'R', multi: false, mand: true,  type: 'time',   range: null, init: 0        }
    },
    connStatistics: {
        SMSTxCounter: { access: 'R', multi: false, mand: false, type: 'interger', range: null, init: 0     },
        SMSRxCounter: { access: 'R', multi: false, mand: false, type: 'interger', range: null, init: 0     },
        txData:       { access: 'R', multi: false, mand: false, type: 'interger', range: null, init: 0     },
        rxData:       { access: 'R', multi: false, mand: false, type: 'interger', range: null, init: 0     },
        maxMsgSize:   { access: 'R', multi: false, mand: false, type: 'interger', range: null, init: 0     },
        avgMsgSize:   { access: 'R', multi: false, mand: false, type: 'interger', range: null, init: 0     },
        startOrReset: { access: 'E', multi: false, mand: true,  type: 'execute',  range: null, init: null  }
    },
    digitalInput: {
        dInState:       { access: 'R',  multi: false, mand: true,  type: 'boolean',  range: null, init: false            },
        counter:        { access: 'R',  multi: false, mand: false, type: 'interger', range: null, init: 0                },
        dInPolarity:    { access: 'RW', multi: false, mand: false, type: 'boolean',  range: null, init: false            },
        debouncePeriod: { access: 'RW', multi: false, mand: false, type: 'interger', range: null, init: 0                },
        edgeSelection:  { access: 'RW', multi: false, mand: false, type: 'interger', range: 3,    init: 2                },
        counterReset:   { access: 'E',  multi: false, mand: false, type: 'opaque',   range: null, init: null             },
        appType:        { access: 'RW', multi: false, mand: false, type: 'string',   range: null, init: 'Digital Input'  },
        sensorType:     { access: 'R',  multi: false, mand: false, type: 'string',   range: null, init: 'Digital'        }
    },
    digitalOutput: {
        dOutState:    { access: 'RW', multi: false, mand: true,  type: 'boolean', range: null, init: false               },
        dOutpolarity: { access: 'RW', multi: false, mand: false, type: 'boolean', range: null, init: false               },
        appType:      { access: 'RW', multi: false, mand: false, type: 'string',  range: null, init: 'Digital Output'    }
    },
    analogInput: {
        aInCurrValue:         { access: 'R',  multi: false, mand: true,  type: 'float',  range: null, init: 0              },
        minMeaValue:          { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0              },
        maxMeaValue:          { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0              },
        minRangeValue:        { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0              },
        maxRangeValue:        { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0              },
        resetMinMaxMeaValues: { access: 'E',  multi: false, mand: false, type: 'opaque', range: null, init: null           },
        appType:              { access: 'RW', multi: false, mand: false, type: 'string', range: null, init: 'Analog Input' },
        sensorType:           { access: 'R',  multi: false, mand: false, type: 'string', range: null, init: 'Analog'       }
    },
    analogOutput: {
        aOutCurrValue: { access: 'RW', multi: false, mand: true,  type: 'float',  range: null, init: 0               },
        minRangeValue: { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0               },
        maxRangeValue: { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0               },
        appType:       { access: 'RW', multi: false, mand: false, type: 'string', range: null, init: 'Analog Output' }
    },
    genericSensor: {
        sensorValue:          { access: 'R',  multi: false, mand: true,  type: 'float',  range: null, init: 0                },
        units:                { access: 'R',  multi: false, mand: false, type: 'string', range: null, init: 'uint'           },
        minMeaValue:          { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0                },
        maxMeaValue:          { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0                },
        minRangeValue:        { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0                },
        maxRangeValue:        { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0                },
        resetMinMaxMeaValues: { access: 'E',  multi: false, mand: false, type: 'opaque', range: null, init: null             },
        appType:              { access: 'RW', multi: false, mand: false, type: 'string', range: null, init: 'Generic Sensor' },
        sensorType:           { access: 'R',  multi: false, mand: false, type: 'string', range: null, init: 'Generic'        }
    },
    illumSensor: {
        sensorValue:          { access: 'R', multi: false, mand: true,  type: 'float',  range: null, init: 0     },
        units:                { access: 'R', multi: false, mand: false, type: 'string', range: null, init: 'lux' },
        minMeaValue:          { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        maxMeaValue:          { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        minRangeValue:        { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        maxRangeValue:        { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        resetMinMaxMeaValues: { access: 'E', multi: false, mand: false, type: 'opaque', range: null, init: null  },
    },
    presenceSensor: {
        dInState:         { access: 'R',  multi: false, mand: true,  type: 'boolean',  range: null, init: false      },
        counter:          { access: 'R',  multi: false, mand: false, type: 'interger', range: null, init: 0          },
        counterReset:     { access: 'E',  multi: false, mand: false, type: 'opaque',   range: null, init: null       },
        sensorType:       { access: 'R',  multi: false, mand: false, type: 'string',   range: null, init: 'Presence' },
        busyToClearDelay: { access: 'RW', multi: false, mand: false, type: 'integer',  range: null, init: 0          },
        clearToBusyDelay: { access: 'RW', multi: false, mand: false, type: 'integer',  range: null, init: 0          },
    },
    tempSensor: {
        sensorValue:          { access: 'R', multi: false, mand: true,  type: 'float',  range: null, init: 0     },
        units:                { access: 'R', multi: false, mand: false, type: 'string', range: null, init: 'Cel' },
        minMeaValue:          { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        maxMeaValue:          { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        minRangeValue:        { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        maxRangeValue:        { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        resetMinMaxMeaValues: { access: 'E', multi: false, mand: false, type: 'opaque', range: null, init: null  }
    },
    humidSensor: {
        sensorValue:          { access: 'R', multi: false, mand: true,  type: 'float',  range: null, init: 0     },
        units:                { access: 'R', multi: false, mand: false, type: 'string', range: null, init: '%'   },
        minMeaValue:          { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        maxMeaValue:          { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        minRangeValue:        { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        maxRangeValue:        { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        resetMinMaxMeaValues: { access: 'E', multi: false, mand: false, type: 'opaque', range: null, init: null  }
    },
    pwrMea: {
        instActivePwr:        { access: 'R',  multi: false, mand: true,  type: 'float',  range: null, init: 0     },
        minMeaActivePwr:      { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        maxMeaActivePwr:      { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        minRangeActivePwr:    { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        maxRangeActivePwr:    { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        cumulActivePwr:       { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        activePwrCal:         { access: 'W',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        instReactivePwr:      { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        minMeaReactivePwr:    { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        maxMeaReactivePwr:    { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        minRangeReactivePwr:  { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        maxRangeReactivePwr:  { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        resetMinMaxMeaValues: { access: 'E',  multi: false, mand: false, type: 'opaque', range: null, init: null  },
        cumulReactivePwr:     { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        reactivePwrCal:       { access: 'W',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        pwrFactor:            { access: 'R',  multi: false, mand: false, type: 'float',  range: null, init: 0     },
        currCal:              { access: 'RW', multi: false, mand: false, type: 'float',  range: null, init: 0     },
        resetCumulEnergy:     { access: 'E',  multi: false, mand: false, type: 'opaque', range: null, init: null  }
    },
    actuation: {
        onOff:     { access: 'RW', multi: false, mand: true,  type: 'boolean',  range: null, init: false         },
        dimmer:    { access: 'RW', multi: false, mand: false, type: 'interger', range: 100,  init: 0             },
        onTime:    { access: 'RW', multi: false, mand: false, type: 'interger', range: 100,  init: 0             },
        mstateOut: { access: 'RW', multi: false, mand: false, type: 'string',   range: null, init: 'Pilot Wire'  },
        appType:   { access: 'RW', multi: false, mand: false, type: 'string',   range: null, init: 'Actuator'    }
    },
    setPoint: {
        setPointValue: { access: 'RW', multi: false, mand: true,  type: 'float',  range: null, init: 0           },
        colour:        { access: 'RW', multi: false, mand: false, type: 'string', range: 100,  init: '#fff'      },
        units:         { access: 'R',  multi: false, mand: false, type: 'string', range: null, init: 'uint'      },
        appType:       { access: 'RW', multi: false, mand: false, type: 'string', range: null, init: 'Set Point' }
    },
    loadCtrl: {
        eventId:       { access: 'RW', multi: false, mand: true,  type: 'string',   range: null, init: 'evt01'   },
        startTime:     { access: 'RW', multi: false, mand: true,  type: 'time',     range: null, init: 0         },
        durationInMin: { access: 'RW', multi: false, mand: true,  type: 'interger', range: null, init: 0         },
        criticalLevel: { access: 'R',  multi: false, mand: false, type: 'interger', range: 3,    init: 0         },
        avgLoadAdjPct: { access: 'RW', multi: false, mand: false, type: 'interger', range: 100,  init: 0         },
        dutyCycle:     { access: 'RW', multi: false, mand: false, type: 'interger', range: 100,  init: 0         }
    },
    lightCtrl: {
        onOff:          { access: 'RW', multi: false, mand: true,  type: 'boolean',  range: null, init: false    },
        dimmer:         { access: 'RW', multi: false, mand: false, type: 'interger', range: 100,  init: 0        },
        colour:         { access: 'RW', multi: false, mand: false, type: 'string',   range: 100,  init: '#fff'   },
        units:          { access: 'R',  multi: false, mand: false, type: 'string',   range: null, init: 'uint'   },
        onTime:         { access: 'RW', multi: false, mand: false, type: 'interger', range: 100,  init: 0        },
        cumulActivePwr: { access: 'R',  multi: false, mand: false, type: 'float',    range: null, init: 0        },
        pwrFactor:      { access: 'R',  multi: false, mand: false, type: 'float',    range: null, init: 0        }
    },
    pwrCtrl: {
        onOff:          { access: 'RW', multi: false, mand: true,  type: 'boolean',  range: null, init: false    },
        dimmer:         { access: 'RW', multi: false, mand: false, type: 'interger', range: 100,  init: 0        },
        onTime:         { access: 'RW', multi: false, mand: false, type: 'interger', range: 100,  init: 0        },
        cumulActivePwr: { access: 'R',  multi: false, mand: false, type: 'float',    range: null, init: 0        },
        pwrFactor:      { access: 'R',  multi: false, mand: false, type: 'float',    range: null, init: 0        }
    },
    accelerometer: {
        xValue:        { access: 'R', multi: false, mand: true,  type: 'float',  range: null, init: 0        },
        yValue:        { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0        },
        zValue:        { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0        },
        units:         { access: 'R', multi: false, mand: false, type: 'string', range: null, init: 'uint'   },
        minRangeValue: { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0        },
        maxRangeValue: { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0        }
    },
    magnetometer: {
        xValue:     { access: 'R', multi: false, mand: true,  type: 'float',  range: null, init: 0        },
        yValue:     { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0        },
        zValue:     { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0        },
        units:      { access: 'R', multi: false, mand: false, type: 'string', range: null, init: 'uint'   },
        compassDir: { access: 'R', multi: false, mand: false, type: 'float',  range: 360,  init: 0        }
    },
    barometer: {
        sensorValue:          { access: 'R', multi: false, mand: true,  type: 'float',  range: null, init: 0        },
        units:                { access: 'R', multi: false, mand: false, type: 'string', range: null, init: 'uint'   },
        minMeaValue:          { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0        },
        maxMeaValue:          { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0        },
        minRangeValue:        { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0        },
        maxRangeValue:        { access: 'R', multi: false, mand: false, type: 'float',  range: null, init: 0        },
        resetMinMaxMeaValues: { access: 'E', multi: false, mand: false, type: 'opaque', range: null, init: null     },
    }
};

