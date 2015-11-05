// Interfaces

var registerData = {
    clientId: 'string',
    lifetime: 86400,    // seconds, uint32
    version: 'string',
    objList: [ objInfo1, objInfo2, objInfo3 ]         // objList
};  // rspCode: 201 Created, 400 Bad Request, 409 Conflict

var objInfo = {
    objId: 1,   // uint16
    instId: 2   // uint16, if instId is null, this is an object itself
};

var deregisterData = {
    clientId: 'string'
};  // rspCode: 202 Deleted, 404 Not Found

var updateData = {
    clientId: 'string',
    lifeTime: 1111,         // optional
    objList: [ objInfoX ],  // optional
    ip: 'ip_string',        // optional
};  // 204 Changed, 400 Bad Request, 404 Not Found


var notifyData = {
    clientId: 'string',
    objId: 1,       
    instId: 1,
    rId: 1,     // uint16, optional, if null, value belongs to instance, else belongs to that instance
    value: x
};  // 204 Changed

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