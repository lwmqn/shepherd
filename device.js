function Device(info) {
    // this._mdbId = ;
    this.mfg = 'sivann';
    this.mdl = {
        hw: '',
        sw: ''
    };
    this.ser = '';
    this.n = 'device name';
    this.pwr = {
        type: 1,
        v: 3.3
    };
    this.time = 1;
    this.uptime = 1;
    this.cfg = {
        services: [],   // mandatory
        stack: {        // mandatory
            phy: '',
            mac: '',
            net: '',
            rtg: ''
        }
    };
    this.objectList = [ { oId: 3, iIds: [ 0, 1, 2 ] },
                        { oId: 1, iIds: [ 0, 1 ] } ];   // object instance
    this.ipsos = [
        {
            oId: 3,
            iId: 0,
            rIds: [];
        }
    ];
}

Device.prototype.findNwkAddrByIeeeAddr = function (callback) {};
Device.prototype.checkOnline = function (callback) {};
Device.prototype.save = function (devInfo, callback) {};
Device.prototype.update = function (devInfo, callback) {};
Device.prototype.remove = function (callback) {};
Device.prototype.loadEndpointsFromDb = function (callback) {};
Device.prototype.getRoutingTable = function (callback) {};
Device.prototype.isInDataBase = function (callback) {};
