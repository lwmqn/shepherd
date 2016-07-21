/*jslint node: true */
'use strict';

var Q = require('q'),
    _ = require('busyman'),
    Datastore = require('nedb');

var mutils = require('./mutils');

function Mqdb(dbPath) {
    this.db = new Datastore({
        filename: dbPath,
        autoload: true
    });

    this.db.ensureIndex({
        fieldName: 'clientId',
        unique: true
    }, function (err) {
        if (err)
            throw err;
    });
}

Mqdb.prototype.insert = function (doc, callback) {
    var deferred = Q.defer();

    this.db.insert(doc, function (err, newDoc) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(newDoc);
    });

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.exportClientIds = function (callback) {
    var deferred = Q.defer();

    this.db.find({}, { clientId: 1, _id: 0 }, function (err, nodes) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(_.map(nodes, function (cIdInfo) {
                return cIdInfo.clientId;
            }));
        }
    });

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.removeByClientId = function (cId, callback) {
    var deferred = Q.defer();

    this.db.remove({ clientId: cId }, { multi: true }, function (err, numRemoved) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(numRemoved);
    });

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.findByClientId = function (cId, callback) {
    var deferred = Q.defer();

    this.db.findOne({ clientId: cId }, { _id: 0 }, function (err, doc) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(doc);
    });

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.findByClientIdWith_id = function (cId, callback) {
    var deferred = Q.defer();

    this.db.findOne({ clientId: cId }, function (err, doc) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(doc);
    });

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.replace = function (cId, path, value, callback) {
    var deferred = Q.defer(),
        self = this,
        objToReplace = {};

    if (path === 'clientId') {
        deferred.reject(new Error('clientId cannot be replaced.'));
    } else {
        path = mutils.dotPath(path);
        objToReplace[path] = value;

        this.findByClientId(cId).then(function (so) {
            if (!so) {
                deferred.reject(new Error('No such object ' + cId + ' for property replacing.'));
            } else if (!_.has(so, path)) {
                deferred.reject(new Error('No such property ' + path + ' to replace.'));
            } else {
                self.db.update({ clientId: cId }, { $set: objToReplace }, {}, function (err, numReplaced) {
                    if (err)
                        deferred.reject(err);
                    else
                        deferred.resolve(numReplaced);
                });
            }
        }).fail(function (err) {
            deferred.reject(err);
        }).done();
    }
    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.modify = function (cId, path, snippet, callback) {
    var self = this,
        deferred = Q.defer(),
        pLength = path.length + 1, 
        diffSnippet = {},
        invalidPath,
        objToUpdate = mutils.buildPathValuePairs(path, snippet);

    if (path === 'clientId' || _.has(snippet, 'clientId')) {
        if (snippet.clientId !== cId) {
            deferred.reject(new Error('clientId cannot be modified.'));
            return deferred.promise.nodeify(callback);
        }
    }

    this.findByClientId(cId).then(function (so) {
        if (!so) {
            deferred.reject(new Error('No such object ' + cId + ' for property modifying.'));
        } else {
            // check if target path exists
            invalidPath = mutils.invalidPathOfTarget(so, objToUpdate);
            if (invalidPath.length !== 0) {
                deferred.reject(new Error('No such property ' + invalidPath[0] + ' to modify.'));
            } else {
                self.db.update({ clientId: cId }, { $set: objToUpdate }, { multi: true }, function (err, numReplaced) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        self.findByClientId(cId).done(function (newSo) {
                            _.forEach(objToUpdate, function (val, checkPath) {
                                var subPath = checkPath.substr(pLength),
                                    newVal = _.get(newSo, checkPath),
                                    oldVal = _.get(so, checkPath);

                                subPath = (subPath === '') ? checkPath : subPath;
                                if ( newVal !== oldVal)
                                    _.set(diffSnippet, subPath, newVal);
                            });

                            deferred.resolve(diffSnippet);
                        }, function (err) {
                            deferred.reject(err);
                        });
                    }
                });
            }
        }
    }).fail(function (err) {
        deferred.reject(err);
    }).done();

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.find = function (queryJson, orderJson, rangeJson, fieldsJson, callback) {
    var deferred = Q.defer(),
        cursor = this.db.find(queryJson, fieldsJson),
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

module.exports = Mqdb;
