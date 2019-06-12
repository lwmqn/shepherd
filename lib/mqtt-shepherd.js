const IS_TESTING = (process.env.npm_lifecycle_event === 'test')

const fs = require('fs')
const util = require('util')
const EventEmitter = require('events')

const Q = require('q')
const _ = require('busyman')
const Areq = require('areq')
const debug = require('debug')('mqtt-shepherd')
const logReq = require('debug')('mqtt-shepherd:request')
const network = IS_TESTING ? require('./components/network_mock') : require('network')

const init = require('./init')
const Mqdb = require('./components/mqdb')
const mutils = require('./components/mutils')

const config = require('./config.js')

const { quickPingWaitTime } = config

/** ********************************************************************************************** */
/** * MShepherd Class                                                                           ** */
/** ********************************************************************************************** */
function MShepherd (name, settings) {
  const self = this
  let transId = 0
  const propWritable = { writable: true, enumerable: false, configurable: false }

  const mqttClients = {}

  EventEmitter.call(this)

  /* hide event emitter properties                                                            */
  const _domain = this.domain
  const __events = this._events
  const __eventsCount = this._eventsCount
  const __maxListeners = this._maxListeners

  delete this.domain
  delete this._events
  delete this._eventsCount
  delete this._maxListeners

  Object.defineProperty(this, 'domain', _.assign({ value: _domain }, propWritable))
  Object.defineProperty(this, '_events', _.assign({ value: __events }, propWritable))
  Object.defineProperty(this, '_eventsCount', _.assign({ value: __eventsCount }, propWritable))
  Object.defineProperty(this, '_maxListeners', _.assign({ value: __maxListeners }, propWritable))
  /** ***************************************************************************************** */

  if (arguments.length === 1 && _.isObject(name)) {
    settings = name
    name = null
  }

  settings = settings || {}

  if (!_.isNil(name) && !_.isString(name)) throw new TypeError('name should be a string if gieven.')
  else if (!_.isPlainObject(settings)) throw new TypeError('settings should be an object if gieven.')

  /** ************************************************ */
  /** * Prepare Shepherd Settings                   ** */
  /** ************************************************ */
  this.name = name || config.shepherdName

  Object.defineProperty(this, 'clientId', _.assign({ value: this.name }, propWritable))
  Object.defineProperty(this, 'brokerSettings', _.assign({ value: settings.broker || config.brokerSettings }, propWritable))
  Object.defineProperty(this, 'defaultAccount', _.assign({ value: settings.account || config.defaultAccount }, propWritable))

  this.clientConnOptions = settings.clientConnOptions || config.clientConnOptions
  this.reqTimeout = settings.reqTimeout || config.reqTimeout
  this.devIncomingAcceptanceTimeout = settings.devIncomingAcceptanceTimeout || config.devIncomingAcceptanceTimeout
  /** ************************************************ */
  /** * Protected Memebers                          ** */
  /** ************************************************ */
  Object.defineProperty(this, '_startTime', _.assign({ value: 0 }, propWritable))
  Object.defineProperty(this, '_enabled', _.assign({ value: false }, propWritable))
  Object.defineProperty(this, '_joinable', _.assign({ value: false }, propWritable))
  Object.defineProperty(this, '_permitJoinTime', _.assign({ value: 0 }, propWritable))
  Object.defineProperty(this, '_permitJoinCountdown', _.assign({ value: undefined }, propWritable))
  Object.defineProperty(this, '_net', _.assign({
    value: {
      intf: '', ip: '', mac: '', routerIp: ''
    }
  }, propWritable))
  Object.defineProperty(this, '_channels', _.assign({ value: config.channelTopics }, propWritable))
  Object.defineProperty(this, '_areq', _.assign({ value: new Areq(this, config.reqTimeout) }, propWritable))

  // { clientId: node } box that holds the registered mqtt-nodes
  Object.defineProperty(this, '_nodebox', _.assign({ value: {} }, propWritable))
  // database will be setup later
  Object.defineProperty(this, '_mqdb', _.assign({ value: null }, propWritable))
  Object.defineProperty(this, '_dbPath', _.assign({ value: settings.dbPath }, propWritable))

  if (!this._dbPath) { // use default
    this._dbPath = config.defaultDbPath
    // create default db folder if not there
    try {
      fs.statSync(config.defaultdBFolder)
    } catch (e) {
      fs.mkdirSync(config.defaultdBFolder)
    }
  }

  this._mqdb = new Mqdb(this._dbPath)

  /** ************************************************ */
  /** * Public Members                              ** */
  /** ************************************************ */
  // MQTT broker and client will be setup at init stage
  Object.defineProperty(this, 'mBroker', _.assign({ value: null }, propWritable))
  Object.defineProperty(this, 'mClient', _.assign({ value: null }, propWritable))

  Object.defineProperty(this, 'nextTransId', _.assign({
    value () {
      if (transId > 255) transId = 0
      return transId++
    }
  }, propWritable))

  // This method is required in testing
  Object.defineProperty(this, '_currentTransId', _.assign({
    value () {
      return transId
    }
  }, propWritable))

  Object.defineProperty(this, '_setClient', _.assign({
    value (client) {
      const clientId = client.id

      if (!mqttClients[clientId]) {
        mqttClients[clientId] = client
      } else if (mqttClients[clientId] !== client) {
        client.close() // client conflicts, close the new comer
        return false
      }

      return true
    }
  }, propWritable))

  Object.defineProperty(this, '_getClient', _.assign({
    value (clientId) {
      return mqttClients[clientId]
    }
  }, propWritable))

  Object.defineProperty(this, '_deleteClient', _.assign({
    value (clientId) {
      const mqttClient = mqttClients[clientId]
      if (mqttClient) {
        mqttClient.close()
        mqttClients[clientId] = null
        delete mqttClients[clientId]
      }
    }
  }, propWritable))

  Object.defineProperty(this, 'permitJoin', _.assign({
    value: permitJoin.bind(this)
  }, propWritable))

  this.authPolicy = { // All methods in authPolicy can be overrided at will.
    authenticate: null, // not provide default implement, use defaultAccount scheme
    authorizePublish (client, topic, payload, cb) {
      const authorized = true
      cb(null, authorized)
    },
    authorizeSubscribe (client, topic, cb) {
      const authorized = true
      cb(null, authorized)
    },
    authorizeForward (client, packet, cb) {
      const authorized = true // Default: authorize any packet for any client
      cb(null, authorized)
    }
  }

  this.encrypt = function (msgStr, clientId, callback) { // Override at will.
    callback(null, msgStr)
  }

  this.decrypt = function (msgBuf, clientId, callback) { // Override at will.
    callback(null, msgBuf)
  }

  this.acceptDevIncoming = function (qnode, callback) { // Override at will.
    setImmediate(() => {
      const accepted = true
      callback(null, accepted)
    })
  }
  /** ************************************************ */
  /** * Event Handlers                              ** */
  /** ************************************************ */
  this.on('_ready', () => {
    self._startTime = Math.floor(Date.now() / 1000)
    setImmediate(() => {
      self.emit('ready')
    })
  })

  // 'ind:xxx' event bridges
  _bridgeEvents(this)
}

