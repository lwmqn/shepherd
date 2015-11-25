'use strict';

const Datastore = require('nedb'),
      Q = require('q'),
      _ = require('lodash'),
      mqUtils = require('./utils/mqutils'),
      config = require('./config/config.js'),
      db = new Datastore({ filename: (config.dbPath || './database/mqtt.db'), autoload: true });

var mqdb = new Mqdb();

function Mqdb() {
}

Mqdb.prototype.exportClientIds = function (callback) {
    var deferred = Q.defer();

    db.find({}, { clientId: 1, _id: 0 }, function (err, nodes) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(_.map(nodes, function (cId) {
                return cId;
            }));
        }
    });

    return deferred.promise.nodeify(callback);
};

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

module.exports = mqdb;
