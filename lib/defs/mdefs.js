'use strict';

var Enum = require('enum');
var MDEFS = {};
module.exports = MDEFS;


var supportedBoilerplateOid = new Enum({
    'lwm2mSecurity': 0,
    'lwm2mServer': 1,
    'accessControl': 2,
    'device': 3,
    'connMonitor': 4,
    'firmware': 5,
    'location': 6,
    'connStatistics': 7,
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

var supportedBoilerplateRids = {
    lwm2mSecurity: new Enum({
        lwm2mServerURI: 0,
        bootstrapServer: 1,
        securityMode: 2,
        pubKeyId: 3,
        serverPubKeyId: 4,
        secretKey: 5,
        smsSecurityMode: 6,
        smsBindingKeyParam: 7,
        smsBindingSecretKey: 8,
        lwm2mServerSmsNum: 9,
        shortServerId: 10,
        clientHoldOffTime: 11
    }),
    lwm2mServer: new Enum({
        shortServerId: 0,
        lifetime: 1,
        defaultMinPeriod: 2,
        defaultMaxPeriod: 3,
        disable: 4,
        disableTimeout: 5,
        notificationStoring: 6,
        binding: 7,
        regUpdateTrigger: 8
    }),
    accessControl: new Enum({
        objectId: 0,
        objectInstanceId: 1,
        ACL: 2,
        accessControlOwner: 3
    }),
    device: new Enum({
        manuf: 0,
        model: 1,
        serial: 2,
        firmware: 3,
        reboot: 4,
        factoryReset: 5,
        availPwrSrc: 6,
        pwrSrcVoltage: 7,
        pwrSrcCurrent: 8,
        battLevel: 9,
        memFree: 10,
        errCode: 11,
        resetErrCode: 12,
        currTime: 13,
        UTCOffset: 14,
        timezone: 15,
        suppBindAndMode: 16,
        devType: 17,
        hwVer: 18,
        swVer: 19,
        battStatus: 20,
        memTotal: 21,
    }),
    connMonitor: new Enum({
        nwkBearer: 0,
        availNwkBearer: 1,
        radioSS: 2,
        linkQuality: 3,
        ip: 4,
        routeIp: 5,
        linkUtil: 6,
        APN: 7,
        cellId: 8,
        SMNC: 9,
        SMCC: 10
    }),
    firmware: new Enum({
        package: 0,
        packageURI: 1,
        update: 2,
        state: 3,
        updateSuppObjects: 4,
        updateResult: 5,
        pkgName: 6,
        pkgVer: 7
    }),
    location: new Enum({
        lat: 0,
        lon: 1,
        alt: 2,
        uncertainty: 3,
        velocity: 4,
        timestamp: 5
    }),
    connStatistics: new Enum({
        SMSTxCounter: 0,
        SMSRxCounter: 1,
        txData: 2,
        rxData: 3,
        maxMsgSize: 4,
        avgMsgSize: 5,
        startOrReset: 6
    }),
    digitalInput: {
        'dInState': 5500,
        'counter': 5501,
        'dInPolarity': 5502,
        'debouncePeriod': 5503,
        'edgeSelection': 5504,
        'counterReset': 5505,
        'appType': 5750,
        'sensorType': 5751
    },
    digitalOutput: {
        'dOutState': 5550,
        'dOutpolarity': 5551,
        'appType': 5750
    },
    analogInput: {
        'aInCurrValue': 5600,
        'minMeaValue': 5601,
        'maxMeaValue': 5602,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'resetMinMaxMeaValues': 5605,
        'appType': 5750,
        'sensorType': 5751
    },
    analogOutput: {
        'aOutCurrValue': 5650,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'appType': 5750
    },
    genericSensor: {
        'sensorValue': 5700,
        'units': 5701,
        'minMeaValue': 5601,
        'maxMeaValue': 5602,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'resetMinMaxMeaValues': 5605,
        'appType': 5750,
        'sensorType': 5751
    },
    illumSensor: {
        'sensorValue': 5700,
        'units': 5701,
        'minMeaValue': 5601,
        'maxMeaValue': 5602,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'resetMinMaxMeaValues': 5605,
    },
    presenceSensor: {
        'dInState': 5500,
        'counter': 5501,
        'counterReset': 5505,
        'sensorType': 5751,
        'busyToClearDelay': 5903,
        'clearToBusyDelay': 5904,
    },
    tempSensor: {
        'sensorValue': 5700,
        'units': 5701,
        'minMeaValue': 5601,
        'maxMeaValue': 5602,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'resetMinMaxMeaValues': 5605
    },
    humidSensor: {
        'sensorValue': 5700,
        'units': 5701,
        'minMeaValue': 5601,
        'maxMeaValue': 5602,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'resetMinMaxMeaValues': 5605
    },
    pwrMea: {
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
    },
    actuation: {
        'onOff': 5850,
        'dimmer': 5851,
        'onTime': 5852,
        'mstateOut': 5853,
        'appType': 5750
    },
    setPoint: {
        'setPointValue': 5900,
        'colour': 5706,
        'units': 5701,
        'appType': 5750
    },
    loadCtrl: {
        'eventId': 5823,
        'startTime': 5824,
        'durationInMin': 5825,
        'criticalLevel': 5826,
        'avgLoadAdjPct': 5827,
        'dutyCycle': 5828
    },
    lightCtrl: {
        'onOff': 5850,
        'dimmer': 5851,
        'colour': 5706,
        'units': 5701,
        'onTime': 5852,
        'cumulActivePwr': 5805,
        'pwrFactor': 5820
    },
    pwrCtrl: {
        'onOff': 5850,
        'dimmer': 5851,
        'onTime': 5852,
        'cumulActivePwr': 5805,
        'pwrFactor': 5820
    },
    accelerometer: {
        'units': 5701,
        'xValue': 5702,
        'yValue': 5703,
        'zValue': 5704,
        'minRangeValue': 5603,
        'maxRangeValue': 5604
    },
    magnetometer: {
        'units': 5701,
        'xValue': 5702,
        'yValue': 5703,
        'zValue': 5704,
        'compassDir': 5705
    },
    barometer: {
        'sensorValue': 5700,
        'units': 5701,
        'minMeaValue': 5601,
        'maxMeaValue': 5602,
        'minRangeValue': 5603,
        'maxRangeValue': 5604,
        'resetMinMaxMeaValues': 5605,
    }
};

var supportedBoilerplateRids = {
    lwm2mSecurity: {
        lwm2mServerURI:      { ops: null, single: true, mand: true,  type: 'string',   range: 255,   init: ''    },
        bootstrapServer:     { ops: null, single: true, mand: true,  type: 'boolean',  range: null,  init: false },
        securityMode:        { ops: null, single: true, mand: true,  type: 'interger', range: 3,     init: false },
        pubKeyId:            { ops: null, single: true, mand: true,  type: 'opaque',   range: null,  init: 0     },
        serverPubKeyId:      { ops: null, single: true, mand: true,  type: 'opaque',   range: null,  init: 0     },
        secretKey:           { ops: null, single: true, mand: true,  type: 'opaque',   range: null,  init: 0     },
        smsSecurityMode:     { ops: null, single: true, mand: false, type: 'interger', range: 255,   init: 3     },
        smsBindingKeyParam:  { ops: null, single: true, mand: false, type: 'opaque',   range: 6,     init: 0     },
        smsBindingSecretKey: { ops: null, single: true, mand: false, type: 'opaque',   range: 48,    init: 0     },
        lwm2mServerSmsNum:   { ops: null, single: true, mand: false, type: 'interger', range: null,  init: 0     },
        shortServerId:       { ops: null, single: true, mand: false, type: 'interger', range: 65535, init: 1     },
        clientHoldOffTime:   { ops: null, single: true, mand: false, type: 'interger', range: null,  init: 0     }
    },    
    lwm2mServer: {
        shortServerId:       { ops: 'R',  single: true, mand: true,  type: 'interger', range: 65535, init: 1     },
        lifetime:            { ops: 'RW', single: true, mand: true,  type: 'interger', range: null,  init: 86400 },
        defaultMinPeriod:    { ops: 'RW', single: true, mand: false, type: 'interger', range: null,  init: 1     },
        defaultMaxPeriod:    { ops: 'RW', single: true, mand: false, type: 'interger', range: null,  init: 60    },
        disable:             { ops: 'E',  single: true, mand: false, type: 'execute',  range: null,  init: null  },
        disableTimeout:      { ops: 'RW', single: true, mand: false, type: 'interger', range: null,  init: 86400 },
        notificationStoring: { ops: 'RW', single: true, mand: true,  type: 'boolean',  range: null,  init: true  },
        binding:             { ops: 'RW', single: true, mand: true,  type: 'string',   range: null,  init: 'TCP' },
        regUpdateTrigger:    { ops: 'E',  single: true, mand: true,  type: 'execute',  range: null,  init: null  }
    },
    accessControl: {
        objectId:         { ops: 'R',  single: true,  mand: true,  type: 'interger', range: 65534, init: 1 },    // 1-65534
        objectInstanceId: { ops: 'R',  single: true,  mand: true,  type: 'interger', range: 65535, init: 0 },
        ACL:              { ops: 'RW', single: false, mand: false, type: 'interger', range: 65535, init: 0 },
        ACLOwner:         { ops: 'RW', single: true,  mand: true,  type: 'interger', range: 65535, init: 0 }
    },
    device: {
        manuf:           { ops: 'R',  single: true,  mand: false, type: 'string',   range: null, init: 'freebird'       },
        model:           { ops: 'R',  single: true,  mand: false, type: 'string',   range: null, init: 'freebird-smarthing-v1' },
        serial:          { ops: 'R',  single: true,  mand: false, type: 'string',   range: null, init: 'fb-0000-0001'   },
        firmware:        { ops: 'R',  single: true,  mand: false, type: 'string',   range: null, init: '0.0.1'          },
        reboot:          { ops: 'E',  single: true,  mand: true,  type: 'execute',  range: null, init: null             },
        factoryReset:    { ops: 'E',  single: true,  mand: false, type: 'execute',  range: null, init: null             },
        availPwrSrc:     { ops: 'R',  single: false, mand: false, type: 'interger', range: 7,    init: 0                },
        pwrSrcVoltage:   { ops: 'R',  single: false, mand: false, type: 'interger', range: null, init: 3300             },
        pwrSrcCurrent:   { ops: 'R',  single: false, mand: false, type: 'interger', range: null, init: 0                },
        battLevel:       { ops: 'R',  single: true,  mand: false, type: 'interger', range: 100,  init: 100              },
        memFree:         { ops: 'R',  single: true,  mand: false, type: 'interger', range: null, init: 0                },
        errCode:         { ops: 'R',  single: false, mand: true,  type: 'interger', range: 8,    init: 0                },
        resetErrCode:    { ops: 'E',  single: false, mand: false, type: 'execute',  range: null, init: null             },
        currTime:        { ops: 'RW', single: true,  mand: false, type: 'time',     range: null, init: 0                },
        UTCOffset:       { ops: 'RW', single: true,  mand: false, type: 'string',   range: null, init: 'UTC+08:00'      },
        timezone:        { ops: 'RW', single: true,  mand: false, type: 'string',   range: null, init: 'Asia/Taipei'    },
        suppBindAndMode: { ops: 'R',  single: true,  mand: true,  type: 'string',   range: null, init: 'TCP'            },
        devType:         { ops: 'R',  single: true,  mand: false, type: 'string',   range: null, init: 'mqtt-smarthing' },
        hwVer:           { ops: 'R',  single: true,  mand: false, type: 'string',   range: null, init: '0.0.1'          },
        swVer:           { ops: 'R',  single: true,  mand: false, type: 'string',   range: null, init: '0.0.1'          },
        battStatus:      { ops: 'R',  single: true,  mand: false, type: 'interger', range: 6,    init: 0                },
        memTotal:        { ops: 'R',  single: true,  mand: false, type: 'interger', range: null, init: 0                },
    },
    connMonitor: {
        nwkBearer:      { ops: 'R', single: true,  mand: true,  type: 'interger', range: null, init: 21     },
        availNwkBearer: { ops: 'R', single: false, mand: true,  type: 'interger', range: null, init: 21     },
        radioSS:        { ops: 'R', single: true,  mand: true,  type: 'interger', range: null, init: 64     },
        linkQuality:    { ops: 'R', single: true,  mand: false, type: 'interger', range: null, init: 100    },
        ip:             { ops: 'R', single: false, mand: true,  type: 'string',   range: null, init: ''     },
        routeIp:        { ops: 'R', single: false, mand: false, type: 'string',   range: null, init: ''     },
        linkUtil:       { ops: 'R', single: true,  mand: false, type: 'interger', range: 100,  init: 50     },
        APN:            { ops: 'R', single: false, mand: false, type: 'string',   range: null, init: ''     },
        cellId:         { ops: 'R', single: true,  mand: false, type: 'interger', range: null, init: 1      },
        SMNC:           { ops: 'R', single: true,  mand: false, type: 'interger', range: null, init: 0      },
        SMCC:           { ops: 'R', single: true,  mand: false, type: 'interger', range: null, init: 0      }
    },
    firmware: {
        package:           { ops: 'W',  single: true, mand: true,  type: 'opaque',   range: null, init: 0       },
        packageURI:        { ops: 'W',  single: true, mand: true,  type: 'string',   range: 255,  init: ''      },
        update:            { ops: 'E',  single: true, mand: true,  type: 'execute',  range: null, init: null    },
        state:             { ops: 'R',  single: true, mand: true,  type: 'interger', range: 3,    init: 1       },
        updateSuppObjects: { ops: 'RW', single: true, mand: false, type: 'boolean',  range: null, init: false   },
        updateResult:      { ops: 'R',  single: true, mand: true,  type: 'interger', range: 6,    init: 0       },
        pkgName:           { ops: 'R',  single: true, mand: false, type: 'string',   range: 255,  init: ''      },
        pkgVer:            { ops: 'R',  single: true, mand: false, type: 'string',   range: 255,  init: ''      }
    },
    location: {
        lat:         { ops: 'R', single: true, mand: true,  type: 'string', range: null, init: '0.00'   },
        lon:         { ops: 'R', single: true, mand: true,  type: 'string', range: null, init: '0.00'   },
        alt:         { ops: 'R', single: true, mand: false, type: 'string', range: null, init: '0.00'   },
        uncertainty: { ops: 'R', single: true, mand: false, type: 'string', range: null, init: '0.00'   },
        velocity:    { ops: 'R', single: true, mand: false, type: 'opaque', range: null, init: 0        },
        timestamp:   { ops: 'R', single: true, mand: true,  type: 'time',   range: null, init: 0        }
    },
    connStatistics: {
        SMSTxCounter: { ops: 'R', single: true, mand: false, type: 'interger', range: null, init: 0     },
        SMSRxCounter: { ops: 'R', single: true, mand: false, type: 'interger', range: null, init: 0     },
        txData:       { ops: 'R', single: true, mand: false, type: 'interger', range: null, init: 0     },
        rxData:       { ops: 'R', single: true, mand: false, type: 'interger', range: null, init: 0     },
        maxMsgSize:   { ops: 'R', single: true, mand: false, type: 'interger', range: null, init: 0     },
        avgMsgSize:   { ops: 'R', single: true, mand: false, type: 'interger', range: null, init: 0     },
        startOrReset: { ops: 'E', single: true, mand: true,  type: 'execute',  range: null, init: null  }
    },
    digitalInput: {
        dInState:       { ops: 'R',  single: true, mand: true,  type: 'boolean',  range: null, init: false            },
        counter:        { ops: 'R',  single: true, mand: false, type: 'interger', range: null, init: 0                },
        dInPolarity:    { ops: 'RW', single: true, mand: false, type: 'boolean',  range: null, init: false            },
        debouncePeriod: { ops: 'RW', single: true, mand: false, type: 'interger', range: null, init: 0                },
        edgeSelection:  { ops: 'RW', single: true, mand: false, type: 'interger', range: 3,    init: 2                },
        counterReset:   { ops: 'E',  single: true, mand: false, type: 'opaque',   range: null, init: null             },
        appType:        { ops: 'RW', single: true, mand: false, type: 'string',   range: null, init: 'Digital Input'  },
        sensorType:     { ops: 'R',  single: true, mand: false, type: 'string',   range: null, init: 'Digital'        }
    },
    digitalOutput: {
        dOutState:    { ops: 'RW', single: true, mand: true,  type: 'boolean', range: null, init: false               },
        dOutpolarity: { ops: 'RW', single: true, mand: false, type: 'boolean', range: null, init: false               },
        appType:      { ops: 'RW', single: true, mand: false, type: 'string',  range: null, init: 'Digital Output'    }
    },
    analogInput: {
        aInCurrValue:         { ops: 'R',  single: true, mand: true,  type: 'float',  range: null, init: 0              },
        minMeaValue:          { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0              },
        maxMeaValue:          { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0              },
        minRangeValue:        { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0              },
        maxRangeValue:        { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0              },
        resetMinMaxMeaValues: { ops: 'E',  single: true, mand: false, type: 'opaque', range: null, init: null           },
        appType:              { ops: 'RW', single: true, mand: false, type: 'string', range: null, init: 'Analog Input' },
        sensorType:           { ops: 'R',  single: true, mand: false, type: 'string', range: null, init: 'Analog'       }
    },
    analogOutput: {
        aOutCurrValue: { ops: 'RW', single: true, mand: true,  type: 'float',  range: null, init: 0               },
        minRangeValue: { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0               },
        maxRangeValue: { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0               },
        appType:       { ops: 'RW', single: true, mand: false, type: 'string', range: null, init: 'Analog Output' }
    },
    genericSensor: {
        sensorValue:          { ops: 'R',  single: true, mand: true,  type: 'float',  range: null, init: 0                },
        units:                { ops: 'R',  single: true, mand: false, type: 'string', range: null, init: 'uint'           },
        minMeaValue:          { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0                },
        maxMeaValue:          { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0                },
        minRangeValue:        { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0                },
        maxRangeValue:        { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0                },
        resetMinMaxMeaValues: { ops: 'E',  single: true, mand: false, type: 'opaque', range: null, init: null             },
        appType:              { ops: 'RW', single: true, mand: false, type: 'string', range: null, init: 'Generic Sensor' },
        sensorType:           { ops: 'R',  single: true, mand: false, type: 'string', range: null, init: 'Generic'        }
    },
    illumSensor: {
        sensorValue:          { ops: 'R', single: true, mand: true,  type: 'float',  range: null, init: 0     },
        units:                { ops: 'R', single: true, mand: false, type: 'string', range: null, init: 'lux' },
        minMeaValue:          { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0     },
        maxMeaValue:          { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0     },
        minRangeValue:        { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0     },
        maxRangeValue:        { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0     },
        resetMinMaxMeaValues: { ops: 'E', single: true, mand: false, type: 'opaque', range: null, init: null  },
    },
    presenceSensor: {
        dInState:         { ops: 'R',  single: true, mand: true,  type: 'boolean',  range: null, init: false      },
        counter:          { ops: 'R',  single: true, mand: false, type: 'interger', range: null, init: 0          },
        counterReset:     { ops: 'E',  single: true, mand: false, type: 'opaque',   range: null, init: null       },
        sensorType:       { ops: 'R',  single: true, mand: false, type: 'string',   range: null, init: 'Presence' },
        busyToClearDelay: { ops: 'RW', single: true, mand: false, type: 'integer',  range: null, init: 0          },
        clearToBusyDelay: { ops: 'RW', single: true, mand: false, type: 'integer',  range: null, init: 0          },
    },
    tempSensor: {
        sensorValue:          { ops: 'R', single: true, mand: true,  type: 'float',  range: null, init: 0     },
        units:                { ops: 'R', single: true, mand: false, type: 'string', range: null, init: 'Cel' },
        minMeaValue:          { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0     },
        maxMeaValue:          { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0     },
        minRangeValue:        { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0     },
        maxRangeValue:        { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0     },
        resetMinMaxMeaValues: { ops: 'E', single: true, mand: false, type: 'opaque', range: null, init: null  }
    },
    humidSensor: {
        sensorValue:          { ops: 'R', single: true, mand: true,  type: 'float',  range: null, init: 0     },
        units:                { ops: 'R', single: true, mand: false, type: 'string', range: null, init: '%'   },
        minMeaValue:          { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0     },
        maxMeaValue:          { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0     },
        minRangeValue:        { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0     },
        maxRangeValue:        { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0     },
        resetMinMaxMeaValues: { ops: 'E', single: true, mand: false, type: 'opaque', range: null, init: null  }
    },
    pwrMea: {
        instActivePwr:        { ops: 'R',  single: true, mand: true,  type: 'float',  range: null, init: 0     },
        minMeaActivePwr:      { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        maxMeaActivePwr:      { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        minRangeActivePwr:    { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        maxRangeActivePwr:    { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        cumulActivePwr:       { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        activePwrCal:         { ops: 'W',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        instReactivePwr:      { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        minMeaReactivePwr:    { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        maxMeaReactivePwr:    { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        minRangeReactivePwr:  { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        maxRangeReactivePwr:  { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        resetMinMaxMeaValues: { ops: 'E',  single: true, mand: false, type: 'opaque', range: null, init: null  },
        cumulReactivePwr:     { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        reactivePwrCal:       { ops: 'W',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        pwrFactor:            { ops: 'R',  single: true, mand: false, type: 'float',  range: null, init: 0     },
        currCal:              { ops: 'RW', single: true, mand: false, type: 'float',  range: null, init: 0     },
        resetCumulEnergy:     { ops: 'E',  single: true, mand: false, type: 'opaque', range: null, init: null  }
    },
    actuation: {
        onOff:     { ops: 'RW', single: true, mand: true,  type: 'boolean',  range: null, init: false         },
        dimmer:    { ops: 'RW', single: true, mand: false, type: 'interger', range: 100,  init: 0             },
        onTime:    { ops: 'RW', single: true, mand: false, type: 'interger', range: 100,  init: 0             },
        mstateOut: { ops: 'RW', single: true, mand: false, type: 'string',   range: null, init: 'Pilot Wire'  },
        appType:   { ops: 'RW', single: true, mand: false, type: 'string',   range: null, init: 'Actuator'    }
    },
    setPoint: {
        setPointValue: { ops: 'RW', single: true, mand: true,  type: 'float',  range: null, init: 0           },
        colour:        { ops: 'RW', single: true, mand: false, type: 'string', range: 100,  init: '#fff'      },
        units:         { ops: 'R',  single: true, mand: false, type: 'string', range: null, init: 'uint'      },
        appType:       { ops: 'RW', single: true, mand: false, type: 'string', range: null, init: 'Set Point' }
    },
    loadCtrl: {
        eventId:       { ops: 'RW', single: true, mand: true,  type: 'string',   range: null, init: 'evt01'   },
        startTime:     { ops: 'RW', single: true, mand: true,  type: 'time',     range: null, init: 0         },
        durationInMin: { ops: 'RW', single: true, mand: true,  type: 'interger', range: null, init: 0         },
        criticalLevel: { ops: 'R',  single: true, mand: false, type: 'interger', range: 3,    init: 0         },
        avgLoadAdjPct: { ops: 'RW', single: true, mand: false, type: 'interger', range: 100,  init: 0         },
        dutyCycle:     { ops: 'RW', single: true, mand: false, type: 'interger', range: 100,  init: 0         }
    },
    lightCtrl: {
        onOff:          { ops: 'RW', single: true, mand: true,  type: 'boolean',  range: null, init: false    },
        dimmer:         { ops: 'RW', single: true, mand: false, type: 'interger', range: 100,  init: 0        },
        colour:         { ops: 'RW', single: true, mand: false, type: 'string',   range: 100,  init: '#fff'   },
        units:          { ops: 'R',  single: true, mand: false, type: 'string',   range: null, init: 'uint'   },
        onTime:         { ops: 'RW', single: true, mand: false, type: 'interger', range: 100,  init: 0        },
        cumulActivePwr: { ops: 'R',  single: true, mand: false, type: 'float',    range: null, init: 0        },
        pwrFactor:      { ops: 'R',  single: true, mand: false, type: 'float',    range: null, init: 0        }
    },
    pwrCtrl: {
        onOff:          { ops: 'RW', single: true, mand: true,  type: 'boolean',  range: null, init: false    },
        dimmer:         { ops: 'RW', single: true, mand: false, type: 'interger', range: 100,  init: 0        },
        onTime:         { ops: 'RW', single: true, mand: false, type: 'interger', range: 100,  init: 0        },
        cumulActivePwr: { ops: 'R',  single: true, mand: false, type: 'float',    range: null, init: 0        },
        pwrFactor:      { ops: 'R',  single: true, mand: false, type: 'float',    range: null, init: 0        }
    },
    accelerometer: {
        xValue:        { ops: 'R', single: true, mand: true,  type: 'float',  range: null, init: 0        },
        yValue:        { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0        },
        zValue:        { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0        },
        units:         { ops: 'R', single: true, mand: false, type: 'string', range: null, init: 'uint'   },
        minRangeValue: { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0        },
        maxRangeValue: { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0        }
    },
    magnetometer: {
        xValue:     { ops: 'R', single: true, mand: true,  type: 'float',  range: null, init: 0        },
        yValue:     { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0        },
        zValue:     { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0        },
        units:      { ops: 'R', single: true, mand: false, type: 'string', range: null, init: 'uint'   },
        compassDir: { ops: 'R', single: true, mand: false, type: 'float',  range: 360,  init: 0        }
    },
    barometer: {
        sensorValue:          { ops: 'R', single: true, mand: true,  type: 'float',  range: null, init: 0        },
        units:                { ops: 'R', single: true, mand: false, type: 'string', range: null, init: 'uint'   },
        minMeaValue:          { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0        },
        maxMeaValue:          { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0        },
        minRangeValue:        { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0        },
        maxRangeValue:        { ops: 'R', single: true, mand: false, type: 'float',  range: null, init: 0        },
        resetMinMaxMeaValues: { ops: 'E', single: true, mand: false, type: 'opaque', range: null, init: null     },
    }
};

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