util.inherits(MShepherd, EventEmitter)

/** ********************************************************************************************** */
/** * MShepherd Major Functions                                                                 ** */
/** ********************************************************************************************** */
MShepherd.prototype.start = function (callback) {
  const self = this

  return init.setupShepherd(this).timeout(config.initTimeout, 'Broker init timeout.').then(() => {
    self._enabled = true // 6. testings are done, shepherd is enabled
    self.emit('_ready') // 7. if all done, shepherd fires '_ready' event for inner use
  }).nodeify(callback)
}

MShepherd.prototype.stop = function (callback) {
  const self = this

  return Q.fcall(() => {
    if (!self._enabled || !self.mClient) {
      return 'resolve'
    }
    self.permitJoin(0)
    return self.announce('stopped').then(() =>
    // close mClient, force = true, close immediately
      Q.ninvoke(self.mClient, 'end', true))
  }).then(() => {
    self.mClient = null
    self._enabled = false
  }).nodeify(callback)
}

MShepherd.prototype.reset = function (mode, callback) {
  const self = this
  const deferred = Q.defer()

  if (_.isFunction(mode)) {
    callback = mode
    mode = false
  }

  mode = !!mode

  this.announce('resetting').then(() => {
    if (mode === true) {
      // clear database
      if (self._mqdb) {
        self._mqdb.db.remove({}, { multi: true }, (err, num) => {
          debug(err)
          self._mqdb.db.loadDatabase((err) => {
            if (!err) debug('Database cleared.')
            else debug(err)
          })
        })
      } else {
        self._mqdb = new Mqdb(self._dbPath)
      }
    }

    self._nodebox = null
    self._nodebox = {}

    setTimeout(() => {
      self.stop().then(() => self.start()).done(deferred.resolve, deferred.reject)
    }, 200)
  }).fail(deferred.reject).done()

  return deferred.promise.nodeify(callback)
}

