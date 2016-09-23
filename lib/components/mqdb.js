'use strict';

var Q = require('q'),
    _ = require('busyman'),
    Datastore = require('nedb'),
    mutils = require('./mutils');

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
    return Q.ninvoke(this.db, 'insert', doc).nodeify(callback);
};


Mqdb.prototype.exportClientIds = function (callback) {
    return Q.ninvoke(this.db, 'find', {}, { clientId: 1, _id: 0 }).then(function (nodes) {
        return _.map(nodes, function (cIdInfo) {
            return cIdInfo.clientId;
        })
    }).nodeify(callback);
};

Mqdb.prototype.removeByClientId = function (cId, callback) {
    return Q.ninvoke(this.db, 'remove', { clientId: cId }, { multi: true }).nodeify(callback);
};

Mqdb.prototype.findByClientId = function (cId, callback) {
    return Q.ninvoke(this.db, 'findOne', { clientId: cId }, { _id: 0 }).nodeify(callback);
};

Mqdb.prototype.findByClientIdWith_id = function (cId, callback) {
    return Q.ninvoke(this.db, 'findOne', { clientId: cId }).nodeify(callback);
};

Mqdb.prototype.replace = function (cId, path, value, callback) {
    var self = this,
        deferred = Q.defer(),
        objToReplace = {};

    if (path === 'clientId') {
        deferred.reject(new Error('clientId cannot be replaced.'));
    } else {
        path = mutils.dotPath(path);
        objToReplace[path] = value;

        this.findByClientId(cId).then(function (so) {
            if (!so)
                throw new Error('No such object ' + cId + ' for property replacing.');
            else if (!_.has(so, path))
                throw new new Error('No such property ' + path + ' to replace.');
            else
                return Q.ninvoke(self.db, 'update', { clientId: cId }, { $set: objToReplace }, {});
        }).done(deferred.resolve, deferred.reject);
    }

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.modify = function (cId, path, snippet, callback) {
    var self = this,
        foundSo,
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
            throw new Error('No such object ' + cId + ' for property modifying.');
        } else {
            foundSo = so;
            // check if target path exists
            invalidPath = mutils.invalidPathOfTarget(so, objToUpdate);
            if (invalidPath.length !== 0)
                 throw new Error('No such property ' + invalidPath[0] + ' to modify.');
            else
                return Q.ninvoke(self.db, 'update', { clientId: cId }, { $set: objToUpdate }, { multi: true });
        }
    }).then(function () {
        return self.findByClientId(cId);
    }).then(function (newSo) {
        _.forEach(objToUpdate, function (val, checkPath) {
            var subPath = checkPath.substr(pLength),
                newVal = _.get(newSo, checkPath),
                oldVal = _.get(foundSo, checkPath);

            subPath = (subPath === '') ? checkPath : subPath;
            if ( newVal !== oldVal)
                _.set(diffSnippet, subPath, newVal);
        });

        return diffSnippet;
    }).done(deferred.resolve, deferred.reject);

    return deferred.promise.nodeify(callback);
};

Mqdb.prototype.find = function (queryJson, orderJson, rangeJson, fieldsJson, callback) {
    var cursor = this.db.find(queryJson, fieldsJson),
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

    return Q.ninvoke(cursor, 'exec').nodeify(callback);
};

module.exports = Mqdb;
