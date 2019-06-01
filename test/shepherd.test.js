/* eslint-env mocha */
const fs = require('fs')
const path = require('path')
const _ = require('busyman')
const Q = require('q')
const debug = require('debug')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')

const { expect } = chai

chai.use(sinonChai)

const Shepherd = require('../index.js')
const config = require('../lib/config.js')
const msgHdlr = require('../lib/components/msghandler.js')

/** ************************************************ */
/** * Prepare Shepherd Settings                   ** */
/** ************************************************ */
const shpClientId = 'shp_test'
// try {
//     fs.unlinkSync(path.resolve('./lib/database/mqtt.db'));
//     fs.unlinkSync(path.resolve('./test/database/mqtt1.db'));
// } catch (e) {
//     console.log(e);
// }

after((done) => {
  fs.unlink(path.resolve('./lib/database/mqtt.db'), () => {
    setTimeout(() => {
      done()
    }, 200)
  })
})

describe('Top Level of Tests', () => {
  before((done) => {
    let unlink1 = false
    let unlink2 = false

    fs.stat('./lib/database/mqtt.db', (err, stats) => {
      if (err) {
        unlink1 = true
        return
      }
      if (stats.isFile()) {
        fs.unlink(path.resolve('./lib/database/mqtt.db'), () => {
          unlink1 = true
          if (unlink1 && unlink2) done()
        })
      }
    })

    fs.stat('./test/database/mqtt1.db', (err, stats) => {
      if (err) {
        fs.stat('./test/database', (err, stats) => {
          unlink2 = true

          if (err) {
            fs.mkdir('./test/database', () => {
              if (unlink1 && unlink2) done()
            })
          } else if (unlink1 && unlink2) done()
        })
      } else if (stats.isFile()) {
        fs.unlink(path.resolve('./test/database/mqtt1.db'), () => {
          unlink2 = true
          if (unlink1 && unlink2) done()
        })
      }
    })
  })

  describe('Constructor Check', () => {
    let shepherd
    before(() => {
      shepherd = new Shepherd('test1', { dbPath: `${__dirname}/database/mqtt1.db` })
    })

    it('should has all correct members after new', () => {
      expect(shepherd.clientId).to.be.equal('test1')
      expect(shepherd.brokerSettings).to.be.equal(config.brokerSettings)
      expect(shepherd.defaultAccount).to.be.equal(null)
      expect(shepherd.clientConnOptions).to.be.equal(config.clientConnOptions)
      expect(shepherd.reqTimeout).to.be.equal(config.reqTimeout)
      expect(shepherd._dbPath).to.be.equal(`${__dirname}/database/mqtt1.db`)
      expect(shepherd._mqdb).to.be.an('object')
      expect(shepherd._nodebox).to.be.an('object')
      expect(shepherd._joinable).to.be.equal(false)
      expect(shepherd._enabled).to.be.equal(false)
      expect(shepherd._permitJoinTime).to.be.equal(0)
      expect(shepherd._startTime).to.be.equal(0)
      expect(shepherd._net).to.be.deep.equal({
        intf: '', ip: '', mac: '', routerIp: ''
      })
      expect(shepherd._channels).to.be.deep.equal({
        'register/#': 0,
        'deregister/#': 0,
        'notify/#': 1,
        'update/#': 1,
        'response/#': 1,
        'ping/#': 0,
        'schedule/#': 0,
        'lwt/#': 0,
        'request/#': 0,
        'announce/#': 0
      })
      expect(shepherd._areq).to.be.an('object')

      expect(shepherd.mBroker).to.be.equal(null)
      expect(shepherd.mClient).to.be.equal(null)

      expect(shepherd.authPolicy).to.be.an('object')
      expect(shepherd.authPolicy.authenticate).to.be.equal(null)
      expect(shepherd.authPolicy.authorizePublish).to.be.a('function')
      expect(shepherd.authPolicy.authorizeSubscribe).to.be.a('function')
      expect(shepherd.authPolicy.authorizeForward).to.be.a('function')

      expect(shepherd.encrypt).to.be.a('function')
      expect(shepherd.decrypt).to.be.a('function')
      expect(shepherd.nextTransId).to.be.a('function')
      expect(shepherd.permitJoin).to.be.a('function')
    })

    it('should throw if name is given but not a string', () => {
      expect(() => new Shepherd({}, {})).to.throw(TypeError)
      expect(() => new Shepherd([], {})).to.throw(TypeError)
      expect(() => new Shepherd(1, {})).to.throw(TypeError)
      expect(() => new Shepherd(true, {})).to.throw(TypeError)
      expect(() => new Shepherd(NaN, {})).to.throw(TypeError)

      expect(() => new Shepherd()).not.to.throw(Error)
      expect(() => new Shepherd('xxx')).not.to.throw(Error)
      expect(() => new Shepherd({})).not.to.throw(Error)
    })

    it('should throw if setting is given but not an object', () => {
      expect(() => new Shepherd([])).to.throw(TypeError)

      expect(() => new Shepherd('xxx', [])).to.throw(TypeError)
      expect(() => new Shepherd('xxx', 1)).to.throw(TypeError)
      expect(() => new Shepherd('xxx', true)).to.throw(TypeError)
    })
  })

  describe('Signature Check', () => {
    // var shepherd = new Shepherd('test2', { dbPath:  __dirname + '/database/mqtt1.db' });

    let shepherd
    before(() => {
      shepherd = new Shepherd('test1', { dbPath: `${__dirname}/database/mqtt1.db` })
    })

    describe('#.permitJoin', () => {
      it('should throw if time is given but not a number', () => {
        expect(() => { shepherd.permitJoin({}) }).to.throw(TypeError)
        expect(() => { shepherd.permitJoin(true) }).to.throw(TypeError)
      })
    })

    describe('#.find', () => {
      it('should throw if clientId is not a string', () => {
        expect(() => { shepherd.find({}) }).to.throw(TypeError)
        expect(() => { shepherd.find(true) }).to.throw(TypeError)
        expect(() => { shepherd.find('ceed') }).not.to.throw(TypeError)
      })
    })

    describe('#.findByMac', () => {
      it('should throw if macAddr is not a string', () => {
        expect(() => { shepherd.findByMac({}) }).to.throw(TypeError)
        expect(() => { shepherd.findByMac(true) }).to.throw(TypeError)
        expect(() => { shepherd.findByMac('ceed') }).not.to.throw(TypeError)
      })
    })

    describe('#.remove', () => {
      it('should throw if clientId is not a string', () => {
        expect(() => { shepherd.remove({}) }).to.throw(TypeError)
        expect(() => { shepherd.remove(true) }).to.throw(TypeError)
        expect(() => { shepherd.remove('ceed') }).not.to.throw(TypeError)
      })
    })

    describe('#._responseSender', () => {
      it('should throw if clientId is not a string', () => {
        expect(() => { shepherd._responseSender('register', {}, {}) }).to.throw(TypeError)
        expect(() => { shepherd._responseSender('register', true, {}) }).to.throw(TypeError)
        expect(() => { shepherd._responseSender('register', 'ceed', {}) }).not.to.throw(TypeError)
      })
    })

    describe('#._requestSender', () => {
      it('should throw if clientId is not a string', () => {
        expect(() => { shepherd._requestSender('register', {}, {}) }).to.throw(TypeError)
        expect(() => { shepherd._requestSender('register', true, {}) }).to.throw(TypeError)
        expect(() => { shepherd._requestSender('register', 'ceed', {}) }).not.to.throw(TypeError)
      })
    })

    describe('#.readReq', () => {
      it('should throw if clientId is not a string', () => {
        expect(() => { shepherd.readReq({}, {}) }).to.throw(TypeError)
        expect(() => { shepherd.readReq(true, {}) }).to.throw(TypeError)
        expect(() => { shepherd.readReq('ceed', {}) }).not.to.throw(TypeError)
      })
    })

    describe('#.writeReq', () => {
      it('should throw if clientId is not a string', () => {
        expect(() => { shepherd.writeReq({}, {}) }).to.throw(TypeError)
        expect(() => { shepherd.writeReq(true, {}) }).to.throw(TypeError)
        expect(() => { shepherd.writeReq('ceed', {}) }).not.to.throw(TypeError)
      })
    })

    describe('#.writeAttrsReq', () => {
      it('should throw if clientId is not a string', () => {
        expect(() => { shepherd.writeAttrsReq({}, {}) }).to.throw(TypeError)
        expect(() => { shepherd.writeAttrsReq(true, {}) }).to.throw(TypeError)
        expect(() => { shepherd.writeAttrsReq('ceed', {}) }).not.to.throw(TypeError)
      })
    })

    describe('#.discoverReq', () => {
      it('should throw if clientId is not a string', () => {
        expect(() => { shepherd.discoverReq({}, {}) }).to.throw(TypeError)
        expect(() => { shepherd.discoverReq(true, {}) }).to.throw(TypeError)
        expect(() => { shepherd.discoverReq('ceed', {}) }).not.to.throw(TypeError)
      })
    })

    describe('#.executeReq', () => {
      it('should throw if clientId is not a string', () => {
        expect(() => { shepherd.executeReq({}, {}) }).to.throw(TypeError)
        expect(() => { shepherd.executeReq(true, {}) }).to.throw(TypeError)
        expect(() => { shepherd.executeReq('ceed', {}) }).not.to.throw(TypeError)
      })
    })

    describe('#.observeReq', () => {
      it('should throw if clientId is not a string', () => {
        expect(() => { shepherd.observeReq({}, {}) }).to.throw(TypeError)
        expect(() => { shepherd.observeReq(true, {}) }).to.throw(TypeError)
        expect(() => { shepherd.observeReq('ceed', {}) }).not.to.throw(TypeError)
      })
    })

    describe('#.pingReq', () => {
      it('should throw if clientId is not a string', () => {
        expect(() => { shepherd.pingReq({}) }).to.throw(TypeError)
        expect(() => { shepherd.pingReq(true) }).to.throw(TypeError)
        expect(() => { shepherd.pingReq('ceed') }).not.to.throw(TypeError)
      })
    })

    describe('#.list', () => {
      it('should throw if cIds is not an array of strings', () => {
        expect(() => { shepherd.list({}) }).to.throw(TypeError)
        expect(() => { shepherd.list(true) }).to.throw(TypeError)
        expect(() => { shepherd.list(['ceed', {}]) }).to.throw(TypeError)

        expect(() => { shepherd.list('ceed') }).not.to.throw(Error)
        expect(() => { shepherd.list(['ceed', 'xxx']) }).not.to.throw(Error)
      })
    })
  })

  describe('Functional Check', () => {
    let _setClientStub
    const shepherd = new Shepherd(shpClientId, { dbPath: path.resolve('./test/database/mqtt2.db') })
    // this.timeout(15000);
    before(() => {
      _setClientStub = sinon.stub(shepherd, '_setClient').callsFake(() => true)
    })

    after(() => {
      _setClientStub.restore()
    })

    describe('#.permitJoin', () => {
      it('should not throw if shepherd is not enabled when permitJoin invoked - shepherd is disabled.', () => {
        expect(shepherd.permitJoin(3)).to.be.equal(false)
      })

      it('should trigger permitJoin counter and event when permitJoin invoked - shepherd is enabled.', (done) => {
        shepherd._enabled = true
        shepherd.once('permitJoining', (joinTime) => {
          shepherd._enabled = false
          if (shepherd._joinable && joinTime === 3) done()
        })
        shepherd.permitJoin(3)
      })
    })

    describe('#.start', function () {
      this.timeout(6000)

      it('should start ok, _ready and reday should be fired, _enabled,', (done) => {
        let _readyCbCalled = false
        let readyCbCalled = false
        let startCbCalled = false

        shepherd.once('_ready', () => {
          _readyCbCalled = true
          if (_readyCbCalled && readyCbCalled && startCbCalled && shepherd._enabled) {
            setTimeout(() => {
              done()
            }, 200)
          }
        })

        shepherd.once('ready', () => {
          readyCbCalled = true
          if (_readyCbCalled && readyCbCalled && startCbCalled && shepherd._enabled) {
            setTimeout(() => {
              done()
            }, 200)
          }
        })

        shepherd.start((err, result) => {
          debug(err)
          startCbCalled = true
          if (_readyCbCalled && readyCbCalled && startCbCalled && shepherd._enabled) {
            setTimeout(() => {
              done()
            }, 200)
          }
        })
      })
    })

    describe('#.find', () => {
      it('should find nothing', () => {
        expect(shepherd.find('nothing')).to.be.equal(undefined)
      })
    })

    describe('#.findByMac', () => {
      it('should find nothing - empty array', () => {
        expect(shepherd.findByMac('no_mac')).to.be.deep.equal([])
      })
    })

    describe('#register new qnode: fired by mc.emit(topic, message, packet)', () => {
      it('should fire registered and get a new qnode', (done) => {
        const _responseSenderSpy = sinon.spy(shepherd, '_responseSender')
        const _clientObjectDetailReqStub = sinon.stub(msgHdlr, '_clientObjectDetailReq').callsFake((shp, cId, objList) => Q.resolve([
          { oid: 0, data: { 1: { x1: 'hi' }, 2: { x2: 'hello' }, 3: { x3: 'hey' } } },
          { oid: 1, data: { 4: { x4: 'hi' }, 5: { x5: 'hello' }, 6: { x6: 'hey' } } }
        ]))

        shepherd.on('_registered', (qnode) => {
          _clientObjectDetailReqStub.restore()
          _responseSenderSpy.restore()
          expect(_responseSenderSpy).to.have.been.calledWith('register', 'test01')
          if (shepherd.find('test01') === qnode && shepherd.findByMac('foo:mac')[0] === qnode) done()
        })

        emitMcRawMessage(shepherd, 'register/test01', {
          transId: 100,
          ip: '127.0.0.2',
          mac: 'foo:mac',
          lifetime: 123456,
          version: '0.0.1',
          objList: {
            0: [1, 2, 3],
            1: [4, 5, 6]
          }
        })
      })

      it('should get correct info about the shepherd', () => {
        const shpInfo = shepherd.info()
        expect(shpInfo.devNum).to.be.equal(1)
        expect(shpInfo.enabled).to.be.equal(true)
        expect(shpInfo.name).to.be.equal('shp_test')
      })

      it('should list only one device', () => {
        const devList = shepherd.list()
        expect(devList.length).to.be.equal(1)
        expect(devList[0].clientId).to.be.equal('test01')
        expect(devList[0].lifetime).to.be.equal(123456)
        expect(devList[0].ip).to.be.equal('127.0.0.2')
        expect(devList[0].mac).to.be.equal('foo:mac')
        expect(devList[0].version).to.be.equal('0.0.1')
        expect(devList[0].objList).to.be.deep.equal({ 0: [1, 2, 3], 1: [4, 5, 6] })
        expect(devList[0].status).to.be.equal('online')
      })
    })

    describe('#.announce', () => {
      it('should announce properly', (done) => {
        const annCb = sinon.spy()
        shepherd.announce('hello').then(annCb).done(() => {
          expect(annCb).to.be.callCount(1)
          done()
        })
      })
    })

    describe('#qnode.readReq', () => {
      it('should send readReq properly - resource - update', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const readReqCb = sinon.spy() // (clientId, reqObj, callback)

        qnode.readReq('0/1/x1').then(readReqCb).done(() => {
          expect(readReqCb).to.be.callCount(1)
          expect(readReqCb).to.be.calledWith({ status: 205, data: 'world' })
          done()
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'read',
          oid: 0,
          iid: 1,
          rid: 'x1',
          status: 205,
          data: 'world'
        })
      })

      it('should send readReq properly - resource - again but no update', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const readReqCb = sinon.spy() // (clientId, reqObj, callback)

        qnode.readReq('0/1/x1').then(readReqCb).done(() => {
          expect(readReqCb).to.be.callCount(1)
          expect(readReqCb).to.be.calledWith({ status: 205, data: 'world' })
          done()
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'read',
          oid: 0,
          iid: 1,
          rid: 'x1',
          status: 205,
          data: 'world'
        })
      })

      it('should send readReq properly - instance - update', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const readReqCb = sinon.spy() // (clientId, reqObj, callback)

        qnode.readReq('0/1').then(readReqCb).done(() => {
          expect(readReqCb).to.be.callCount(1)
          expect(readReqCb).to.be.calledWith({ status: 205, data: { x1: 'hi world', x11: 'yap' } })
          done()
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'read',
          oid: 0,
          iid: 1,
          status: 205,
          data: { x1: 'hi world', x11: 'yap' }
        })
      })

      it('should send readReq properly - object - update', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const readReqCb = sinon.spy() // (clientId, reqObj, callback)
        //  { oid: 0, data: { 1: { x1: 'hi' }, 2: { x2: 'hello' }, 3: { x3: 'hey' } }},
        qnode.readReq('0').then(readReqCb).done(() => {
          expect(readReqCb).to.be.callCount(1)
          expect(readReqCb).to.be.calledWith({
            status: 205,
            data: {
              1: { x1: 'bro' },
              2: { x2: 'sis' },
              3: { x3: 'dad', x4: 'mom' }
            }
          })
          done()
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'read',
          oid: 0,
          status: 205,
          data: {
            1: { x1: 'bro' },
            2: { x2: 'sis' },
            3: { x3: 'dad', x4: 'mom' }
          }
        })
      })
    })

    describe('#qnode.writeReq', function () {
      this.timeout(10000)
      it('should send writeReq properly - resource - update', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const writeReqCb = sinon.spy() // (clientId, reqObj, callback)

        qnode.writeReq('0/1/x1', 'new_x1_value').then(writeReqCb).done(() => {
          expect(writeReqCb).to.be.callCount(1)
          expect(writeReqCb).to.be.calledWith({ status: 204, data: 'new_x1_value' })

          setTimeout(() => {
            done()
          }, 250)
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'write',
          oid: 0,
          iid: 1,
          rid: 'x1',
          status: 204,
          data: 'new_x1_value'
        })

        // emit slightly latter
        setTimeout(() => {
          emitMcRawMessage(shepherd, 'response/test01', {
            transId: shepherd._currentTransId() - 1,
            cmdId: 'read',
            oid: 0,
            iid: 1,
            rid: 'x1',
            status: 205,
            data: 'new_x1_value_read'
          })
        }, 200)
      })

      it('should send writeReq properly - instance - update', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const writeReqCb = sinon.spy() // (clientId, reqObj, callback)

        // x60 has no effect
        qnode.writeReq('0/1', { x1: 'new_x1_value2', x60: 3 }).then(writeReqCb).done(() => {
          expect(writeReqCb).to.be.callCount(1)
          expect(writeReqCb).to.be.calledWith({ status: 204, data: { x1: 'new_x1_value2' } })

          setTimeout(() => {
            done()
          }, 250)
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(), // for write
          cmdId: 'write',
          oid: 0,
          iid: 1,
          status: 204,
          data: { x1: 'new_x1_value2' }
        })

        // emit slightly latter
        setTimeout(() => {
          emitMcRawMessage(shepherd, 'response/test01', {
            transId: shepherd._currentTransId() - 1, //  inner write +1, thus should -1 to backoff
            cmdId: 'read',
            oid: 0,
            iid: 1,
            status: 205,
            data: { x1: 'new_x1_value2_read', x100: '11233' }
          })
        }, 100)
      })
    })

    describe('#qnode.writeAttrsReq', () => {
      it('should send writeAttrsReq properly - resource', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const writeAttrsReqCb = sinon.spy() // (clientId, reqObj, callback)

        qnode.writeAttrsReq('0/1/x1', {
          pmin: 11, pmax: 66, gt: 100, lt: 10, stp: 99
        }).then(writeAttrsReqCb).done(() => {
          expect(writeAttrsReqCb).to.be.callCount(1)
          expect(writeAttrsReqCb).to.be.calledWith({ status: 200 })
          done()
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'writeAttrs',
          oid: 0,
          iid: 1,
          rid: 'x1',
          status: 200,
          data: null
        })
      })

      it('should send writeAttrsReq properly - instance', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const writeAttrsReqCb = sinon.spy() // (clientId, reqObj, callback)

        qnode.writeAttrsReq('0/1', {
          pmin: 11, pmax: 66, gt: 100, lt: 10, stp: 99
        }).then(writeAttrsReqCb).done(() => {
          expect(writeAttrsReqCb).to.be.callCount(1)
          expect(writeAttrsReqCb).to.be.calledWith({ status: 200 })
          done()
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'writeAttrs',
          oid: 0,
          iid: 1,
          status: 200,
          data: null
        })
      })
    })

    describe('#qnode.executeReq', () => {
      it('should send executeReq properly - resource', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const execReqCb = sinon.spy() // (clientId, reqObj, callback)

        qnode.executeReq('0/1/x1', []).then(execReqCb).done(() => {
          expect(execReqCb).to.be.callCount(1)
          expect(execReqCb).to.be.calledWith({ status: 204, data: 'foo_result' })
          done()
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'execute',
          oid: 0,
          iid: 1,
          rid: 'x1',
          status: 204,
          data: 'foo_result'
        })
      })
    })

    describe('#qnode.observeReq', () => {
      it('should send observeReq properly - resource', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const obsvReqCb = sinon.spy() // (clientId, reqObj, callback)

        qnode.observeReq('0/1/x1').then(obsvReqCb).done(() => {
          expect(obsvReqCb).to.be.callCount(1)
          expect(obsvReqCb).to.be.calledWith({ status: 205 })
          done()
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'observe',
          oid: 0,
          iid: 1,
          rid: 'x1',
          status: 205
        })
      })
    })

    describe('#qnode.discoverReq', () => {
      it('should send discoverReq properly - resource', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const dscvReqCb = sinon.spy() // (clientId, reqObj, callback)

        qnode.discoverReq('0/1/x1').then(dscvReqCb).done(() => {
          expect(dscvReqCb).to.be.callCount(1)
          expect(dscvReqCb).to.be.calledWith({ status: 205, data: { pmin: 2, pmax: 10 } })
          done()
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'discover',
          oid: 0,
          iid: 1,
          rid: 'x1',
          status: 205,
          data: { pmin: 2, pmax: 10 }
        })
      })

      it('should send discoverReq properly - instance', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const dscvReqCb = sinon.spy() // (clientId, reqObj, callback)

        qnode.discoverReq('0/1').then(dscvReqCb).done(() => {
          expect(dscvReqCb).to.be.callCount(1)
          expect(dscvReqCb).to.be.calledWith({ status: 205, data: { pmin: 21, pmax: 110 } })
          done()
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'discover',
          oid: 0,
          iid: 1,
          status: 205,
          data: { pmin: 21, pmax: 110 }
        })
      })

      it('should send discoverReq properly - object', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const dscvReqCb = sinon.spy() // (clientId, reqObj, callback)

        qnode.discoverReq('0').then(dscvReqCb).done(() => {
          expect(dscvReqCb).to.be.callCount(1)
          expect(dscvReqCb).to.be.calledWith({
            status: 205,
            data: {
              pmin: 2,
              pmax: 20,
              resrcList: {
                0: [1, 2, 3],
                1: [4, 5, 6]
              }
            }
          })
          done()
        })

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'discover',
          oid: 0,
          iid: 1,
          status: 205,
          data: {
            pmin: 2,
            pmax: 20,
            resrcList: {
              0: [1, 2, 3],
              1: [4, 5, 6]
            }
          }
        })
      })
    })

    describe('#qnode.identifyReq', () => {
      it('should identify successfully', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        // const identifyReqCb = sinon.spy() // (clientId, reqObj, callback)
        qnode.identifyReq().then((rsp) => {
          if (rsp.status === 200) done()
        }).done()

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'identify',
          status: 200
        })
      })
    })

    describe('#qnode.pingReq', () => {
      it('should ping successfully', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        // const pingReqCb = sinon.spy() // (clientId, reqObj, callback)
        qnode.pingReq().then((rsp) => {
          if (rsp.status === 200) done()
        }).done()

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'ping',
          status: 200
        })
      })
    })

    describe('#qnode.quickPingReq', () => {
      it('should quick ping successfully', (done) => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        // const pingReqCb = sinon.spy() // (clientId, reqObj, callback)
        qnode.pingReq().then((rsp) => {
          if (rsp.status === 200) done()
        }).done()

        // fake rx
        emitMcRawMessage(shepherd, 'response/test01', {
          transId: shepherd._currentTransId(),
          cmdId: 'ping',
          status: 200
        })
      })
    })

    describe('#qnode.dump', () => {
      it('should dump correct data', () => {
        const qnode = shepherd.find('test01') // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
        const dumped = qnode.dump()
        delete dumped.joinTime
        expect(dumped).to.be.deep.equal({
          clientId: 'test01',
          so: {
            lwm2mSecurity: {
              1: { x1: 'new_x1_value2' }, // now don't send readReq again, if writeReq has data back
              2: { x2: 'sis' },
              3: { x3: 'dad' }
            },
            lwm2mServer: {
              4: { x4: 'hi' },
              5: { x5: 'hello' },
              6: { x6: 'hey' }
            }
          },
          lifetime: 123456,
          ip: '127.0.0.2',
          mac: 'foo:mac',
          version: '0.0.1',
          objList: {
            0: [1, 2, 3],
            1: [4, 5, 6]
          }
        })
      })
    })

    describe('#register 2nd new qnode: test list, find, findByMac', () => {
      it('should fire registered and get a new qnode', (done) => {
        const _responseSenderSpy = sinon.spy(shepherd, '_responseSender')
        const _clientObjectDetailReqStub = sinon.stub(msgHdlr, '_clientObjectDetailReq').callsFake((shp, cId, objList) => Q.resolve([
          {
            oid: 0,
            data: {
              1: { x1: 'hi' }, 2: { x2: 'hello' }, 3: { x3: 'hey' }, 4: { x4: 'yap' }, 5: { x5: { x51: 'yo ' } }
            }
          },
          { oid: 1, data: { 41: { x41: 'hi' }, 51: { x51: 'hello' }, 61: { x61: 'hey' } } }
        ]))

        shepherd.on('_registered', (qnode) => {
          _clientObjectDetailReqStub.restore()
          _responseSenderSpy.restore()
          expect(_responseSenderSpy).to.have.been.calledWith('register', 'test02')
          if (shepherd.find('test02') === qnode && shepherd.findByMac('foo:mac:bar')[0] === qnode) done()
        })

        emitMcRawMessage(shepherd, 'register/test02', {
          transId: 100,
          ip: '127.0.0.3',
          mac: 'foo:mac:bar',
          lifetime: 123456,
          version: '0.0.2',
          objList: {
            0: [1, 2, 3, 4, 5],
            1: [41, 51, 61]
          }
        })
      })

      it('should list 2 qnodes', () => {
        const devList = shepherd.list()
        expect(shepherd.info().devNum).to.be.equal(2)
        expect(devList.length).to.be.equal(2)
        expect(devList[0].clientId).to.be.equal('test01')
        expect(devList[0].mac).to.be.equal('foo:mac')

        expect(devList[1].clientId).to.be.equal('test02')
        expect(devList[1].mac).to.be.equal('foo:mac:bar')
      })

      it('should find test01', () => {
        const test01 = shepherd.find('test01')
        expect(test01.clientId).to.be.equal('test01')
      })

      it('should find test02', () => {
        const test02 = shepherd.find('test02')
        expect(test02.clientId).to.be.equal('test02')
      })

      it('should findByMac test01', () => {
        const test01 = shepherd.findByMac('foo:mac')[0]
        expect(test01.clientId).to.be.equal('test01')
      })

      it('should findByMac test02', () => {
        const test02 = shepherd.findByMac('foo:mac:bar')[0]
        expect(test02.clientId).to.be.equal('test02')
      })
    })

    describe('#.remove', () => {
      it('should remove test01', (done) => {
        shepherd.remove('test01', () => {
          if (_.isUndefined(shepherd.find('test01')) && shepherd.list().length === 1) done()
        })
      })
    })

    describe('#register 3nd new qnode: test acceptDevIncoming', function () {
      this.timeout(60000)

      it('should fire registered and get a new qnode', (done) => {
        const _responseSenderSpy = sinon.spy(shepherd, '_responseSender')
        const _acceptDevIncomingStub = sinon.stub(shepherd, 'acceptDevIncoming').callsFake((qnode, cb) => {
          setTimeout(() => {
            const accepted = true
            cb(null, accepted)
          }, 6000)
        })
        const _clientObjectDetailReqStub = sinon.stub(msgHdlr, '_clientObjectDetailReq').callsFake((shp, cId, objList) => Q.resolve([
          {
            oid: 0,
            data: {
              1: { x1: 'hi' }, 2: { x2: 'hello' }, 3: { x3: 'hey' }, 4: { x4: 'yap' }, 5: { x5: { x51: 'yo ' } }
            }
          },
          { oid: 1, data: { 41: { x41: 'hi' }, 51: { x51: 'hello' }, 61: { x61: 'hey' } } }
        ]))

        shepherd.on('_registered', (qnode) => {
          _clientObjectDetailReqStub.restore()
          _acceptDevIncomingStub.restore()
          _responseSenderSpy.restore()
          expect(_responseSenderSpy).to.have.been.calledWith('register', 'test03')
          if (shepherd.find('test03') === qnode && shepherd.findByMac('foo:mac:bar:xyz')[0] === qnode) done()
        })

        emitMcRawMessage(shepherd, 'register/test03', {
          transId: 100,
          ip: '127.0.0.4',
          mac: 'foo:mac:bar:xyz',
          lifetime: 123456,
          version: '0.0.2',
          objList: {
            0: [1, 2, 3, 4, 5],
            1: [41, 51, 61]
          }
        })
      })
    })

    describe('#.reset', function () {
      this.timeout(20000)
      it('should reset - soft', (done) => {
        shepherd.once('ready', () => {
          setTimeout(() => {
            done()
          }, 1000)
        })
        shepherd.reset(false).done()
      })

      it('should reset - hard', (done) => {
        shepherd.once('ready', () => {
          setTimeout(() => {
            done()
          }, 1000)
        })
        shepherd.reset(true).done()
      })
    })

    describe('#.stop', () => {
      it('should stop ok, permitJoin 0 should be fired, _enabled should be false', (done) => {
        let joinFired = false
        let stopCalled = false

        shepherd.once('permitJoining', (joinTime) => {
          joinFired = true
          if (joinTime === 0 && !shepherd._enabled && !shepherd.mClient && stopCalled && joinFired) done()
        })

        shepherd.stop((err, result) => {
          stopCalled = true
          if (!err && !shepherd._enabled && !shepherd.mClient && stopCalled && joinFired) {
            done()
          }
        })
      })
    })
  })
})

function emitMcRawMessage (shepherd, intf, msg) {
  const mc = shepherd.mClient

  if (!_.isString(msg)) msg = JSON.stringify(msg)

  msg = Buffer.from(msg)

  mc.emit('message', intf, msg)
}