MShepherd.prototype.find = function (clientId) {
  if (!_.isString(clientId)) throw new TypeError('clientId should be a string.')

  return this._nodebox[clientId]
}

MShepherd.prototype.findByMac = function (macAddr) {
  if (!_.isString(macAddr)) throw new TypeError('macAddr should be a string.')
  else macAddr = macAddr.toLowerCase()

  return _.filter(this._nodebox, qnode => qnode.mac === macAddr)
} // return []

MShepherd.prototype.updateNetInfo = function (callback) {
  const self = this

  return Q.ninvoke(network, 'get_active_interface').then((info) => {
    self._net.intf = info.name
    self._net.ip = info.ip_address
    self._net.mac = info.mac_address
    self._net.routerIp = info.gateway_ip || ''
    return _.cloneDeep(self._net)
  }).nodeify(callback)
}

MShepherd.prototype.remove = function (clientId, callback) {
  const self = this
  const deferred = Q.defer()
  const qnode = this.find(clientId)
  let macAddr

  if (!_.isString(clientId)) throw new TypeError('clientId should be a string.')

  if (!qnode) {
    this._responseSender('deregister', clientId, { status: mutils.rspCodeNum('NotFound') }).done()
    this._deleteClient(clientId)
    deferred.resolve(clientId)
  } else {
    macAddr = qnode.mac
    qnode._setStatus('offline')
    qnode.disableLifeChecker()
    qnode.dbRemove().done(() => {
      qnode._registered = false
      qnode.so = null
      delete qnode.so
      self._nodebox[clientId] = null
      delete self._nodebox[clientId]

      self._responseSender('deregister', clientId, { status: mutils.rspCodeNum('Deleted') }).done(() => {
        setImmediate(() => {
          self.emit('_deregistered', clientId)
          self.emit('ind:leaving', clientId, macAddr)
        })
        self._deleteClient(clientId)
        deferred.resolve(clientId)
      })
    }, (err) => {
      deferred.reject(err)
    })
  }

  return deferred.promise.nodeify(callback)
}

MShepherd.prototype.announce = function (msg, callback) {
  const args = ['announce', msg, { qos: 0, retain: false }]
  return Q.npost(this.mClient, 'publish', args).nodeify(callback)
}

// shepherd -> pheripheral
MShepherd.prototype._responseSender = function (intf, clientId, rspObj, callback) {
  if (!_.isString(clientId)) throw new TypeError('clientId should be a string.')

  const self = this
  const deferred = Q.defer()
  const topic = `${intf}/response/${clientId}`
  const msg = JSON.stringify(rspObj) // rspObj won't be changed if it is a string

  if (!this._enabled) {
    deferred.reject(new Error('Shepherd is not ready, cannot send response.'))
  } else {
    Q.ninvoke(this, 'encrypt', msg, clientId).then(encrypted => Q.ninvoke(self.mClient, 'publish', topic, encrypted, { qos: 1, retain: false })).done(deferred.resolve, deferred.reject)
  }

  return deferred.promise.nodeify(callback)
}

