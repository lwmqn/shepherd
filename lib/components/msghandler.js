
const Q = require('q')
const _ = require('busyman')
const mutils = require('./mutils')
const MqttNode = require('./mqtt-node')
const debug = require('debug')('mqtt-shepherd:msgHdlr')

const msghdlr = {}

msghdlr._clientRegisterHandler = function (shepherd, msg) {
  // reg_data = { clientId, transId, ip, mac, lifetime, version, objList, port(opt) }
  // example for objList: { '1': [ 0 ], '3': [ 0 ], '4': [ 0 ], '3303': [ 0, 1, 2 ] }
  let badAttr = false
  const { transId } = msg
  const shepherdId = shepherd.clientId
  let qnode = shepherd.find(msg.clientId)
  let so = qnode ? qnode.so : null
  const acceptedAttrs = ['clientId', 'transId', 'lifetime', 'version', 'objList', 'mac', 'ip']

  debug('REQ <-- register, transId: %d', msg.transId)

  // shepherd itself no need to be in nodebox
  if (msg.clientId === shepherdId) return

  // mac address is unique and case-insensitive
  if (_.isString(msg.mac)) msg.mac = msg.mac.toLowerCase()

  // validate message
  _.forEach(msg, (val, key) => { // unknown device attributes are not allowed
    if (!_.includes(acceptedAttrs, key)) badAttr = true
  })

  _.forEach(acceptedAttrs, (attrName) => { // mandatory attributes check (version is optional)
    if (!_.has(msg, attrName) && (attrName !== 'version')) badAttr = true
  })

  if (badAttr) return sendResponse(shepherd, 'register', msg.clientId, transId, 'BadRequest')

  if (!qnode && msg.clientId) {
    // do register procedure
    qnode = new MqttNode(shepherd, msg.clientId, msg) // msg == devAttrs
    so = qnode.so

    qnode._registered = false
    // must set online here, or request will fail.
    // Don't use _setStatus('online')! It will emit status change too early to cause problems
    qnode.status = 'online'

    shepherd._nodebox[msg.clientId] = qnode

    msghdlr._clientObjectDetailReq(shepherd, msg.clientId, msg.objList).then((objs) => {
      qnode.status = 'unknown' // change to status to 'unknown' for the later _setStatus('online') to trigger status change
      _.forEach(objs, (obj) => {
        so.addIObjects(obj.oid, obj.data)
      })
    }).then(() => {
      let allowDevIncoming

      if (_.isFunction(shepherd.acceptDevIncoming)) {
        allowDevIncoming = Q.nbind(shepherd.acceptDevIncoming, shepherd)
        return allowDevIncoming(qnode).timeout(shepherd.devIncomingAcceptanceTimeout)
      }
      return true
    }).then((accepted) => {
      if (accepted) {
        qnode._registered = true
        qnode._setStatus('online')
        qnode.dbSave()
      } else {
        qnode._registered = false
        qnode.dbRemove().done()
        qnode.so = null
        shepherd._nodebox[msg.clientId] = null
        delete shepherd._nodebox[msg.clientId]
      }
      return accepted
    })
      .then((accepted) => {
        if (accepted) {
          sendResponse(shepherd, 'register', msg.clientId, transId, 'Created')

          qnode.enableLifeChecker()

          fireImmediate(shepherd, '_registered', qnode)
          fireImmediate(shepherd, 'ind:incoming', qnode)
        } else {
          sendResponse(shepherd, 'register', msg.clientId, transId, 'Unauthorized')
        }
      })
      .fail((err) => {
        debug(err)
        qnode._setStatus('offline')
        qnode._registered = false
        qnode.dbRemove().done()
        qnode.so = null
        shepherd._nodebox[msg.clientId] = null
        delete shepherd._nodebox[msg.clientId]
        sendResponse(shepherd, 'register', msg.clientId, transId, 'InternalServerError')
      })
      .done()
  } else { // if node exists
    if (qnode.mac !== msg.mac) {
      sendResponse(shepherd, 'register', msg.clientId, transId, 'Forbidden')
    } else {
      msg._fromRegisterHandler = true
      msghdlr._clientUpdateHandler(shepherd, msg)
    }
  }
}

