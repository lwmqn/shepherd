var _ = require('busyman'),
    Q = require('q'),
    chai = require('chai'),
    sinon = require('sinon'),
    chaiAsPromised = require('chai-as-promised'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect;

chai.use(sinonChai);
chai.use(chaiAsPromised);

var Shepherd = require('../index.js'),
    config = require('../lib/config.js'),
    msgHdlr = require('../lib/components/msghandler.js');

/***************************************************/
/*** Prepare Shepherd Settings                   ***/
/***************************************************/
var shpClientId = 'shp_test';

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

    describe('#.findByMacAddr', function () {
        it('should throw if macAddr is not a string', function () {
            expect(function () { shepherd.findByMacAddr({}); }).to.throw(TypeError);
            expect(function () { shepherd.findByMacAddr(true); }).to.throw(TypeError);
            expect(function () { shepherd.findByMacAddr('ceed'); }).not.to.throw(TypeError);
        });
    });

    describe('#.deregisterNode', function () {
        it('should throw if clientId is not a string', function () {
            expect(function () { shepherd.deregisterNode({}); }).to.throw(TypeError);
            expect(function () { shepherd.deregisterNode(true); }).to.throw(TypeError);
            expect(function () { shepherd.deregisterNode('ceed'); }).not.to.throw(TypeError);
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

    describe('#.listDevices', function () {
        it('should throw if cIds is not an array of strings', function () {
            expect(function () { shepherd.listDevices({}); }).to.throw(TypeError);
            expect(function () { shepherd.listDevices(true); }).to.throw(TypeError);
            expect(function () { shepherd.listDevices('ceed'); }).to.throw(TypeError);
            expect(function () { shepherd.listDevices([ 'ceed', {} ]); }).to.throw(TypeError);
            expect(function () { shepherd.listDevices([ 'ceed', 'xxx' ]); }).not.to.throw(TypeError);
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

    describe.skip('#.reset', function () {
        it('should reset - hard', function () {});
        it('should reset - soft', function () {});
    });

    describe('#.find', function () {
        it('should find nothing', function () {
            expect(shepherd.find('nothing')).to.be.undefined;
        });
    });

    describe('#.findByMacAddr', function () {
        it('should find nothing - empty array', function () {
            expect(shepherd.findByMacAddr('no_mac')).to.be.deep.equal([]);
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
                if (shepherd.find('test01') === qnode)
                    done();
            });

            emitMcRawMessage(shepherd, 'register/test01', {
                transId: 100,
                ip: '127.0.0.1',
                mac: 'foo:mac',
                lifetime: 123456,
                version: '0.0.1',
                objList: {
                    0: [ 1, 2, 3 ],
                    1: [ 4, 5, 6 ]
                }
            });
        });
    });
});

function emitMcRawMessage(shepherd, intf, msg) {
    var mc = shepherd.mClient;

    if (!_.isString(msg))
        msg = JSON.stringify(msg);

    msg = new Buffer(msg);

    mc.emit('message', intf, msg);
};