// shepherd -> pheripheral
MShepherd.prototype._requestSender = function (cmdId, clientId, reqObj, waitTime, callback) {
  if (!_.isString(clientId)) throw new TypeError('clientId should be a string.')

  const quickping = (cmdId === 'quickping')
  cmdId = quickping ? 'ping' : cmdId

  const self = this
  const deferred = Q.defer()
  const areq = this._areq
  const qnode = this.find(clientId)
  const topic = `request/${clientId}`
  let cmdIdString = mutils.cmdKey(cmdId)
  let preError
  let evt
  let msg

  if (_.isFunction(waitTime)) {
    callback = waitTime
    waitTime = null
  }

  waitTime = waitTime || self.reqTimeout
  cmdIdString = cmdIdString || cmdId

  if (arguments.length < 2) preError = new Error('Bad arguments.')
  else if (!this._enabled) preError = new Error('Shepherd is not ready, cannot send request.')
  else if (!qnode) preError = new Error(`No such node, clientId: ${clientId}`)
  else if (qnode.getStatus() === 'offline') preError = new Error(`Client offline, clientId: ${qnode.clientId}`)

  // convert cmdId to number, get transId and stringify request object in this method
  if (reqObj) reqObj = mutils.turnReqObjOfIds(reqObj)

  reqObj.cmdId = _.isUndefined(mutils.cmdNum(cmdId)) ? cmdId : mutils.cmdNum(cmdId) // 255: unknown cmd

  if (reqObj.cmdId === 255) preError = preError || new Error('Unable to send the unknown command.')

  if (preError) {
    deferred.reject(preError)
    return deferred.promise.nodeify(callback)
  }

  if (qnode.getStatus() === 'sleep' && !quickping) {
    qnode.quickPingReq().then(() => {
      doSending()
    }).fail(() => {
      let couldWait = false
      if (qnode._nextCheckin) couldWait = (qnode._nextCheckin - _.now()) < qnode._CheckinMargin

      if (couldWait) doSending()
      else deferred.reject(`Client is sleeping, clientId: ${qnode.clientId}`)
    }).done()
  } else {
    doSending()
  }

  function doSending () {
    reqObj.transId = self.nextTransId()
    evt = `${clientId}:${cmdIdString}:${reqObj.transId}` // 'foo_id:read:101'

    while (areq.isEventPending(evt)) {
      reqObj.transId = self.nextTransId()
      evt = `${clientId}:${cmdIdString}:${reqObj.transId}`
    }

    logReq('REQ --> %s, transId: %d', cmdIdString, reqObj.transId)

    msg = JSON.stringify(reqObj)

    self.encrypt(msg, clientId, (err, encrypted) => {
      if (err) {
        deferred.reject(err)
      } else {
        areq.register(evt, deferred, (rsp) => {
          logReq('RSP <-- %s, transId: %d, status: %d', cmdIdString, reqObj.transId, rsp.status)
          if (qnode.getStatus() !== 'sleep') qnode._setStatus('online')
          areq.resolve(evt, rsp)
        }, waitTime)

        setImmediate(() => {
          self.mClient.publish(topic, encrypted, { qos: 1, retain: false })
        })
      }
    })
  }

  return deferred.promise.nodeify(callback)
}

/** ********************************************************************************************** */
/** * Request to Remote APIs                                                                    ** */
/** ********************************************************************************************** */
MShepherd.prototype.readReq = function (clientId, reqObj, callback) {
  return this._requestSender('read', clientId, reqObj, callback)
}

MShepherd.prototype.writeReq = function (clientId, reqObj, callback) {
  return this._requestSender('write', clientId, reqObj, callback)
}

MShepherd.prototype.writeAttrsReq = function (clientId, reqObj, callback) {
  return this._requestSender('writeAttrs', clientId, reqObj, callback)
}

MShepherd.prototype.discoverReq = function (clientId, reqObj, callback) {
  return this._requestSender('discover', clientId, reqObj, callback)
}

MShepherd.prototype.executeReq = function (clientId, reqObj, callback) {
  return this._requestSender('execute', clientId, reqObj, callback)
}

MShepherd.prototype.observeReq = function (clientId, reqObj, callback) {
  return this._requestSender('observe', clientId, reqObj, callback)
}

MShepherd.prototype.pingReq = function (clientId, callback) {
  return this._requestSender('ping', clientId, {}, callback)
}

MShepherd.prototype.quickPingReq = function (clientId, callback) {
  return this._requestSender('quickping', clientId, {}, quickPingWaitTime, callback)
}

MShepherd.prototype.identifyReq = function (clientId, callback) {
  return this._requestSender('identify', clientId, {}, callback)
}
/** ********************************************************************************************** */
/** * Server Information                                                                        ** */
/** ********************************************************************************************** */
MShepherd.prototype.info = function () {
  return {
    name: this.clientId,
    enabled: this._enabled,
    net: _.cloneDeep(this._net),
    devNum: _.size(this._nodebox),
    startTime: this._startTime,
    joinTimeLeft: this._permitJoinTime
  }
}

