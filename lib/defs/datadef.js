// Interfaces

var reg_data = {
    clientId: 'string',
    lifetime: 86400,        // seconds, uint32
    version: 'string',
    objList: [ oiid_pair1, oiid_pair2, oiid_pair3 ]         // objList
};  // rspCode: 201 Created, 400 Bad Request, 409 Conflict

var oiid_pair1 = {
    oid: 1,   // uint16
    iid: 2    // uint16, if iid is null, this is an object itself
};

var dereg_data = {
    clientId: 'string'
};  // rspCode: 202 Deleted, 404 Not Found

var update_data = {
    clientId: 'string',
    lifeTime: 1111,          // optional
    objList: [ oiid_pair ],  // optional
    ip: 'ip_string',         // optional
    mac: 'ip_string',        // optional
    // port: 1234               // optional XXXXXXXx NO Port
};  // 204 Changed, 400 Bad Request, 404 Not Found

var notify_data = {
    clientId: 'string',
    oid: 1,       
    iid: 1,
    rid: 1,     // uint16, optional, if null, value belongs to instance, else belongs to that instance
    data: x
};  // 204 Changed

// (oid + iid + rid)
var data = value;
var data = {
    riid1: value,
    riid2: vaule
};

// (oid + iid)
var data = {
    rid1: value,
    rid2: {
        riid1: value,
        riid2: value
    }
};

// (oid)
var data = {
    iid1: {
        rid1: value,
        rid2: value,
        rid3: {
            riid1: value,
            riid2: value
        }
    },
    iid2: {
        // ...
    }
};

// REQ
var read_data = {
    transId: 2,
    clientId: 'string',
    cmdId: 3,
    oid: 33,
    iid: 1,
    rid: 0,
    data: value_data
};

// write
var value_data = 'some value';
var value_data = {
    '0': 'somen_value'
};

// writeAttrs
var value_data = {
    pmin: 1,
    pmax: 2,
    gt: 3,
    lt: 4,
    step: 6,
    cancel: false
};

// execute
var value_data = {
    arg1: 1,
    arg2: 2
};


this.emit('register', data);    // { clientId, lifeTime, version, objList }
this.emit('deregister', data);  // { clientId }
this.emit('update', data);      // { clientId, ip, lifeTime, objList }
this.emit('notify', data);      // { clientId, objId, instId, rId, value }
this.emit('request', data);     // { clientId, objId, instId, rId, status }
this.on('response');

// Read
//      205 Content, 400 Bad Request, 404 Not Found, 401 Unauthorized, 405 Method Not Allowed
// Write
//      204 Changed, 400 Bad Request, 404 Not Found, 401 Unauthorized, 405 Method Not Allowed
// Delete
//      202 Deleted, 400 Bad Request, 404 Not Found, 401 Unauthorized, 405 Method Not Allowed
// Execute
//      204 Changed, 400 Bad Request, 404 Not Found, 401 Unauthorized, 405 Method Not Allowed


// LWM2M Object Template
var objTemplate = {
    name: 'string',
    id: 1111,
    instances: 'Multiple',   // 'Single'
    Mandatory: 'Mandatory', // 'Optional'
};

// LWM2M Resource Template
var resrcTempalte = {
    name: 'string',
    id: 3,
    operations: 'R',        // R, W, E
    instances: 'Multiple',  // 'Single'
    Mandatory: 'Mandatory', // 'Optional'
    type: 'String',         // Integer, Float, Boolean, Opaque, Time
    range: 1010,            // if any
    units: 'cm',            // if any
    description: 'string'   // description
};


var smartObject = {
    device: {
        '0': {
            manuf: 'shepherd',
            model: 'demo-1'
        }
    },
    connMonitor: {
        '0': {

        }
    },
    connStatistics: {

    }
};

var smartObject = {
    '3': {
        '0': {
            '0': 'shepherd',
            '1': 'demo-1'                // iid number
                // rid string
        }
    },
    '4': {
        '0': {

        }
    },
    '7': {
        
    }
};

// objList = [ { oid: 3, iid: 0 }, { oid: 4, iid: 0 }, { oid: 7, iid: 0 } ]