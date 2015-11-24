'use strict';

const Datastore = require('nedb'),
      Q = require('q'),
      _ = require('lodash'),
      mqUtils = require('./utils/mqutils'),
      db = new Datastore({ filename: './database/mqtt.db', autoload: true });

var mqdb = new Mqdb();

function Mqdb() {
}

Mqdb.prototype.insert = function (doc, callback) {
    var deferred = Q.defer();

    db.insert(doc, function (err, newDoc) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(newDoc);
    });

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.removeByClientId = function (cId, callback) {
    var deferred = Q.defer();

    db.remove({ clientId: cId }, { multi: true }, function (err, numRemoved) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(numRemoved);
    });

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.findByClientId = function (cId, callback) {
    var deferred = Q.defer();

    db.findOne({ clientId: cId }, {}, function (err, doc) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(doc);
    });

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.replace = function (cId, path, value, callback) {
    var deferred = Q.defer(),
        objToReplace = {};

    path = mqUtils.returnPathInDotNotation(path);
    objToReplace[path] = value;

    this.findByClientId(cId).then(function (so) {
        if (!so) {
            deferred.reject(new Error('No such object for property replacing'));
        } else if (!_.has(so, path)) {
            deferred.reject(new Error('No such property to replace'));
        } else {
            db.update({ clientId: cId }, { $set: objToReplace }, {}, function (err, numReplaced) {
                if (err)
                    deferred.reject(err);
                else
                    deferred.resolve(numReplaced);
            });
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.modify = function (cId, path, snippet, callback) {
    var deferred = Q.defer(),
        objToUpdate = mqUtils.buildPathValuePairs(path, snippet);

    this.findByClientId(cId).then(function (so) {
        if (!so) {
            deferred.reject(new Error('No such object for property modifying'));
        } else {
            db.update({ clientId: cId }, { $set: objToUpdate }, { multi: true }, function (err, numReplaced) {
                if (err)
                    deferred.reject(err);
                else
                    deferred.resolve(numReplaced);
            });
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.find = function (queryJson, orderJson, rangeJson, fieldsJson, callback) {
    var deferred = Q.defer(),
        cursor = db.find(queryJson, fieldsJson),
        limit,
        skip;

    if (orderJson)
        cursor.sort(orderJson);

    if (rangeJson) {
        skip = rangeJson.skip ? rangeJson.skip : 0;

        if (rangeJson.limit)
            cursor.limit(rangeJson.limit);
        if (skip)
            cursor.skip(skip);
    }

    cursor.exec(function (err, docs) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(docs);
    });

    return deferred.promise.nodeify(callback);
};

//     var ipsoBase = {
//         dev: { // <= objId = 3
//             mfg: 'sivann',      // if=rp, string
//             mdl: {              // if=rp, string
//                 num: 'xxxx',    // if=rp, string
//                 hw: 'v0.0.1',   // if=rp, string
//                 sw: 'v0.0.1'    // if=rp, string
//             },
//             ser: 'SN00000001',  // if=rp, string
//             n: 'device name',   // if=p,rp, string => smart meter, ...
//             pwr: {              // pwr/{#} if=rp, enum = [0: line, 1: battery, 2: harverster]
//                 type: 1,
//                 v: 3.3          // pwr/v/{#} if=s, decimal (Unit:V)
//             },
//             time: 12345678,     // if=p,rp, integer (Unit:Sec)
//             uptime: 12345678,   // if=s, integer (Unit:Sec)
//         },
//         cfg: { // <= objId = 3
//             services: [],       // </cfg/services>;rt="core.rd core.mp foo"
//             stack: {
//                 phy: 'ipv4',
//                 mac: 'EC-12-34-56-78',
//                 net: '192.168.0.111',
//                 rtg: ''
//             }
//         }
//     };

module.exports = mqdb;
