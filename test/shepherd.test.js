var fs = require('fs'),
    path = require('path'),
    _ = require('busyman'),
    Q = require('q'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect;

chai.use(sinonChai);

var Shepherd = require('../index.js'),
    config = require('../lib/config.js'),
    msgHdlr = require('../lib/components/msghandler.js');

/***************************************************/
/*** Prepare Shepherd Settings                   ***/
/***************************************************/
var shpClientId = 'shp_test';
try {
    fs.unlinkSync(path.resolve('./lib/database/mqtt.db'));
} catch (e) {
    console.log(e);
}

describe('Constructor Check', function () {
    it('should has all correct members after new', function () {
        var shepherd = new Shepherd('test1', { defaultDbPath:  __dirname + '/database/mqtt1.db' });
        expect(shepherd.clientId).to.be.equal('test1');
        expect(shepherd.brokerSettings).to.be.equal(config.brokerSettings);
        expect(shepherd.defaultAccount).to.be.null;
        expect(shepherd.clientConnOptions).to.be.equal(config.clientConnOptions);
        expect(shepherd.reqTimeout).to.be.equal(config.reqTimeout);
        expect(shepherd._dbPath).to.be.equal( __dirname + '/database/mqtt1.db');
        expect(shepherd._mqdb).to.be.an('object');
        expect(shepherd._nodebox).to.be.an('object');
        expect(shepherd._joinable).to.be.false;
        expect(shepherd._enabled).to.be.false;
        expect(shepherd._permitJoinTime).to.be.equal(0);
        expect(shepherd._startTime).to.be.equal(0);
        expect(shepherd._net).to.be.deep.equal({ intf: '', ip: '', mac: '', routerIp: '' });
        expect(shepherd._channels).to.be.deep.equal({
            'register/#': 0,
            'deregister/#': 0,
            'notify/#': 1,
            'update/#': 1,
            'response/#': 1,
            'ping/#': 0,
            'lwt/#': 0,
            'request/#': 0,
            'announce/#': 0
        });
        expect(shepherd._areq).to.be.an('object');

        expect(shepherd.mBroker).to.be.null;
        expect(shepherd.mClient).to.be.null;

        expect(shepherd.authPolicy).to.be.an('object');
        expect(shepherd.authPolicy.authenticate).to.be.null;
        expect(shepherd.authPolicy.authorizePublish).to.be.a('function');
        expect(shepherd.authPolicy.authorizeSubscribe).to.be.a('function');
        expect(shepherd.authPolicy.authorizeForward).to.be.a('function');

        expect(shepherd.encrypt).to.be.a('function');
        expect(shepherd.decrypt).to.be.a('function');
        expect(shepherd.nextTransId).to.be.a('function');
        expect(shepherd.permitJoin).to.be.a('function');
    });

    it('should throw if name is given but not a string', function () {
        expect(function () { return new Shepherd({}, {}); }).to.throw(TypeError);
        expect(function () { return new Shepherd([], {}); }).to.throw(TypeError);
        expect(function () { return new Shepherd(1, {}); }).to.throw(TypeError);
        expect(function () { return new Shepherd(true, {}); }).to.throw(TypeError);
        expect(function () { return new Shepherd(NaN, {}); }).to.throw(TypeError);


        expect(function () { return new Shepherd(); }).not.to.throw(Error);
        expect(function () { return new Shepherd('xxx'); }).not.to.throw(Error);
        expect(function () { return new Shepherd({}); }).not.to.throw(Error);
    });

    it('should throw if setting is given but not an object', function () {
        expect(function () { return new Shepherd([]); }).to.throw(TypeError);

        expect(function () { return new Shepherd('xxx', []); }).to.throw(TypeError);
        expect(function () { return new Shepherd('xxx', 1); }).to.throw(TypeError);
        expect(function () { return new Shepherd('xxx', true); }).to.throw(TypeError);
    });
});

describe('Signature Check', function () {
    var shepherd = new Shepherd('test2', { defaultDbPath:  __dirname + '/database/mqtt1.db' });

    describe('#.permitJoin', function () {
        it('should throw if time is given but not a number', function () {
            expect(function () { shepherd.permitJoin({}); }).to.throw(TypeError);
            expect(function () { shepherd.permitJoin(true); }).to.throw(TypeError);
        });
    });

    describe('#.find', function () {
        it('should throw if clientId is not a string', function () {
            expect(function () { shepherd.find({}); }).to.throw(TypeError);
            expect(function () { shepherd.find(true); }).to.throw(TypeError);
            expect(function () { shepherd.find('ceed'); }).not.to.throw(TypeError);
        });
    });

    describe('#.findByMac', function () {
        it('should throw if macAddr is not a string', function () {
            expect(function () { shepherd.findByMac({}); }).to.throw(TypeError);
            expect(function () { shepherd.findByMac(true); }).to.throw(TypeError);
            expect(function () { shepherd.findByMac('ceed'); }).not.to.throw(TypeError);
        });
    });

    describe('#.remove', function () {
        it('should throw if clientId is not a string', function () {
            expect(function () { shepherd.remove({}); }).to.throw(TypeError);
            expect(function () { shepherd.remove(true); }).to.throw(TypeError);
            expect(function () { shepherd.remove('ceed'); }).not.to.throw(TypeError);
        });
    });

    describe('#._responseSender', function () {
        it('should throw if clientId is not a string', function () {
            expect(function () { shepherd._responseSender('register', {}, {}); }).to.throw(TypeError);
            expect(function () { shepherd._responseSender('register', true, {}); }).to.throw(TypeError);
            expect(function () { shepherd._responseSender('register', 'ceed', {}); }).not.to.throw(TypeError);
        });
    });

    describe('#._requestSender', function () {
        it('should throw if clientId is not a string', function () {
            expect(function () { shepherd._requestSender('register', {}, {}); }).to.throw(TypeError);
            expect(function () { shepherd._requestSender('register', true, {}); }).to.throw(TypeError);
            expect(function () { shepherd._requestSender('register', 'ceed', {}); }).not.to.throw(TypeError);
        });
    });

    describe('#.readReq', function () {
        it('should throw if clientId is not a string', function () {
            expect(function () { shepherd.readReq({}, {}); }).to.throw(TypeError);
            expect(function () { shepherd.readReq(true, {}); }).to.throw(TypeError);
            expect(function () { shepherd.readReq('ceed', {}); }).not.to.throw(TypeError);
        });
    });

    describe('#.writeReq', function () {
        it('should throw if clientId is not a string', function () {
            expect(function () { shepherd.writeReq({}, {}); }).to.throw(TypeError);
            expect(function () { shepherd.writeReq(true, {}); }).to.throw(TypeError);
            expect(function () { shepherd.writeReq('ceed', {}); }).not.to.throw(TypeError);
        });
    });

    describe('#.writeAttrsReq', function () {
        it('should throw if clientId is not a string', function () {
            expect(function () { shepherd.writeAttrsReq({}, {}); }).to.throw(TypeError);
            expect(function () { shepherd.writeAttrsReq(true, {}); }).to.throw(TypeError);
            expect(function () { shepherd.writeAttrsReq('ceed', {}); }).not.to.throw(TypeError);
        });
    });

    describe('#.discoverReq', function () {
        it('should throw if clientId is not a string', function () {
            expect(function () { shepherd.discoverReq({}, {}); }).to.throw(TypeError);
            expect(function () { shepherd.discoverReq(true, {}); }).to.throw(TypeError);
            expect(function () { shepherd.discoverReq('ceed', {}); }).not.to.throw(TypeError);
        });
    });

    describe('#.executeReq', function () {
        it('should throw if clientId is not a string', function () {
            expect(function () { shepherd.executeReq({}, {}); }).to.throw(TypeError);
            expect(function () { shepherd.executeReq(true, {}); }).to.throw(TypeError);
            expect(function () { shepherd.executeReq('ceed', {}); }).not.to.throw(TypeError);
        });
    });

    describe('#.observeReq', function () {
        it('should throw if clientId is not a string', function () {
            expect(function () { shepherd.observeReq({}, {}); }).to.throw(TypeError);
            expect(function () { shepherd.observeReq(true, {}); }).to.throw(TypeError);
            expect(function () { shepherd.observeReq('ceed', {}); }).not.to.throw(TypeError);
        });
    });

    describe('#.pingReq', function () {
        it('should throw if clientId is not a string', function () {
            expect(function () { shepherd.pingReq({}); }).to.throw(TypeError);
            expect(function () { shepherd.pingReq(true); }).to.throw(TypeError);
            expect(function () { shepherd.pingReq('ceed'); }).not.to.throw(TypeError);
        });
    });

    describe('#.list', function () {
        it('should throw if cIds is not an array of strings', function () {
            expect(function () { shepherd.list({}); }).to.throw(TypeError);
            expect(function () { shepherd.list(true); }).to.throw(TypeError);
            expect(function () { shepherd.list('ceed'); }).to.throw(TypeError);
            expect(function () { shepherd.list([ 'ceed', {} ]); }).to.throw(TypeError);
            expect(function () { shepherd.list([ 'ceed', 'xxx' ]); }).not.to.throw(TypeError);
        });
    });

    describe('#.maintain', function () {
        it('should throw if cIds is not a string or not an array of strings', function () {
            expect(function () { shepherd.maintain({}); }).to.throw(TypeError);
            expect(function () { shepherd.maintain(true); }).to.throw(TypeError);
            expect(function () { shepherd.maintain([ 'ceed', {} ]); }).to.throw(TypeError);

            expect(function () { shepherd.maintain('ceed'); }).not.to.throw(TypeError);
            expect(function () { shepherd.maintain([ 'ceed', 'xxx' ]); }).not.to.throw(TypeError);
        });
    });
});

describe('Functional Check', function () {
    var shepherd = new Shepherd(shpClientId);
    // this.timeout(15000);

    describe('#.permitJoin', function () {
        it('should throw if shepherd is not enabled when permitJoin invoked - shepherd is disabled.', function () {
            expect(function () { return shepherd.permitJoin(3); }).to.throw(Error);
        });

        it('should trigger permitJoin counter and event when permitJoin invoked - shepherd is enabled.', function (done) {
            shepherd._enabled = true;
            shepherd.once('permitJoining', function (joinTime) {
                shepherd._enabled = false;
                if (shepherd._joinable && joinTime === 3)
                    done();
            });
            shepherd.permitJoin(3);
        });
    });

    describe('#.start', function () {
        this.timeout(6000);

        it('should start ok, _ready and reday should be fired, _enabled,', function (done) {
            var _readyCbCalled = false,
                readyCbCalled = false,
                startCbCalled = false;

            shepherd.once('_ready', function () {
                _readyCbCalled = true;
                if (_readyCbCalled && readyCbCalled && startCbCalled && shepherd._enabled)
                    done();
            });

            shepherd.once('ready', function () {
                readyCbCalled = true;
                if (_readyCbCalled && readyCbCalled && startCbCalled && shepherd._enabled)
                    done();
            });

            shepherd.start(function (err, result) {
                startCbCalled = true;
                if (_readyCbCalled && readyCbCalled && startCbCalled && shepherd._enabled)
                    done();
            });
        });
    });

    describe.skip('#.stop', function () {
        it('should stop ok, permitJoin 0 should be fired, _enabled should be false', function (done) {
            var joinFired = false,
                stopCalled = false;

            shepherd.once('permitJoining', function (joinTime) {
                joinFired = true;
                if (joinTime === 0 && !shepherd._enabled && !shepherd.mClient && stopCalled && joinFired)
                    done();
            });

            shepherd.stop(function (err, result) {
                stopCalled = true;
                if (!err && !shepherd._enabled && !shepherd.mClient && stopCalled && joinFired) {
                    done();
                }
            });
        });
    });

    describe('#.find', function () {
        it('should find nothing', function () {
            expect(shepherd.find('nothing')).to.be.undefined;
        });
    });

    describe('#.findByMac', function () {
        it('should find nothing - empty array', function () {
            expect(shepherd.findByMac('no_mac')).to.be.deep.equal([]);
        });
    });

    describe('#register new qnode: fired by mc.emit(topic, message, packet)', function () {
        it('should fire registered and get a new qnode', function (done) {
            var _responseSenderSpy = sinon.spy(shepherd, '_responseSender');
            var _clientObjectDetailReqStub = sinon.stub(msgHdlr, '_clientObjectDetailReq', function (shp, cId, objList) {
                return Q.resolve([
                    { oid: 0, data: { 1: { x1: 'hi' }, 2: { x2: 'hello' }, 3: { x3: 'hey' } }},
                    { oid: 1, data: { 4: { x4: 'hi' }, 5: { x5: 'hello' }, 6: { x6: 'hey' } }},
                ]);
            });

            shepherd.on('registered', function (qnode) {
                _clientObjectDetailReqStub.restore();
                _responseSenderSpy.restore();
                expect(_responseSenderSpy).to.have.been.calledWith('register', 'test01');
                if (shepherd.find('test01') === qnode && shepherd.findByMac('foo:mac')[0] === qnode )
                    done();
            });

            emitMcRawMessage(shepherd, 'register/test01', {
                transId: 100,
                ip: '127.0.0.2',
                mac: 'foo:mac',
                lifetime: 123456,
                version: '0.0.1',
                objList: {
                    0: [ 1, 2, 3 ],
                    1: [ 4, 5, 6 ]
                }
            });
        });

        it('should get correct info about the shepherd', function () {
            var shpInfo = shepherd.info();

            expect(shpInfo.devNum).to.be.equal(1);
            expect(shpInfo.enabled).to.be.true;
            expect(shpInfo.name).to.be.equal("shp_test");
        });

        it('should list only one device', function () {
            var devList = shepherd.list();
            expect(devList.length).to.be.equal(1);
            expect(devList[0].clientId).to.be.equal('test01');
            expect(devList[0].lifetime).to.be.equal(123456);
            expect(devList[0].ip).to.be.equal('127.0.0.2');
            expect(devList[0].mac).to.be.equal('foo:mac');
            expect(devList[0].version).to.be.equal('0.0.1');
            expect(devList[0].objList).to.be.deep.equal({ '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] });
            expect(devList[0].status).to.be.equal('online');
        });
    });

    describe('#.announce', function () {
        it('should announce properly', function (done) {
            var annCb = sinon.spy();
            shepherd.announce('hello').then(annCb).done(function () {
                expect(annCb).to.be.calledOnce;
                done();
            });
        });
    });

    describe('#qnode.readReq', function () {
        it('should send readReq properly - resource - update', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var readReqCb = sinon.spy();     // (clientId, reqObj, callback)

            qnode.readReq('0/1/x1').then(readReqCb).done(function () {
                expect(readReqCb).to.be.calledOnce;
                expect(readReqCb).to.be.calledWith({ status: 205, data: 'world' });
                done();
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'read',
                oid: 0,
                iid: 1,
                rid: 'x1',
                status: 205,
                data: 'world'
            });
        });

        it('should send readReq properly - resource - again but no update', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var readReqCb = sinon.spy();     // (clientId, reqObj, callback)

            qnode.readReq('0/1/x1').then(readReqCb).done(function () {
                expect(readReqCb).to.be.calledOnce;
                expect(readReqCb).to.be.calledWith({ status: 205, data: 'world' });
                done();
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'read',
                oid: 0,
                iid: 1,
                rid: 'x1',
                status: 205,
                data: 'world'
            });
        });

        it('should send readReq properly - instance - update', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var readReqCb = sinon.spy();     // (clientId, reqObj, callback)

            qnode.readReq('0/1').then(readReqCb).done(function () {
                expect(readReqCb).to.be.calledOnce;
                expect(readReqCb).to.be.calledWith({ status: 205, data: { x1: 'hi world', x11: 'yap' } });
                done();
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'read',
                oid: 0,
                iid: 1,
                status: 205,
                data: { x1: 'hi world', x11: 'yap' }
            });
        });

        it('should send readReq properly - object - update', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var readReqCb = sinon.spy();            // (clientId, reqObj, callback)
            //  { oid: 0, data: { 1: { x1: 'hi' }, 2: { x2: 'hello' }, 3: { x3: 'hey' } }},
            qnode.readReq('0').then(readReqCb).done(function () {
                expect(readReqCb).to.be.calledOnce;
                expect(readReqCb).to.be.calledWith({ status: 205, data: {
                    1: { x1: 'bro' },
                    2: { x2: 'sis' },
                    3: { x3: 'dad', x4: 'mom' }
                } });
                done();
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'read',
                oid: 0,
                status: 205,
                data: {
                    1: { x1: 'bro' },
                    2: { x2: 'sis' },
                    3: { x3: 'dad', x4: 'mom' }
                }
            });
        });
    });

    describe('#qnode.writeReq', function () {
        this.timeout(10000);
        it('should send writeReq properly - resource - update', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var writeReqCb = sinon.spy();     // (clientId, reqObj, callback)

            qnode.writeReq('0/1/x1', 'new_x1_value').then(writeReqCb).done(function () {
                expect(writeReqCb).to.be.calledOnce;
                expect(writeReqCb).to.be.calledWith({ status: 204, data: 'new_x1_value' });

                setTimeout(function () {
                    done();
                }, 250);
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'write',
                oid: 0,
                iid: 1,
                rid: 'x1',
                status: 204,
                data: 'new_x1_value'
            });

            // emit slightly latter
            setTimeout(function () {
                emitMcRawMessage(shepherd, 'response/test01', {
                    transId: shepherd.nextTransId() - 1,
                    cmdId: 'read',
                    oid: 0,
                    iid: 1,
                    rid: 'x1',
                    status: 205,
                    data: 'new_x1_value_read'
                });
            }, 200);
        });

        it('should send writeReq properly - instance - update', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var writeReqCb = sinon.spy();     // (clientId, reqObj, callback)

            // x60 has no effect
            qnode.writeReq('0/1', { x1: 'new_x1_value2', x60: 3 }).then(writeReqCb).done(function () {
                expect(writeReqCb).to.be.calledOnce;
                expect(writeReqCb).to.be.calledWith({ status: 204, data: { x1: 'new_x1_value2' } });

                setTimeout(function () {
                    done();
                }, 250);
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'write',
                oid: 0,
                iid: 1,
                status: 204,
                data: { x1: 'new_x1_value2' }
            });

            // emit slightly latter
            setTimeout(function () {
                emitMcRawMessage(shepherd, 'response/test01', {
                    transId: shepherd.nextTransId() - 1,
                    cmdId: 'read',
                    oid: 0,
                    iid: 1,
                    status: 205,
                    data: { x1: 'new_x1_value2_read', x100: '11233' }
                });
            }, 200);
        });
    });

    describe('#qnode.writeAttrsReq', function () {
        it('should send writeAttrsReq properly - resource', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var writeAttrsReqCb = sinon.spy();     // (clientId, reqObj, callback)

            qnode.writeAttrsReq('0/1/x1', { pmin: 11, pmax: 66, gt: 100, lt: 10, stp: 99 }).then(writeAttrsReqCb).done(function () {
                expect(writeAttrsReqCb).to.be.calledOnce;
                expect(writeAttrsReqCb).to.be.calledWith({ status: 200 });
                done();
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'writeAttrs',
                oid: 0,
                iid: 1,
                rid: 'x1',
                status: 200,
                data: null
            });
        });

        it('should send writeAttrsReq properly - instance', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var writeAttrsReqCb = sinon.spy();     // (clientId, reqObj, callback)

            qnode.writeAttrsReq('0/1', { pmin: 11, pmax: 66, gt: 100, lt: 10, stp: 99 }).then(writeAttrsReqCb).done(function () {
                expect(writeAttrsReqCb).to.be.calledOnce;
                expect(writeAttrsReqCb).to.be.calledWith({ status: 200 });
                done();
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'writeAttrs',
                oid: 0,
                iid: 1,
                status: 200,
                data: null
            });
        });
    });

    describe('#qnode.executeReq', function () {
        it('should send executeReq properly - resource', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var execReqCb = sinon.spy();            // (clientId, reqObj, callback)

            qnode.executeReq('0/1/x1', []).then(execReqCb).done(function () {
                expect(execReqCb).to.be.calledOnce;
                expect(execReqCb).to.be.calledWith({ status: 204, data: 'foo_result' });
                done();
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'execute',
                oid: 0,
                iid: 1,
                rid: 'x1',
                status: 204,
                data: 'foo_result'
            });
        });
    });


    describe('#qnode.observeReq', function () {
        it('should send observeReq properly - resource', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var obsvReqCb = sinon.spy();            // (clientId, reqObj, callback)

            qnode.observeReq('0/1/x1').then(obsvReqCb).done(function () {
                expect(obsvReqCb).to.be.calledOnce;
                expect(obsvReqCb).to.be.calledWith({ status: 205 });
                done();
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'observe',
                oid: 0,
                iid: 1,
                rid: 'x1',
                status: 205
            });
        });
    });

    describe('#qnode.discoverReq', function () {
        it('should send discoverReq properly - resource', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var dscvReqCb = sinon.spy();            // (clientId, reqObj, callback)

            qnode.discoverReq('0/1/x1').then(dscvReqCb).done(function () {
                expect(dscvReqCb).to.be.calledOnce;
                expect(dscvReqCb).to.be.calledWith({ status: 205, data: { pmin: 2, pmax: 10 } });
                done();
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'discover',
                oid: 0,
                iid: 1,
                rid: 'x1',
                status: 205,
                data: { pmin: 2, pmax: 10 }
            });
        });

        it('should send discoverReq properly - instance', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var dscvReqCb = sinon.spy();            // (clientId, reqObj, callback)

            qnode.discoverReq('0/1').then(dscvReqCb).done(function () {
                expect(dscvReqCb).to.be.calledOnce;
                expect(dscvReqCb).to.be.calledWith({ status: 205, data: { pmin: 21, pmax: 110 } });
                done();
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'discover',
                oid: 0,
                iid: 1,
                status: 205,
                data: { pmin: 21, pmax: 110 }
            });
        });

        it('should send discoverReq properly - object', function (done) {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var dscvReqCb = sinon.spy();            // (clientId, reqObj, callback)

            qnode.discoverReq('0').then(dscvReqCb).done(function () {
                expect(dscvReqCb).to.be.calledOnce;
                expect(dscvReqCb).to.be.calledWith({ status: 205, data: {
                        pmin: 2,
                        pmax: 20,
                        resrcList: {
                            '0': [ 1, 2, 3 ],
                            '1': [ 4, 5, 6 ]
                        }
                    }
                });
                done();
            });

            // fake rx
            emitMcRawMessage(shepherd, 'response/test01', {
                transId: shepherd.nextTransId() - 1,
                cmdId: 'discover',
                oid: 0,
                iid: 1,
                status: 205,
                data: {
                    pmin: 2,
                    pmax: 20,
                    resrcList: {
                        '0': [ 1, 2, 3 ],
                        '1': [ 4, 5, 6 ]
                    }
                }
            });
        });
    });

    describe('#qnode.dump', function () {
        it('should dump correct data', function () {
            var qnode = shepherd.find('test01');    // { '0': [ 1, 2, 3 ], '1': [ 4, 5, 6 ] } }
            var dumped = qnode.dump();
            delete dumped.joinTime;
            expect(dumped).to.be.deep.equal({
                clientId: 'test01',
                so: {
                    lwm2mSecurity: {
                        '1': { x1: "new_x1_value2_read" },
                        '2': { x2: "sis" },
                        '3': { x3: "dad" }
                    },
                    lwm2mServer: {
                        '4': { x4: "hi" },
                        '5': { x5: "hello" },
                        '6': { x6: "hey" }
                    }
                },
                lifetime: 123456,
                ip: '127.0.0.2',
                mac: 'foo:mac',
                version: '0.0.1',
                objList: {
                    '0': [ 1, 2, 3 ],
                    '1': [ 4, 5, 6 ]
                }
            });
        });
    });

    describe('#register 2nd new qnode: test list, find, findByMac', function () {
        it('should fire registered and get a new qnode', function (done) {
            var _responseSenderSpy = sinon.spy(shepherd, '_responseSender');
            var _clientObjectDetailReqStub = sinon.stub(msgHdlr, '_clientObjectDetailReq', function (shp, cId, objList) {
                return Q.resolve([
                    { oid: 0, data: { 1: { x1: 'hi' }, 2: { x2: 'hello' }, 3: { x3: 'hey' }, 4: { x4: 'yap' }, 5: { x5: { x51: 'yo '} } }},
                    { oid: 1, data: { 41: { x41: 'hi' }, 51: { x51: 'hello' }, 61: { x61: 'hey' } }},
                ]);
            });

            shepherd.on('registered', function (qnode) {
                _clientObjectDetailReqStub.restore();
                _responseSenderSpy.restore();
                expect(_responseSenderSpy).to.have.been.calledWith('register', 'test02');
                if (shepherd.find('test02') === qnode && shepherd.findByMac('foo:mac:bar')[0] === qnode )
                    done();
            });

            emitMcRawMessage(shepherd, 'register/test02', {
                transId: 100,
                ip: '127.0.0.3',
                mac: 'foo:mac:bar',
                lifetime: 123456,
                version: '0.0.2',
                objList: {
                    0: [ 1, 2, 3, 4, 5 ],
                    1: [ 41, 51, 61 ]
                }
            });
        });

        it('should list 2 qnodes', function () {
            var devList = shepherd.list();
            expect(shepherd.info().devNum).to.be.equal(2);
            expect(devList.length).to.be.equal(2);
            expect(devList[0].clientId).to.be.equal('test01');
            expect(devList[0].mac).to.be.equal('foo:mac');

            expect(devList[1].clientId).to.be.equal('test02');
            expect(devList[1].mac).to.be.equal('foo:mac:bar');
        });

        it('should find test01', function () {
            var test01 = shepherd.find('test01');
            expect(test01.clientId).to.be.equal('test01');
        });

        it('should find test02', function () {
            var test02 = shepherd.find('test02');
            expect(test02.clientId).to.be.equal('test02');
        });

        it('should findByMac test01', function () {
            var test01 = shepherd.findByMac('foo:mac')[0];
            expect(test01.clientId).to.be.equal('test01');
        });

        it('should findByMac test02', function () {
            var test02 = shepherd.findByMac('foo:mac:bar')[0];
            expect(test02.clientId).to.be.equal('test02');
        });
    });

    describe('#.remove', function () {
        it('should remove test01', function (done) {
            shepherd.remove('test01', function () {
                if (_.isUndefined(shepherd.find('test01')) && shepherd.list().length === 1)
                    done();
            });
        });
    });

    describe('#.reset', function () {
        this.timeout(20000);
        it('should reset - soft', function (done) {
            shepherd.once('ready', function () {
                done();
            });
            shepherd.reset(false).done();
        });

        // it('should reset - hard', function () {});
    });


});

function emitMcRawMessage(shepherd, intf, msg) {
    var mc = shepherd.mClient;

    if (!_.isString(msg))
        msg = JSON.stringify(msg);

    msg = new Buffer(msg);

    mc.emit('message', intf, msg);
};