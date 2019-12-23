const _ = require('busyman')
const SmartObject = require('@lwmqn/smartobject')

SmartObject.prototype.addObjects = function (smObjs) {
  // smObj = { oid1: { iid1: rObjs, iid2: rObjs }, oid2: { iid: rObjs } };
  const self = this

  if (!_.isObject(smObjs) || _.isArray(smObjs)) throw new TypeError('Objects should be objects.')

  _.forEach(smObjs, (iObjs, oid) => {
    self.addIObjects(oid, iObjs)
  })

  return this
}

SmartObject.prototype.addIObjects = function (oid, iObjs) {
  // iObj = { iid1: rObj, iid2: rObj }
  const self = this

  if (!_.isObject(iObjs) || _.isArray(iObjs)) throw new TypeError('Object Instances should be objects.')

  _.forEach(iObjs, (rObjs, iid) => {
    self.init(oid, iid, rObjs)
  })

  return this
}

SmartObject.prototype.acquire = function (oid, iid, rid) {
  if (arguments.length === 1) return this.findObject(oid)
  if (arguments.length === 2) return this.findObjectInstance(oid, iid)
  if (arguments.length === 3) return this.get(oid, iid, rid)
  return undefined
}

module.exports = SmartObject