MShepherd.prototype.list = function (cIds) {
  const self = this
  let foundNodes

  if (_.isString(cIds)) cIds = [cIds]
  else if (!_.isUndefined(cIds) && !_.isArray(cIds)) throw new TypeError('cIds should be a string or an array of strings if given.')
  else if (!cIds) cIds = _.keys(this._nodebox) // list all

  foundNodes = _.map(cIds, (cid) => {
    let rec
    const found = self.find(cid)

    if (found) {
      rec = found._dumpSummary()
      rec.status = found.status
    }

    return rec // will push undefined to foundNodes array if not found
  })

  return foundNodes
}

MShepherd.prototype.devListMaintain = function (qnode, callback) {
  const deferred = Q.defer()
  let nodes
  const nodeIds = []
  const maintainNodes = []

  if (_.isFunction(qnode)) {
    callback = qnode
    qnode = undefined
  }

  if (_.isArray(qnode)) nodes = qnode
  else if (qnode) nodes = [qnode]
  else nodes = this._nodebox

  _.forEach(nodes, (qn) => {
    nodeIds.push(qn.clientId)
    maintainNodes.push(qn.maintain())
  })

  Q.allSettled(maintainNodes).then(resArr => _.map(resArr, (r, i) => ({
    clientId: nodeIds[i],
    result: r.state === 'fulfilled'
  }))).done(deferred.resolve, deferred.reject)

  return deferred.promise.nodeify(callback)
}

/** ********************************************************************************************** */
/** * Private Functions                                                                         ** */
/** ********************************************************************************************** */
function permitJoin (time) {
  const self = this

  if (!_.isNil(time) && !_.isNumber(time)) throw new TypeError('time should be a number if given.')

  if (!this._enabled) {
    this._permitJoinTime = 0
    return false
  }

  time = time || 0
  this._permitJoinTime = Math.floor(time)

  if (!time) {
    this._joinable = false
    this._permitJoinTime = 0

    this.emit('permitJoining', this._permitJoinTime)
    if (this._permitJoinCountdown) {
      clearInterval(this._permitJoinCountdown)
      this._permitJoinCountdown = null
    }
    return true
  }

  this._joinable = true
  this.emit('permitJoining', this._permitJoinTime)

  this._permitJoinCountdown = setInterval(() => {
    self._permitJoinTime -= 1

    if (self._permitJoinTime === 0) {
      self._joinable = false
      clearInterval(self._permitJoinCountdown)
      self._permitJoinCountdown = null
    }

    self.emit('permitJoining', self._permitJoinTime)
  }, 1000)

  return true
}

function _bridgeEvents (shepherd) {
  shepherd.on('ind:incoming', (qnode) => {
    shepherd.emit('ind', { type: 'devIncoming', qnode, data: undefined })
  })

  shepherd.on('ind:leaving', (clientId, macAddr) => {
    shepherd.emit('ind', { type: 'devLeaving', qnode: clientId, data: macAddr })
  })

  shepherd.on('ind:updated', (qnode, diff) => {
    shepherd.emit('ind', { type: 'devUpdate', qnode, data: diff })
  })

  shepherd.on('ind:status', (qnode, status) => {
    shepherd.emit('ind', { type: 'devStatus', qnode, data: status })
  })

  shepherd.on('ind:checkin', (qnode) => {
    shepherd.emit('ind', { type: 'devCheckin', qnode, data: undefined })
  })

  shepherd.on('ind:checkout', (qnode) => {
    shepherd.emit('ind', { type: 'devCheckout', qnode, data: undefined })
  })

  shepherd.on('ind:notified', (qnode, msg) => {
    const notifData = {
      oid: msg.oid,
      iid: msg.iid,
      rid: msg.rid,
      data: msg.data
    }

    if (_.isNil(notifData.rid)) delete notifData.rid

    shepherd.emit('ind', { type: 'devNotify', qnode, data: notifData })
  })

  shepherd.on('ind:changed', (ind) => {
    const qnode = shepherd.find(ind.clientId)
    const notifData = {
      oid: ind.oid,
      iid: ind.iid,
      rid: ind.rid,
      data: ind.data
    }

    if (!qnode) return

    if (_.isNil(notifData.rid)) delete notifData.rid

    shepherd.emit('ind', { type: 'devChange', qnode, data: notifData })
  })
}

module.exports = MShepherd