msghdlr._clientUpdateHandler = function (shepherd, msg) {
  // update_data = { clientId, transId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt), port(opt) }
  let so
  let oldObjList
  let oldNodeData
  let badAttr = false
  const { transId } = msg
  const qnode = shepherd._nodebox[msg.clientId]
  const isFromRegister = !!msg._fromRegisterHandler
  const acceptedAttrs = ['clientId', 'transId', 'lifetime', 'version', 'objList', 'mac', 'ip']

  if (!isFromRegister) debug('REQ <-- update, transId: %d', msg.transId)
  // this msg is coming from register handler, delete the flag in msg
  delete msg._fromRegisterHandler
  delete msg.transId

  if (qnode) qnodeMayChangeStatusTo(qnode, 'online')

  // validate message
  _.forEach(msg, (val, key) => {
    if (key === 'mac') msg.mac = msg.mac.toLowerCase() // mac is case-insensitive

    if (!_.includes(acceptedAttrs, key)) badAttr = true
  })

  if (!qnode || !qnode.so) return sendResponse(shepherd, 'update', msg.clientId, transId, 'NotFound')
  if (msg.mac && (qnode.mac !== msg.mac)) return sendResponse(shepherd, 'update', msg.clientId, transId, 'Conflict')
  if (badAttr) return sendResponse(shepherd, 'update', msg.clientId, transId, 'BadRequest')

  so = qnode.so
  oldNodeData = qnode.dump()
  oldObjList = qnode.objList

  qnode.updateAttrs(msg).then((diff) => {
    qnode.enableLifeChecker()

    if (_.has(diff, 'objList')) {
      qnode._registered = false
      // kill old objects
      _.forEach(oldObjList, (iids, oid) => {
        const oidKey = mutils.oidKey(oid)
        so[oidKey] = null
        delete so[oidKey]
      })

      msghdlr._clientObjectDetailReq(shepherd, msg.clientId, msg.objList).then((objs) => {
        // [ { oid: oids[idx], data: obj }, ... ]
        _.forEach(objs, (obj) => {
          so.addIObjects(obj.oid, obj.data)
        })
      }).then(() => {
        // new object list
        qnode.objList = msg.objList
        return qnode.dbSave()
      }).then(() => {
        qnode._registered = true
        if (!isFromRegister) sendResponse(shepherd, 'update', msg.clientId, transId, 'Changed')

        fireImmediate(shepherd, 'updated', { clientId: qnode.clientId, data: diff })
        fireImmediate(shepherd, 'ind:updated', qnode, diff)
      })
        .fail((err) => {
          debug(err)
          if (!isFromRegister) sendResponse(shepherd, 'update', msg.clientId, transId, 'InternalServerError')
          // kill new objects
          _.forEach(qnode.objList, (iids, oid) => {
            const oidKey = mutils.oidKey(oid)
            so[oidKey] = null
            delete so[oidKey]
          })

          // recover old Objs
          qnode.objList = oldObjList
          so.addObjects(oldNodeData.so)
          delete oldNodeData.so

          _.merge(qnode, oldNodeData)
        })
        .done()
    } else {
      qnode.maintain().done()

      if (!isFromRegister) sendResponse(shepherd, 'update', msg.clientId, transId, 'Changed')

      if (!_.isEmpty(diff)) {
        fireImmediate(shepherd, 'updated', { clientId: qnode.clientId, data: diff })
        fireImmediate(shepherd, 'ind:updated', qnode, diff)
      }
    }
  }).fail((err) => {
    debug(err)
    if (!isFromRegister) sendResponse(shepherd, 'update', msg.clientId, transId, 'InternalServerError')
  }).done(() => {
    if (isFromRegister) { // if this msg is from register handler, send 'register' response to client
      fireImmediate(shepherd, '_registered', qnode)
      fireImmediate(shepherd, 'ind:incoming', qnode)
      sendResponse(shepherd, 'register', msg.clientId, transId, 'OK')
    }
  })
}

