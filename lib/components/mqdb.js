const Q = require('q')
const _ = require('busyman')
const Datastore = require('nedb')
const mutils = require('./mutils')

function Mqdb (dbPath) {
  this.db = new Datastore({
    filename: dbPath
  })

  this.db.loadDatabase((err) => {
    if (err) console.warn(err)
    this.db.ensureIndex({
      fieldName: 'clientId',
      unique: true,
      sparse: false
    }, (err) => {
      if (err) throw err
    })
  })
}

Mqdb.prototype.insert = function (doc, callback) {
  return Q.ninvoke(this.db, 'insert', doc).nodeify(callback)
}

Mqdb.prototype.exportClientIds = function (callback) {
  return Q.ninvoke(this.db, 'find', {}, { clientId: 1, _id: 0 }).then(nodes => _.map(nodes, cIdInfo => cIdInfo.clientId)).nodeify(callback)
}

Mqdb.prototype.removeByClientId = function (cId, callback) {
  return Q.ninvoke(this.db, 'remove', { clientId: cId }, { multi: true }).nodeify(callback)
}

Mqdb.prototype.findByClientId = function (cId, callback) {
  return Q.ninvoke(this.db, 'findOne', { clientId: cId }, { _id: 0 }).nodeify(callback)
}

Mqdb.prototype.findByClientIdWith_id = function (cId, callback) {
  return Q.ninvoke(this.db, 'findOne', { clientId: cId }).nodeify(callback)
}

Mqdb.prototype.replace = function (cId, path, value, callback) {
  const self = this
  const deferred = Q.defer()
  const objToReplace = {}

  if (path === 'clientId') {
    deferred.reject(new Error('clientId cannot be replaced.'))
  } else {
    path = mutils.dotPath(path)
    objToReplace[path] = value

    this.findByClientId(cId).then((so) => {
      if (!so) throw new Error(`No such object ${cId} for property replacing.`)
      else if (!_.has(so, path)) throw new new Error(`No such property ${path} to replace.`)()
      else return Q.ninvoke(self.db, 'update', { clientId: cId }, { $set: objToReplace }, {})
    }).done(deferred.resolve, deferred.reject)
  }

  return deferred.promise.nodeify(callback)
}

Mqdb.prototype.modify = function (cId, path, snippet, callback) {
  const self = this
  let foundSo
  const deferred = Q.defer()
  const pLength = path.length + 1
  const diffSnippet = {}
  let invalidPath
  const objToUpdate = mutils.buildPathValuePairs(path, snippet)

  if (path === 'clientId' || _.has(snippet, 'clientId')) {
    if (snippet.clientId !== cId) {
      deferred.reject(new Error('clientId cannot be modified.'))
      return deferred.promise.nodeify(callback)
    }
  }

  this.findByClientId(cId).then((so) => {
    if (!so) {
      throw new Error(`No such object ${cId} for property modifying.`)
    } else {
      foundSo = so
      // check if target path exists
      invalidPath = mutils.invalidPathOfTarget(so, objToUpdate)
      if (invalidPath.length !== 0) throw new Error(`No such property ${invalidPath[0]} to modify.`)
      else return Q.ninvoke(self.db, 'update', { clientId: cId }, { $set: objToUpdate }, { multi: true })
    }
  }).then(() => self.findByClientId(cId)).then((newSo) => {
    _.forEach(objToUpdate, (val, checkPath) => {
      let subPath = checkPath.substr(pLength)
      const newVal = _.get(newSo, checkPath)
      const oldVal = _.get(foundSo, checkPath)

      subPath = (subPath === '') ? checkPath : subPath
      if (newVal !== oldVal) _.set(diffSnippet, subPath, newVal)
    })

    return diffSnippet
  })
    .done(deferred.resolve, deferred.reject)

  return deferred.promise.nodeify(callback)
}

Mqdb.prototype.find = function (queryJson, orderJson, rangeJson, fieldsJson, callback) {
  const cursor = this.db.find(queryJson, fieldsJson)
  let skip

  if (orderJson) cursor.sort(orderJson)

  if (rangeJson) {
    skip = rangeJson.skip ? rangeJson.skip : 0

    if (rangeJson.limit) cursor.limit(rangeJson.limit)
    if (skip) cursor.skip(skip)
  }

  return Q.ninvoke(cursor, 'exec').nodeify(callback)
}

module.exports = Mqdb
