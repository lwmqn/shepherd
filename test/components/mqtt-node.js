/* eslint-env mocha */
const assert = require('assert')
const path = require('path')
const fs = require('fs')
const _ = require('busyman')
const debug = require('debug')

const MqttNode = require('../../lib/components/mqtt-node')
const Mqdb = require('../../lib/components/mqdb')

const cId = 'Im-client-node'
const devAttrs = {
  lifetime: 60000,
  ip: '140.117.11.1',
  mac: '11:22:AA:BB:CC:DD',
  version: 'v0.0.1'
}

const smObj1 = {
  x: {
    0: {
      x1: 1,
      x2: 2
    },
    1: {
      y1: 3,
      y2: 4
    }
  }
}
const smObj2 = {
  y: { 3: { y31: 'hi' } },
  z: { 1: { z11: 'hello', z12: 'world' }, 0: { z11: 'hello', z12: 'world' } }
}

const fakeShp = {
  _mqdb: null,
  emit () {}
}

var node = new MqttNode(fakeShp, cId, devAttrs)
node.so.addObjects(_.merge(smObj1, smObj2))
const myso = node.so

after((done) => {
  fs.unlink(path.resolve('./lib/database/mqttNode.db'), () => {
    setTimeout(() => {
      done()
    }, 200)
  })
})