msghdlr._clientDeregisterHandler = function (shepherd, msg) {
  // dereg_data = { clientId, transId };
  let macAddr
  const qnode = shepherd.find(msg.clientId)

  debug('REQ <-- deregister, transId: %d', msg.transId)

  if (!qnode) return sendResponse(shepherd, 'deregister', msg.clientId, msg.transId, 'NotFound')

  macAddr = qnode.mac
  qnode.disableLifeChecker()
  qnode._registered = false
  qnode._setStatus('offline')

  qnode.dbRemove().done()
  qnode.so = null
  shepherd._nodebox[msg.clientId] = null
  delete qnode.so
  delete shepherd._nodebox[msg.clientId]

  sendResponse(shepherd, 'deregister', msg.clientId, msg.transId, 'Deleted', () => {
    fireImmediate(shepherd, '_deregistered', msg.clientId)
    fireImmediate(shepherd, 'ind:leaving', msg.clientId, macAddr)
  })
}

msghdlr._clientCheckHandler = function (shepherd, msg) {
  // check_data = { clientId, transId, sleep(opt), duration(opt) }
  const qnode = shepherd.find(msg.clientId)
  let margin

  debug('REQ <-- schedule, transId: %d', msg.transId)

  if (_.isNil(msg.sleep) && _.isNil(msg.duration)) msg.sleep = false

  if (!qnode) return sendResponse(shepherd, 'schedule', msg.clientId, msg.transId, 'NotFound')
  if (_.isNil(msg.sleep)) return sendResponse(shepherd, 'schedule', msg.clientId, msg.transId, 'BadRequest')

  sendResponse(shepherd, 'schedule', msg.clientId, msg.transId, 'OK', () => {
    // change state after pub
    if (msg.sleep) {
      qnode._setStatus('sleep')

      if (msg.duration) qnode.enableSleepChecker(msg.duration)

      shepherd.emit('ind:checkout', qnode)
    } else {
      qnode._lastCheckin = _.now()
      margin = Math.abs(qnode._lastCheckin - qnode._nextCheckin)

      if (qnode._nextCheckin && (margin <= qnode._CheckinMargin)) qnode.disableSleepChecker()

      qnode._setStatus('online')
      shepherd.emit('ind:checkin', qnode)
    }
  })
}

msghdlr._clientNotifyHandler = function (shepherd, msg) {
  // notify_data = { clientId, transId, oid, iid, rid, data }
  // (oid + iid), (oid + iid + rid)
  let rspStatus
  let targetPath
  const qnode = shepherd.find(msg.clientId)
  const iobj = (qnode && qnode.so) ? qnode.so.acquire(msg.oid, msg.iid) : undefined
  const resrc = (iobj && !_.isNil(msg.rid)) ? qnode.so.acquire(msg.oid, msg.iid, msg.rid) : undefined

  debug('REQ <-- notify, transId: %d', msg.transId)

  // validate message
  if (!qnode || !qnode.so) rspStatus = 'NotFound'
  else if (_.isNil(msg.oid) || _.isNil(msg.iid)) rspStatus = 'BadRequest'
  else if (!iobj) rspStatus = 'NotFound'
  else if (_.isNil(msg.rid)) {
    // data is object instance
    rspStatus = !_.isPlainObject(msg.data) ? 'BadRequest' : undefined
  } else if (_.isUndefined(resrc)) {
    // data is resouece
    rspStatus = 'NotFound'
  }

  qnodeMayChangeStatusTo(qnode, 'online')

  if (rspStatus) return sendResponse(shepherd, 'notify', msg.clientId, msg.transId, rspStatus)

  if (_.isNil(msg.rid)) { // data is object instance
    var badResrc = false
    targetPath = `${msg.oid}/${msg.iid}`

    _.forEach(msg.data, (val, rid) => {
      const ridKey = mutils.ridKey(msg.oid, rid)
      badResrc = badResrc || _.isUndefined(qnode.so.acquire(msg.oid, msg.iid, rid))
      // replace rid with its string id
      delete msg.data[rid]
      msg.data[ridKey] = val
    })
  } else { // data is an resource
    targetPath = `${msg.oid}/${msg.iid}/${msg.rid}`
  }

  if (badResrc) return sendResponse(shepherd, 'notify', msg.clientId, msg.transId, 'BadRequest')

  fireImmediate(shepherd, 'ind:notified', qnode, msg)

  qnode._checkAndUpdate(targetPath, msg.data).then((diff) => {
    msg.data = diff
    return sendResponse(shepherd, 'notify', msg.clientId, msg.transId, 'Changed')
  }).fail((err) => {
    fireImmediate(shepherd, 'error', err)
    return sendResponse(shepherd, 'notify', msg.clientId, msg.transId, 'InternalServerError')
  }).done()
}

