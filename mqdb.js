const Datastore = require('nedb'),
    Q = require('q'),
    db;

db = new Datastore({ filename: './database/mqttipso.db', autoload: true });
var mqdb = new Mqdb();
module.exports = mqdb;

function Mqdb() {
}

// CRUD Implementation of Mqdb

// Create: insert
// type: 'device', 'endpoint', 'cluster' (doc instance depends on the 3 kinds of type)
// ieeeAddr: [ 4 bytes number, 4 bytes number], or '0x0000ABCD1111FEDC' string of hex
Mqdb.prototype.insert = function (mac, doc, callback) {
};

Mqdb.prototype.insertSingle = function (mac, doc, callback) {
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

Mqdb.prototype.modifyById = function (id, fieldsToUpdate, callback) {
};

Mqdb.prototype.modSert = function (type, ieeeAddr, doc, callback) {
};

// Delete: remove
Mqdb.prototype.remove = function () {
};

Mqdb.prototype.clearDataBase = function (callback) {
 };

Mqdb.prototype.hasDevice = function (ieeeAddr, callback) {
};

Mqdb.prototype.hasEndpoint = function (ieeeAddr, endpointId, callback) {
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
}