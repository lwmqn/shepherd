'use strict;'

const Datastore = require('nedb'),
      Q = require('q'),
      db = new Datastore({ filename: './database/mqtt.db', autoload: true });

var mqdb = new Mqdb();

function Mqdb() {
}

// CRUD Implementation of Mqdb

// Create: insert
// type: 'device', 'endpoint', 'cluster' (doc instance depends on the 3 kinds of type)
// ieeeAddr: [ 4 bytes number, 4 bytes number], or '0x0000ABCD1111FEDC' string of hex
Mqdb.prototype.insert = function (clientId, doc, callback) {
};

Mqdb.prototype.insertSingle = function (clientId, doc, callback) {
};

// Read: find (This is a generic searching method)
Mqdb.prototype.find = function (queryJson, orderJson, rangeJson, fieldsJson, callback) {
};

// Read: getInfo (This is a specific searching method that returns Info-objs)
// must use callback to get the found results.
Mqdb.prototype.getInfo = function () {
};

// Update: modify
Mqdb.prototype.modify = function () {
};

Mqdb.prototype.modifyById = function (clientId, fieldsToUpdate, callback) {
};

Mqdb.prototype.modSert = function (type, clientId, doc, callback) {
};

// Delete: remove
Mqdb.prototype.remove = function () {
};

Mqdb.prototype.clearDataBase = function (callback) {
 };

Mqdb.prototype.hasDevice = function (clientId, callback) {
};

Mqdb.prototype.hasEndpoint = function (clientId, endpointId, callback) {
};

// TODO : fields of valid, selected, .etc were not completed.
/******  Device Info Constructor ******/
function DeviceInfo(ieeeAddr, nwkAddr, manufacturerId, devStatus, numEndpoints, epList) {
    this.ieeeAddr = ieeeAddr;
    this.nwkAddr = nwkAddr;
    this.manufacturerId = manufacturerId;
    this.devStatus = devStatus;
    this.numEndpoints = numEndpoints;
    this.epList = epList;

    var ipsoBase = {
        dev: { // <= objId = 3
            mfg: 'sivann',      // if=rp, string
            mdl: {              // if=rp, string
                num: 'xxxx',    // if=rp, string
                hw: 'v0.0.1',   // if=rp, string
                sw: 'v0.0.1'    // if=rp, string
            },
            ser: 'SN00000001',  // if=rp, string
            n: 'device name',   // if=p,rp, string => smart meter, ...
            pwr: {              // pwr/{#} if=rp, enum = [0: line, 1: battery, 2: harverster]
                type: 1,
                v: 3.3          // pwr/v/{#} if=s, decimal (Unit:V)
            },
            time: 12345678,     // if=p,rp, integer (Unit:Sec)
            uptime: 12345678,   // if=s, integer (Unit:Sec)
        },
        cfg: { // <= objId = 3
            services: [],       // </cfg/services>;rt="core.rd core.mp foo"
            stack: {
                phy: 'ipv4',
                mac: 'EC-12-34-56-78',
                net: '192.168.0.111',
                rtg: ''
            }
        }
    };
}

module.exports = mqdb;