msghdlr._clientResponseHandler = function (shepherd, msg) {
  let evt
  let cmdIdString = mutils.cmdKey(msg.cmdId)

  cmdIdString = cmdIdString || msg.cmdId

  evt = `${msg.clientId}:${cmdIdString}:${msg.transId}` // 'foo_id:2:101'
  shepherd.emit(evt, _.omit(msg, ['transId', 'clientId', 'cmdId']))
}

msghdlr._clientPingHandler = function (shepherd, msg) {
  // ping_data = { clientId, transId }
  const qnode = shepherd.find(msg.clientId)

  debug('REQ <-- ping, transId: %d', msg.transId)
  qnodeMayChangeStatusTo(qnode, 'online')
  sendResponse(shepherd, 'ping', msg.clientId, msg.transId, 'OK')
}

msghdlr._clientLwtHandler = function (shepherd, msg) {
  // lwt_data = { clientId, data }
  const qnode = shepherd.find(msg.clientId)

  debug('MQTT last will and testament: %s', msg.data)

  qnodeMayChangeStatusTo(qnode, 'offline')
}

msghdlr._clientBadMsgHandler = function (shepherd, cId, intf, msg) {
  const qnode = shepherd.find(cId)
  qnodeMayChangeStatusTo(qnode, 'online')
  sendResponse(shepherd, intf, cId, 0, 'BadRequest')
}

msghdlr._clientOtherTopicsHandler = function (shepherd, topic, message, packet) {
  shepherd.emit('unhandledTopic', topic, message, packet)
}

msghdlr._clientObjectDetailReq = function (shepherd, clientId, objListOfSo, callback) {
  const readAllObjectPromises = []
  const oids = []

  // read every object => dig into the structure and id-name transform
  _.forEach(objListOfSo, (iids, oid) => {
    const oidNum = mutils.oidNum(oid)
    oids.push(oidNum)
    readAllObjectPromises.push(shepherd.readReq(clientId, { oid: oidNum }))
  })

  return Q.all(readAllObjectPromises).then((rsps) => {
    const objs = []
    let isAnyFail = false

    _.forEach(rsps, (rsp, idx) => {
      if (mutils.isGoodResponse(rsp.status)) objs.push({ oid: oids[idx], data: rsp.data })
      else isAnyFail = true
    })

    if (isAnyFail) throw new Error('Object requests fail.')
    else return objs
  }).nodeify(callback)
}

/** ********************************************************************************************** */
/** * Private Helper                                                                            ** */
/** ********************************************************************************************** */
function sendResponse (shepherd, intface, clientId, transId, status, callback) {
  const rspCode = mutils.rspCodeNum(status)

  shepherd._responseSender(intface, clientId, {
    transId,
    status: rspCode
  }).done(() => {
    debug('RSP --> %s, transId: %d, status: %d', intface, transId, rspCode)

    if (_.isFunction(callback)) callback()
  })
}

function fireImmediate () { // (shepherd, evt, ...)
  const args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments))
  const shepherd = args.shift()

  setImmediate(() => {
    shepherd.emit.apply(shepherd, args)
  })
}

function qnodeMayChangeStatusTo (qnode, status) {
  if (qnode && qnode.getStatus() !== 'sleep') qnode._setStatus(status)
}

module.exports = msghdlr
