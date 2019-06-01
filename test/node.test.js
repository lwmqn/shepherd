/* eslint-env mocha */
const _ = require('busyman')
const chai = require('chai')
const debug = require('debug')

const { expect } = chai

const fs = require('fs')
const path = require('path')

const MqttNode = require('../lib/components/mqtt-node')
const Mqdb = require('../lib/components/mqdb')

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

describe('mqtt-node verify', () => {
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

  describe('Constructor Check', () => {
    it('should has all correct members after new', () => {
      const node = new MqttNode(fakeShp, cId, devAttrs)
      expect(node.shepherd).be.deep.equal(fakeShp)
      expect(node.clientId).be.equal(cId)
      expect(node.ip).be.equal('140.117.11.1')
      expect(node.mac).be.equal('11:22:AA:BB:CC:DD')
      expect(node.version).be.equal('v0.0.1')
      expect(node.lifetime).be.equal(60000)
      expect(node.objList).be.deep.equal({})
      expect(node.so).not.to.be.equal(null)
      expect(node._registered).to.be.equal(false)
      expect(node.status).be.equal('offline')
      expect(node.lifeChecker).to.be.equal(null)
    })
  })

  describe('Signature Check', () => {
    describe('#.MqttNode(shepherd, clientId, devAttrs)', () => {
      it('should throw if input arguments have wrong type', () => {
        expect(() => new MqttNode({}, 'xxx')).not.to.throw(Error)
        expect(() => new MqttNode({}, 'xxx', {})).not.to.throw(Error)

        expect(() => new MqttNode({}, 'xxx', [])).to.throw(TypeError)
        expect(() => new MqttNode({}, 'xxx', 1)).to.throw(TypeError)
        expect(() => new MqttNode({}, 'xxx', 'ttt')).to.throw(TypeError)

        expect(() => new MqttNode({}, [], {})).to.throw(TypeError)
        expect(() => new MqttNode({}, {}, {})).to.throw(TypeError)
        expect(() => new MqttNode({}, false, {})).to.throw(TypeError)
        expect(() => new MqttNode({}, undefined, {})).to.throw(TypeError)
        expect(() => new MqttNode({}, null, {})).to.throw(TypeError)

        expect(() => new MqttNode({})).to.throw()

        expect(() => new MqttNode([], 'xxx', {})).to.throw(TypeError)
        expect(() => new MqttNode(1, 'xxx', {})).to.throw(TypeError)
        expect(() => new MqttNode(false, 'xxx', {})).to.throw(TypeError)
        expect(() => new MqttNode(undefined, 'xxx', {})).to.throw(TypeError)
        expect(() => new MqttNode(null, 'xxx', {})).to.throw(TypeError)
        expect(() => new MqttNode('fff', 'xxx', {})).to.throw(TypeError)
      })
    })

    describe('#.acquire(oid)', () => {
      it('should throw if input arguments have wrong type', () => {
        expect(() => { node.so.acquire({}) }).to.throw(TypeError)
        expect(() => { node.so.acquire([]) }).to.throw(TypeError)
        expect(() => { node.so.acquire(true) }).to.throw(TypeError)
        expect(() => { node.so.acquire(null) }).to.throw(TypeError)
        expect(() => { node.so.acquire(1) }).not.to.throw(TypeError)

        expect(node.so.acquire()).to.be.equal(undefined)
      })

      it('should throw if so not bound', () => {
        const sotmp = node.so
        node.so = null
        expect(() => { node.so.acquire('x') }).to.throw(Error)
        node.so = sotmp
      })
    })

    describe('#.geIObject(oid, iid)', () => {
      it('should throw if input arguments have wrong type', () => {
        node.so = myso
        expect(node.so.acquire()).to.be.equal(undefined)

        expect(() => { node.so.acquire({}, 1) }).to.throw(TypeError)
        expect(() => { node.so.acquire([], 1) }).to.throw(TypeError)
        expect(() => { node.so.acquire(true, 1) }).to.throw(TypeError)
        expect(() => { node.so.acquire(null, 1) }).to.throw(TypeError)

        expect(() => { node.so.acquire(1, {}) }).to.throw(TypeError)
        expect(() => { node.so.acquire(1, []) }).to.throw(TypeError)
        expect(() => { node.so.acquire(1, true) }).to.throw(TypeError)
        expect(() => { node.so.acquire(1, null) }).to.throw(TypeError)
        expect(() => { node.so.acquire(1, 2) }).not.to.throw(TypeError)
      })

      it('should throw if so not bound', () => {
        const sotmp = node.so
        node.so = null
        expect(() => { node.so.acquire('x', 2) }).to.throw(Error)
        node.so = sotmp
      })
    })

    describe('#.getResource(oid, iid, rid)', () => {
      it('should throw if input arguments have wrong type', () => {
        node.so = myso
        expect(node.so.acquire()).to.be.equal(undefined)

        expect(() => { node.so.acquire({}, 1, 2) }).to.throw(TypeError)
        expect(() => { node.so.acquire([], 1, 2) }).to.throw(TypeError)
        expect(() => { node.so.acquire(true, 1, 2) }).to.throw(TypeError)
        expect(() => { node.so.acquire(null, 1, 2) }).to.throw(TypeError)

        expect(() => { node.so.acquire('x', {}, 1) }).to.throw(TypeError)
        expect(() => { node.so.acquire('x', [], 1) }).to.throw(TypeError)
        expect(() => { node.so.acquire('x', true, 1) }).to.throw(TypeError)
        expect(() => { node.so.acquire('x', null, 1) }).to.throw(TypeError)

        expect(() => { node.so.acquire('x', 0, {}) }).to.throw(TypeError)
        expect(() => { node.so.acquire('x', 0, []) }).to.throw(TypeError)
        expect(() => { node.so.acquire('x', 0, true) }).to.throw(TypeError)
        expect(() => { node.so.acquire('x', 0, null) }).to.throw(TypeError)

        expect(() => { node.so.acquire('x', 2, 3) }).not.to.throw(Error)
        expect(() => { node.so.acquire('f', 2, 'c') }).not.to.throw(Error)
      })

      it('should throw if so not bound - no acquire method', () => {
        node.so = null
        expect(() => { node.so.acquire('x', 2, 0) }).to.throw(Error)
        node.so = myso
      })
    })

    describe('#.maintain', () => {
      it('should throw if cIds is not a string or not an array of strings', () => {
        expect(() => { node.maintain({}) }).to.throw(TypeError)
        expect(() => { node.maintain(true) }).to.throw(TypeError)
        expect(() => { node.maintain(['ceed', {}]) }).to.throw(TypeError)

        expect(() => { node.maintain('ceed') }).to.throw(TypeError)
        expect(() => { node.maintain(['ceed', 'xxx']) }).to.throw(TypeError)
        expect(() => { node.maintain(() => {}) }).not.to.throw(Error)
      })
    })

    describe('#.dump()', () => {
      it('should should empty object if no so bound', () => {
        node.so = null
        expect(node.dump().so).to.be.deep.equal({})
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

  describe('Functional Check', () => {
    const nodex = new MqttNode(fakeShp, cId, devAttrs)
    nodex.so = myso

    describe('#.bind smart object', () => {
      it('should has correct node and so', () => {
        expect(nodex.so).to.be.equal(myso)
      })
    })

    describe('#.getRootObject(oid)', () => {
      it('should pass equality test', () => {
        expect(nodex.so.acquire(100)).to.be.equal(undefined)
        expect(nodex.so.dumpSync('z')).to.deep.equal({
          0: { z11: 'hello', z12: 'world' },
          1: { z11: 'hello', z12: 'world' }
        })
      })
    })

    describe('#.getIObject(oid, iid)', () => {
      it('should pass equality test', () => {
        expect(nodex.so.acquire(100, 3)).to.be.equal(undefined)
        expect(nodex.so.acquire('y', 7)).to.be.equal(undefined)
        expect(nodex.so.dumpSync('z', 1)).be.deep.equal({ z11: 'hello', z12: 'world' })
        expect(nodex.so.dumpSync('z', '1')).be.deep.equal({ z11: 'hello', z12: 'world' })
        expect(nodex.so.dumpSync('x', '0')).be.deep.equal({ x1: 1, x2: 2 })
        expect(nodex.so.dumpSync('x', 0)).be.deep.equal({ x1: 1, x2: 2 })
      })
    })

    describe('#.getResource(oid, iid, rid)', () => {
      it('should pass equality test', () => {
        expect(nodex.so.acquire('y', 3, 'xq')).to.be.equal(undefined)
        expect(nodex.so.acquire('y', 2, 'y31')).to.be.equal(undefined)
        expect(nodex.so.acquire('xx', 3, 'y31')).to.be.equal(undefined)
        expect(nodex.so.acquire('y', 7, 'y31')).to.be.equal(undefined)

        expect(nodex.so.acquire('x', 0, 'x1')).to.be.eql(1)
        expect(nodex.so.acquire('x', 0, 'x2')).to.be.eql(2)
        expect(nodex.so.acquire('x', 1, 'y1')).to.be.eql(3)
        expect(nodex.so.acquire('x', 1, 'y2')).to.be.eql(4)

        expect(nodex.so.acquire('y', 3, 'y31')).to.be.eql('hi')
        expect(nodex.so.acquire('y', 3, 'y31')).to.be.eql('hi')

        expect(nodex.so.acquire('z', 0, 'z11')).to.be.eql('hello')
        expect(nodex.so.acquire('z', 0, 'z12')).to.be.eql('world')
        expect(nodex.so.acquire('z', 1, 'z11')).to.be.eql('hello')
        expect(nodex.so.acquire('z', 1, 'z12')).to.be.eql('world')
      })
    })

    describe('#.enableLifeChecker()', () => {
      it('should pass equality test', () => {
        expect(nodex.lifeChecker).to.be.equal(null)
        expect(nodex.enableLifeChecker()).to.be.equal(nodex)
        expect(nodex.lifeChecker).not.to.be.equal(null)
        expect(nodex.lifeChecker).not.to.be.equal(undefined)
      })
    })

    describe('#.disableLifeChecker()', () => {
      it('should pass equality test', () => {
        expect(nodex.lifeChecker).not.to.be.equal(null)
        expect(nodex.disableLifeChecker()).to.be.equal(nodex)
        expect(nodex.lifeChecker).to.be.equal(null)
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
        expect(nodex.dump()).to.be.deep.equal(dumped)
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
