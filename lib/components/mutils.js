const _ = require('busyman')
const mutils = require('@lwmqn/util')

mutils.isTimeout = function (err) {
  return _.isObject(err) && (err.code === 'ETIMEDOUT')
}

mutils.isGoodResponse = function (status) {
  const statusCode = mutils.getRspCode(status)
  const goodCodes = [200, 201, 202, 204, 205]
  return (!_.isNil(statusCode) && _.includes(goodCodes, statusCode.value))
}

mutils.invalidPathOfTarget = function (target, objToUpdate) {
  const invalidPath = []

  _.forEach(objToUpdate, (n, p) => {
    if (!_.has(target, p)) invalidPath.push(p)
  })
  return invalidPath
}

mutils.turnPathToReqArgs = function (path, clientId, data, callback) {
  const args = mutils.slashPath(path).split('/')
  const reqObj = {}
  const reqArgs = [clientId, reqObj]

  if (!args.length || args.length > 3) throw new Error('Bad path')

  reqObj.oid = args[0]

  if (args.length > 1) reqObj.iid = args[1]

  if (args.length > 2) reqObj.rid = args[2]

  if (_.isFunction(data)) callback = data
  else if (!_.isUndefined(data)) reqObj.data = data

  if (_.isFunction(callback)) reqArgs.push(callback)

  return reqArgs
}

mutils.turnReqObjOfIds = function (reqObj) {
  let oidNum

  if (_.has(reqObj, 'oid')) oidNum = reqObj.oid = mutils.oidNum(reqObj.oid)

  if (_.has(reqObj, 'rid')) reqObj.rid = mutils.ridNum(oidNum, reqObj.rid)

  if (_.has(reqObj, 'iid')) {
    let iidNum = parseInt(reqObj.iid)
    iidNum = _.isNaN(iidNum) ? reqObj.iid : iidNum
    reqObj.iid = iidNum
  }

  return reqObj
}

mutils.requestDataType = function (path) {
  const pathItems = mutils.pathItems(mutils.dotPath(path))
  const reqDataTypes = ['object', 'instance', 'resource']

  return reqDataTypes[pathItems.length - 1]
}

mutils.readDataInfo = function (path, data) {
  const reqDataType = mutils.requestDataType(path)
  const reqPathItems = mutils.pathItems(path)
  const inData = _.cloneDeep(data)
  let oidkey; let iidkey; let
    ridkey

  if (reqDataType === 'object') {
    oidkey = mutils.oidKey(reqPathItems[0])
    _.forEach(inData, (inst, iid) => {
      _.forEach(inst, (val, rid) => {
        const rkey = mutils.ridKey(oidkey, rid)
        inData[iid][rkey] = val

        if (rkey !== rid) delete inData[iid][rid]
      })
    })
  } else if (reqDataType === 'instance') {
    oidkey = mutils.oidKey(reqPathItems[0])
    iidkey = reqPathItems[1]
    _.forEach(inData, (val, rid) => {
      const rkey = mutils.ridKey(oidkey, rid)
      inData[rkey] = val
      if (rkey !== rid) delete inData[rid]
    })
  } else if (reqDataType === 'resource') {
    oidkey = mutils.oidKey(reqPathItems[0])
    iidkey = reqPathItems[1]
    ridkey = mutils.ridKey(oidkey, reqPathItems[2])
  }

  return {
    type: reqDataType,
    oid: oidkey,
    iid: iidkey,
    rid: ridkey,
    data: inData
  }
}

mutils.objectInstanceDiff = function (oldInst, newInst) {
  const badPath = mutils.invalidPathOfTarget(oldInst, newInst)

  if (badPath.length !== 0) {
    _.forEach(badPath, (p) => {
      _.unset(newInst, p) // kill bad property, they will not be updated
    })
  }
  return mutils.objectDiff(oldInst, newInst)
}

mutils.resourceDiff = function (oldVal, newVal) {
  let badPath

  if (typeof oldVal !== typeof newVal) {
    return newVal
  } if (_.isPlainObject(oldVal)) {
    // object diff
    badPath = mutils.invalidPathOfTarget(oldVal, newVal)
    if (badPath.length !== 0) {
      _.forEach(badPath, (p) => {
        _.unset(newVal, p) // kill bad property, they will not be updated
      })
    }

    return mutils.objectDiff(oldVal, newVal)
  } if (oldVal !== newVal) {
    return newVal
  }
  return null
}

mutils.objectDiff = function (oldObj, newObj) {
  const pvp = mutils.buildPathValuePairs('/', newObj)
  const diff = {}

  _.forEach(pvp, (val, path) => {
    if (!_.has(oldObj, path) || _.get(oldObj, path) !== val) _.set(diff, path, val)
  })
  return diff
}

mutils.devAttrsDiff = function (node, attrs) {
  // { clientId, lifetime(opt), version(opt), objList(opt), mac(opt), ip(opt) }
  const diff = {}

  _.forEach(attrs, (val, key) => {
    let oList
    let isObjListDiff = false

    // just ignore, no need to throw
    if (!_.has(node, key)) return

    if (key === 'objList') {
      oList = val

      _.forEach(oList, (iids, oid) => {
        const nodeIids = _.get(node.objList, oid)

        if (!nodeIids) isObjListDiff = true
        else if (!_.isEqual(iids.sort(), nodeIids.sort())) isObjListDiff = true
      })

      if (isObjListDiff) diff.objList = val
    } else if (node[key] !== val) {
      diff[key] = val
    }
  })

  return diff
}

module.exports = mutils