describe('mqtt-node -> verify', () => {
  const dbFolderY = path.resolve('./lib/database')
  const dbPathY = path.resolve('./lib/database/mqttNode.db')

  before((done) => {
    fs.stat(dbPathY, (err, stats) => {
      if (err) {
        fs.mkdir(dbFolderY, () => {
          fakeShp._mqdb = new Mqdb(dbPathY)

          setTimeout(() => {
            done()
          }, 200)
        })
      } else {
        fs.unlink(path.resolve('./lib/database/mqttNode.db'), () => {
          fakeShp._mqdb = new Mqdb(dbPathY)
          setTimeout(() => {
            done()
          }, 200)
        })
      }
    })
  })

  describe('mqtt-node -> Constructor Check', () => {
    it('should has all correct members after new', () => {
      const node = new MqttNode(fakeShp, cId, devAttrs)
      assert.deepStrictEqual(node.shepherd, fakeShp)
      assert.strictEqual(node.clientId, cId)
      assert.strictEqual(node.ip, '140.117.11.1')
      assert.strictEqual(node.mac, '11:22:AA:BB:CC:DD')
      assert.strictEqual(node.version, 'v0.0.1')
      assert.strictEqual(node.lifetime, 60000)
      assert.deepStrictEqual(node.objList, {})
      assert.notStrictEqual(node.so, null)
      assert.strictEqual(node._registered, false)
      assert.strictEqual(node.status, 'offline')
      assert.strictEqual(node.lifeChecker, null)
    })
  })

  describe('Signature Check', () => {
    describe('#.MqttNode(shepherd, clientId, devAttrs)', () => {
      it('should throw if input arguments have wrong type', () => {
        assert.doesNotThrow(() => new MqttNode({}, 'xxx'), Error)
        assert.doesNotThrow(() => new MqttNode({}, 'xxx', {}), Error)

        assert.throws(() => new MqttNode({}, 'xxx', []), TypeError)
        assert.throws(() => new MqttNode({}, 'xxx', 1), TypeError)
        assert.throws(() => new MqttNode({}, 'xxx', 'ttt'), TypeError)

        assert.throws(() => new MqttNode({}, [], {}), TypeError)
        assert.throws(() => new MqttNode({}, {}, {}), TypeError)
        assert.throws(() => new MqttNode({}, false, {}), TypeError)
        assert.throws(() => new MqttNode({}, undefined, {}), TypeError)
        assert.throws(() => new MqttNode({}, null, {}), TypeError)

        assert.throws(() => new MqttNode({}), Error)

        assert.throws(() => new MqttNode([], 'xxx', {}), TypeError)
        assert.throws(() => new MqttNode(1, 'xxx', {}), TypeError)
        assert.throws(() => new MqttNode(false, 'xxx', {}), TypeError)
        assert.throws(() => new MqttNode(undefined, 'xxx', {}), TypeError)
        assert.throws(() => new MqttNode(null, 'xxx', {}), TypeError)
        assert.throws(() => new MqttNode('fff', 'xxx', {}), TypeError)
      })
    })

    describe('#.acquire(oid)', () => {
      it('should throw if input arguments have wrong type', () => {
        assert.throws(() => { node.so.acquire({}) }, TypeError)
        assert.throws(() => { node.so.acquire([]) }, TypeError)
        assert.throws(() => { node.so.acquire(true) }, TypeError)
        assert.throws(() => { node.so.acquire(null) }, TypeError)
        assert.doesNotThrow(() => { node.so.acquire(1) }, TypeError)

        assert.strictEqual(node.so.acquire(), undefined)
      })

      it('should throw if so not bound', () => {
        const sotmp = node.so
        node.so = null
        assert.throws(() => { node.so.acquire('x') }, Error)
        node.so = sotmp
      })
    })

    describe('#.geIObject(oid, iid)', () => {
      it('should throw if input arguments have wrong type', () => {
        node.so = myso
        assert.strictEqual(node.so.acquire(), undefined)

        assert.throws(() => { node.so.acquire({}, 1) }, TypeError)
        assert.throws(() => { node.so.acquire([], 1) }, TypeError)
        assert.throws(() => { node.so.acquire(true, 1) }, TypeError)
        assert.throws(() => { node.so.acquire(null, 1) }, TypeError)

        assert.throws(() => { node.so.acquire(1, {}) }, TypeError)
        assert.throws(() => { node.so.acquire(1, []) }, TypeError)
        assert.throws(() => { node.so.acquire(1, true) }, TypeError)
        assert.throws(() => { node.so.acquire(1, null) }, TypeError)
        assert.doesNotThrow(() => { node.so.acquire(1, 2) }, TypeError)
      })

      it('should throw if so not bound', () => {
        const sotmp = node.so
        node.so = null
        assert.throws(() => { node.so.acquire('x', 2) }, Error)
        node.so = sotmp
      })
    })

    describe('#.getResource(oid, iid, rid)', () => {
      it('should throw if input arguments have wrong type', () => {
        node.so = myso
        assert.strictEqual(node.so.acquire(), undefined)

        assert.throws(() => { node.so.acquire({}, 1, 2) }, TypeError)
        assert.throws(() => { node.so.acquire([], 1, 2) }, TypeError)
        assert.throws(() => { node.so.acquire(true, 1, 2) }, TypeError)
        assert.throws(() => { node.so.acquire(null, 1, 2) }, TypeError)

        assert.throws(() => { node.so.acquire('x', {}, 1) }, TypeError)
        assert.throws(() => { node.so.acquire('x', [], 1) }, TypeError)
        assert.throws(() => { node.so.acquire('x', true, 1) }, TypeError)
        assert.throws(() => { node.so.acquire('x', null, 1) }, TypeError)

        assert.throws(() => { node.so.acquire('x', 0, {}) }, TypeError)
        assert.throws(() => { node.so.acquire('x', 0, []) }, TypeError)
        assert.throws(() => { node.so.acquire('x', 0, true) }, TypeError)
        assert.throws(() => { node.so.acquire('x', 0, null) }, TypeError)

        assert.doesNotThrow(() => { node.so.acquire('x', 2, 3) }, Error)
        assert.doesNotThrow(() => { node.so.acquire('f', 2, 'c') }, Error)
      })

      it('should throw if so not bound - no acquire method', () => {
        node.so = null
        assert.throws(() => { node.so.acquire('x', 2, 0) }, Error)
        node.so = myso
      })
    })

    describe('#.maintain', () => {
      it('should throw if cIds is not a string or not an array of strings', () => {
        assert.throws(() => { node.maintain({}) }, TypeError)
        assert.throws(() => { node.maintain(true) }, TypeError)
        assert.throws(() => { node.maintain(['ceed', {}]) }, TypeError)

        assert.throws(() => { node.maintain('ceed') }, TypeError)
        assert.throws(() => { node.maintain(['ceed', 'xxx']) }, TypeError)
        assert.doesNotThrow(() => { node.maintain(() => {}) }, Error)
      })
    })

    describe('#.dump()', () => {
      it('should should empty object if no so bound', () => {
        node.so = null
        assert.deepStrictEqual(node.dump().so, {})
        node.so = myso
      })
    })

    // enableLifeChecker(), disableLifeChecker() no arguments
    // dbRead(), dbSave(), dbRemove() no arguments
    // dump(), restore(), maintain() only a callback.... will throw if it is not a function

    // Asynchronous APIs
    describe('#.readReq(path, callback)', () => {
      it('should return error if input arguments have wrong path type', (done) => {
        node.readReq().fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if no shepherd', (done) => {
        node.shepherd = null
        node.readReq('x').fail((err) => {
          debug(err)
          done()
        })
        node.shepherd = fakeShp
      })

      it('should return error if no so', (done) => {
        node.so = null
        node.readReq('x').fail((err) => {
          debug(err)
          done()
        })
        // node.so = myso;
      })
    })

    describe('#.writeReq(path, data, callback)', () => {
      it('should return error if input arguments have wrong path type', (done) => {
        node.writeReq(3, 'data').fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if no shepherd', (done) => {
        node.shepherd = null
        node.writeReq('x', {}).fail((err) => {
          debug(err)
          done()
        })
        node.shepherd = fakeShp
      })

      it('should throw if no so', (done) => {
        node.so = null
        node.writeReq('x', {}).fail((err) => {
          debug(err)
          done()
        })
        // node.so = myso;
      })

      it('should return error if bad object', (done) => {
        node.writeReq('/', 'data').fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if bad object data', (done) => {
        node.writeReq('/x', 'data').fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if bad instance data', (done) => {
        node.writeReq('/x/2', 'data').fail((err) => {
          debug(err)
          done()
        })
      })
    })

    describe('#.discoverReq(path, callback)', () => {
      it('should return error if input arguments have wrong path type', (done) => {
        node.discoverReq().fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if no shepherd', (done) => {
        node.shepherd = null
        node.discoverReq('x').fail((err) => {
          debug(err)
          done()
        })
        node.shepherd = fakeShp
      })

      it('should return error if no so', (done) => {
        node.so = null
        node.discoverReq('x').fail((err) => {
          debug(err)
          done()
        })
        node.so = myso
      })
    })

    describe('#.writeAttrsReq(path, attrs, callback)', () => {
      it('should return error if input arguments have wrong path type', (done) => {
        node.writeAttrsReq(3, 'data').fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if no shepherd', (done) => {
        node.shepherd = null
        node.writeAttrsReq('x', {}).fail((err) => {
          debug(err)
          done()
        })
        node.shepherd = fakeShp
      })

      it('should return error if no so', (done) => {
        node.so = null
        node.writeAttrsReq('x', {}).fail((err) => {
          debug(err)
          done()
        })
        node.so = myso
      })

      it('should return error if bad object data', (done) => {
        node.writeAttrsReq('/x', 'data').fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if bad instance data', (done) => {
        node.writeAttrsReq('/x/2', 'data').fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if bad resource data', (done) => {
        node.writeAttrsReq('/x/2/3', 'data').fail((err) => {
          debug(err)
          done()
        })
      })
    })

    describe('#.executeReq(path, callback)', () => {
      it('should return error if input arguments have wrong path type', (done) => {
        node.executeReq().fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if no shepherd', (done) => {
        node.shepherd = null
        node.executeReq('x').fail((err) => {
          debug(err)
          done()
        })
        node.shepherd = fakeShp
      })

      it('should return error if no so', (done) => {
        node.so = null
        node.executeReq('x').fail((err) => {
          debug(err)
          done()
        })
        node.so = myso
      })
    })

    describe('#.observeReq(path, callback)', () => {
      it('should return error if input arguments have wrong path type', (done) => {
        node.observeReq().fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if no shepherd', (done) => {
        node.shepherd = null
        node.observeReq('x').fail((err) => {
          debug(err)
          done()
        })
        node.shepherd = fakeShp
      })

      it('should return error if no so', (done) => {
        node.so = null
        node.observeReq('x').fail((err) => {
          debug(err)
          done()
        })
        node.so = myso
      })
    })

    describe('#.replaceObjectInstance(oid, iid, data, callback)', () => {
      it('should return error if no shepherd', (done) => {
        node.shepherd = null
        node.replaceObjectInstance('x', 1, {}).fail((err) => {
          debug(err)
          done()
        })
        node.shepherd = fakeShp
      })

      it('should return error if no so', (done) => {
        node.shepherd = fakeShp
        node.so = null
        node.replaceObjectInstance('x', 1, {}).fail((err) => {
          debug(err)
          done()
        })
        node.so = myso
      })

      it('should return error if bad oid', (done) => {
        node.shepherd = fakeShp
        node.replaceObjectInstance([], 1, {}).fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if bad iid', (done) => {
        node.shepherd = fakeShp
        node.replaceObjectInstance(1, {}, {}).fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if bad data', (done) => {
        node.shepherd = fakeShp
        node.replaceObjectInstance(1, {}, 'xx').fail((err) => {
          debug(err)
          done()
        })
      })
    })

    describe('#.updateObjectInstance(oid, iid, data, callback)', () => {
      it('should return error if no shepherd', (done) => {
        node.shepherd = null
        node.updateObjectInstance('x', 1, {}).fail((err) => {
          debug(err)
          done()
        })
        node.shepherd = fakeShp
      })

      it('should return error if no so', (done) => {
        node.so = null
        node.updateObjectInstance('x', 1, {}).fail((err) => {
          debug(err)
          done()
        })
        node.so = myso
      })

      it('should return error if bad oid', (done) => {
        node.updateObjectInstance([], 1, {}).fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if bad iid', (done) => {
        node.updateObjectInstance(1, {}, {}).fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if bad data', (done) => {
        node.updateObjectInstance(1, 2, 'xx').fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if bad data', (done) => {
        node.updateObjectInstance('y', 2, 'xx').fail((err) => {
          debug(err)
          done()
        })
      })
    })

    describe('#.updateResource(oid, iid, rid, data, callback)', () => {
      it('should return error if no shepherd', (done) => {
        node.shepherd = null
        node.updateResource('x', 1, 1, {}).fail((err) => {
          debug(err)
          done()
        })
        node.shepherd = fakeShp
      })

      it('should return error if no so', (done) => {
        node.so = null
        node.updateResource('x', 1, 1, 'ddd').fail((err) => {
          debug(err)
          done()
        })
        node.so = myso
      })

      it('should return error if bad oid', (done) => {
        node.updateResource([], 1, 1, 'xxx').fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if bad iid', (done) => {
        node.updateResource(1, {}, 1, 'xxxx').fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if bad rid', (done) => {
        node.updateResource(1, 1, {}, 'xxxx').fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if bad data', (done) => {
        node.updateResource(1, 2, 3).fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if no oid', (done) => {
        node.updateResource(1, 0, 'z11', 'xxxx').fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if no iid', (done) => {
        node.updateResource('z', 2, 'z11', 'xxxx').fail((err) => {
          debug(err)
          done()
        })
      })

      it('should return error if no rid', (done) => {
        node.updateResource('z', 1, 'z14', 'xxxx').fail((err) => {
          debug(err)
          done()
        })
      })
    })

    describe('#.updateAttrs(attrs, callback)', () => {
      it('should return error if no shepherd', (done) => {
        node.shepherd = null
        node.updateAttrs({}).fail((err) => {
          debug(err)
          done()
        })
        node.shepherd = fakeShp
      })

      it('should return error if no so', (done) => {
        node.so = null
        node.updateAttrs({}).fail((err) => {
          debug(err)
          done()
        })
        node.so = myso
      })

      it('should return error if bad attrs', (done) => {
        node.updateAttrs('dd').fail((err) => {
          debug(err)
          done()
        })
      })
    })
  })

  describe('mqtt-node -> Functional Check', () => {
    const nodex = new MqttNode(fakeShp, cId, devAttrs)
    nodex.so = myso

    describe('#.bind smart object', () => {
      it('should has correct node and so', () => {
        assert.strictEqual(nodex.so, myso)
      })
    })

    describe('#.getRootObject(oid)', () => {
      it('should pass equality test', () => {
        assert.strictEqual(nodex.so.acquire(100), undefined)
        assert.deepStrictEqual(nodex.so.dumpSync('z'), {
          0: { z11: 'hello', z12: 'world' },
          1: { z11: 'hello', z12: 'world' }
        })
      })
    })

    describe('#.getIObject(oid, iid)', () => {
      it('should pass equality test', () => {
        assert.strictEqual(nodex.so.acquire(100, 3), undefined)
        assert.strictEqual(nodex.so.acquire('y', 7), undefined)
        assert.deepStrictEqual(nodex.so.dumpSync('z', 1), { z11: 'hello', z12: 'world' })
        assert.deepStrictEqual(nodex.so.dumpSync('z', '1'), { z11: 'hello', z12: 'world' })
        assert.deepStrictEqual(nodex.so.dumpSync('x', '0'), { x1: 1, x2: 2 })
        assert.deepStrictEqual(nodex.so.dumpSync('x', 0), { x1: 1, x2: 2 })
      })
    })

    describe('#.getResource(oid, iid, rid)', () => {
      it('should pass equality test', () => {
        assert.strictEqual(nodex.so.acquire('y', 3, 'xq'), undefined)
        assert.strictEqual(nodex.so.acquire('y', 2, 'y31'), undefined)
        assert.strictEqual(nodex.so.acquire('xx', 3, 'y31'), undefined)
        assert.strictEqual(nodex.so.acquire('y', 7, 'y31'), undefined)

        assert.strictEqual(nodex.so.acquire('x', 0, 'x1'), 1)
        assert.strictEqual(nodex.so.acquire('x', 0, 'x2'), 2)
        assert.strictEqual(nodex.so.acquire('x', 1, 'y1'), 3)
        assert.strictEqual(nodex.so.acquire('x', 1, 'y2'), 4)

        assert.strictEqual(nodex.so.acquire('y', 3, 'y31'), 'hi')
        assert.strictEqual(nodex.so.acquire('y', 3, 'y31'), 'hi')

        assert.strictEqual(nodex.so.acquire('z', 0, 'z11'), 'hello')
        assert.strictEqual(nodex.so.acquire('z', 0, 'z12'), 'world')
        assert.strictEqual(nodex.so.acquire('z', 1, 'z11'), 'hello')
        assert.strictEqual(nodex.so.acquire('z', 1, 'z12'), 'world')
      })
    })

    describe('#.enableLifeChecker()', () => {
      it('should pass equality test', () => {
        assert.strictEqual(nodex.lifeChecker, null)
        assert.strictEqual(nodex.enableLifeChecker(), nodex)
        assert.notStrictEqual(nodex.lifeChecker, null)
        assert.notStrictEqual(nodex.lifeChecker, undefined)
      })
    })

    describe('#.disableLifeChecker()', () => {
      it('should pass equality test', () => {
        assert.notStrictEqual(nodex.lifeChecker, null)
        assert.strictEqual(nodex.disableLifeChecker(), nodex)
        assert.strictEqual(nodex.lifeChecker, null)
      })
    })

    describe('#.dump()', () => {
      it('should pass equality test', () => {
        const dumped = {
          clientId: cId,
          lifetime: devAttrs.lifetime,
          ip: devAttrs.ip,
          mac: devAttrs.mac,
          joinTime: nodex.joinTime,
          version: devAttrs.version,
          objList: {},
          so: {
            x: smObj1.x,
            y: smObj2.y,
            z: smObj2.z
          }
        }
        assert.deepStrictEqual(nodex.dump(), dumped)
      })
    })

    describe('#.dbSave()', () => {
      it('should pass data store test', (done) => {
        const dumped = {
          clientId: cId,
          lifetime: devAttrs.lifetime,
          ip: devAttrs.ip,
          mac: devAttrs.mac,
          joinTime: nodex.joinTime,
          version: devAttrs.version,
          objList: {},
          so: {
            x: smObj1.x,
            y: smObj2.y,
            z: smObj2.z
          }
        }
        nodex.dbSave().done((data) => {
          delete data._id
          if (_.isEqual(data, dumped)) done()
        }, (err) => {
          debug(err)
        })
      })
    })

    describe('#.dbRead()', () => {
      it('should pass data read test', (done) => {
        const dumped = {
          clientId: cId,
          lifetime: devAttrs.lifetime,
          ip: devAttrs.ip,
          mac: devAttrs.mac,
          joinTime: nodex.joinTime,
          version: devAttrs.version,
          objList: {},
          so: {
            x: smObj1.x,
            y: smObj2.y,
            z: smObj2.z
          }
        }
        nodex.dbRead().done((data) => {
          if (_.isEqual(data, dumped)) done()
        }, (err) => {
          debug(err)
        })
      })
    })

    describe('#.dbRemove()', () => {
      it('should pass data remove test', (done) => {
        nodex.dbRemove().done((clientId) => {
          if (clientId === 'Im-client-node') done()
        }, (err) => {
          debug(err)
        })
      })

      it('should pass data remove test - nothing to remove', (done) => {
        nodex.dbRemove().done((clientId) => {
          if (clientId === 'Im-client-node') done()
        }, (err) => {
          debug(err)
        })
      })
    })

    describe('#.restore()', () => {
      it('should pass data restore test', (done) => {
        nodex.dbSave().done((data) => {
          const nodeCloned = new MqttNode(fakeShp, cId)
          nodeCloned.restore().done((node) => {
            if (_.isEqual(nodeCloned.dump(), nodex.dump())) done()
          }, (err) => {
            debug(err)
          })
        }, (err) => {
          debug(err)
        })
      })
    })

    describe('#.replaceObjectInstance(oid, iid, data)', () => {
      it('should pass equality test after replaced', (done) => {
        nodex._registered = true
        const newInst = { newY1: 100, newY2: 'hihi' }
        // let inst
        nodex.replaceObjectInstance('y', 3, newInst).then((ninst) => {
          // inst = ninst
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.dumpSync('y', 3), newInst) && _.isEqual(nodex.so.dumpSync('y', 3), ndata.so.y[3])) done()
        }, (err) => {
          debug(err)
        })
      })
    })

    describe('#.updateObjectInstance(oid, iid, data)', () => {
      it('should pass equality test after partial update', (done) => {
        const newInst = { y1: 'hello', y2: 4 }
        let diff
        nodex._registered = true
        nodex.updateObjectInstance('x', 1, newInst).then((idiff) => {
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          if (_.isEqual(nodex.so.dumpSync('x', 1), newInst) && _.isEqual(nodex.so.dumpSync('x', 1), ndata.so.x[1])) if (_.isEqual(diff, { y1: 'hello' })) done()
        }, (err) => {
          debug(err)
        })
      })

      it('should pass equality test after full update', (done) => {
        const newInst = { y1: 'world', y2: 1200 }
        let diff
        nodex._registered = true
        nodex.updateObjectInstance('x', 1, newInst).then((idiff) => {
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.dumpSync('x', 1), newInst) && _.isEqual(nodex.so.dumpSync('x', 1), ndata.so.x[1])) if (_.isEqual(diff, { y1: 'world', y2: 1200 })) done()
        }, (err) => {
          debug(err)
        })
      })
    })

    describe('#.updateResource(oid, iid, rid, data, callback)', () => {
      it('should pass equality test after value/value update', (done) => {
        const newVal = 'new value'
        let diff
        nodex._registered = true
        nodex.updateResource('z', 0, 'z12', newVal).then((idiff) => {
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.dumpSync('z', 0).z12, newVal) && _.isEqual(nodex.so.dumpSync('z', 0).z12, ndata.so.z[0].z12)) if (_.isEqual(diff, newVal)) done()
        }, (err) => {
          debug(err)
        })
      })

      it('should pass equality test after value/object update', (done) => {
        const newVal = { n1: 100, n2: 30 }
        let diff
        nodex._registered = true
        nodex.updateResource('z', 0, 'z12', newVal).then((idiff) => {
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12)) if (_.isEqual(diff, newVal)) done()
        }, (err) => {
          debug(err)
        })
      })

      it('should pass equality test after object/object update', (done) => {
        const newVal = { n1: 300, n2: 30 }
        let diff
        nodex._registered = true
        nodex.updateResource('z', 0, 'z12', newVal).then((idiff) => {
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12)) if (_.isEqual(diff, { n1: 300 })) done()
        }, (err) => {
          debug(err)
        })
      })

      it('should pass equality test after object/value update', (done) => {
        const newVal = 'I am new value'
        let diff
        nodex._registered = true
        nodex.updateResource('z', 0, 'z12', newVal).then((idiff) => {
          // console.log(idiff);
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12)) if (_.isEqual(diff, newVal)) done()
        }, (err) => {
          debug(err)
        })
      })

      it('should pass equality test after value/object update', (done) => {
        const newVal = { n1: 1, n2: 2, n3: { n31: 'hi', n32: 3 } }
        let diff
        nodex._registered = true
        nodex.updateResource('z', 0, 'z12', newVal).then((idiff) => {
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12)) if (_.isEqual(diff, newVal)) done()
        }, (err) => {
          debug(err)
        })
      })

      it('should pass equality test after object/object update', (done) => {
        const newVal = { n3: { n31: 'hello' } }
        let diff
        nodex._registered = true
        nodex.updateResource('z', 0, 'z12', newVal).then((idiff) => {
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.z[0].z12, { n1: 1, n2: 2, n3: { n31: 'hello', n32: 3 } }) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12)) if (_.isEqual(diff, { n3: { n31: 'hello' } })) done()
        }, (err) => {
          debug(err)
        })
      })

      it('should pass equality test after object/object update', (done) => {
        const newVal = { n1: 1024, n3: { n31: 'world' } }
        let diff
        nodex._registered = true
        nodex.updateResource('z', 0, 'z12', newVal).then((idiff) => {
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.z[0].z12, { n1: 1024, n2: 2, n3: { n31: 'world', n32: 3 } }) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12)) if (_.isEqual(diff, { n1: 1024, n3: { n31: 'world' } })) done()
        }, (err) => {
          console.log(err)
        })
      })
    })

    describe('#.updateAttrs(attrs, callback)', () => {
      // { lifetime, ip, mac, version }
      it('should pass equality test after lifetime and ip update', (done) => {
        const newAttrs = { lifetime: 1000, ip: '111.111.222.222' }
        // let diff
        nodex._registered = true
        nodex.updateAttrs(newAttrs).then((idiff) => {
          // diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.lifetime, newAttrs.lifetime) && _.isEqual(nodex.ip, newAttrs.ip)) done()
        }, (err) => {
          console.log(err)
        })
      })

      it('should pass equality test after ip update', (done) => {
        const newAttrs = { ip: '111.111.222.221' }
        // let diff
        nodex._registered = true
        nodex.updateAttrs(newAttrs).then((idiff) => {
          // diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.ip, newAttrs.ip)) done()
        }, (err) => {
          console.log(err)
        })
      })
    })

    describe('#._checkAndUpdate(attrs, callback)', () => {
      it('should ignore if no such property to update', (done) => {
        // let diff
        nodex._registered = true
        nodex._checkAndUpdate('/y', { 3: { newY8: 999 } }).then((idiff) => {
          // diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.dumpSync('y', 3), { newY1: 100, newY2: 'hihi' })) done()
        }, (err) => {
          console.log(err)
        })
      })

      it('should pass equality test after instance update 1', (done) => {
        let diff
        nodex._registered = true
        nodex._checkAndUpdate('/x/0', { x1: 1111 }).then((idiff) => {
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.dumpSync('x', 0), { x1: 1111, x2: 2 }) && _.isEqual(nodex.so.dumpSync('x', 0), ndata.so.x[0])) if (_.isEqual(diff, { x1: 1111 })) done()
        }, (err) => {
          console.log(err)
        })
      })

      it('should pass equality test after instance update 2', (done) => {
        let diff
        nodex._registered = true
        nodex._checkAndUpdate('/x/0', { x1: 'hi', x2: 'friend' }).then((idiff) => {
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.dumpSync('x', 0), { x1: 'hi', x2: 'friend' }) && _.isEqual(nodex.so.dumpSync('x', 0), ndata.so.x[0])) if (_.isEqual(diff, { x1: 'hi', x2: 'friend' })) done()
        }, (err) => {
          console.log(err)
        })
      })

      it('should pass equality test after resource update 1', (done) => {
        let diff
        nodex._registered = true
        nodex._checkAndUpdate('/z/1/z11', 'awesome').then((idiff) => {
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false
          if (_.isEqual(nodex.so.z[1].z11, 'awesome') && _.isEqual(nodex.so.dumpSync('z', 1), ndata.so.z[1])) if (_.isEqual(diff, 'awesome')) done()
        }, (err) => {
          console.log(err)
        })
      })

      it('should pass equality test after resource update 2', (done) => {
        let diff
        nodex._registered = true
        nodex._checkAndUpdate('/z/1/z11', { a: 'amazing' }).then((idiff) => {
          diff = idiff
          return nodex.dbRead()
        }).done((ndata) => {
          nodex._registered = false

          if (_.isEqual(nodex.so.z[1].z11, { a: 'amazing' }) && _.isEqual(nodex.so.dumpSync('z', 1), ndata.so.z[1])) if (_.isEqual(diff, { a: 'amazing' })) done()
        }, (err) => {
          console.log(err)
        })
      })
    })
  })
})
