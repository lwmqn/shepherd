var should = require('should'),
    _ = require('lodash'),
    MqttNode = require('../mqtt-node'),
    SmartObject = require('../smartobject');

var cId = 'Im-client-node',
    devAttrs = {
        lifetime: 60000,
        ip: '140.117.11.1',
        mac: '11:22:AA:BB:CC:DD',
        version: 'v0.0.1'
    };

var myso = new SmartObject('myso'),
    smObj1 = {
        'x': {
            0: {
                'x1': 1,
                'x2': 2
            },
            1: {
                'y1': 3,
                'y2': 4
            }
        }
    },
    smObj2 = [ { 'y': { 3: { 'y31': 'hi' }} }, { 'z': { 1: { 'z11': 'hello', 'z12': 'world' }, 0: { 'z11': 'hello', 'z12': 'world' }} } ];

myso.addObjects([smObj1, smObj2]);

var fakeShp = {};
var node = new MqttNode(fakeShp, cId, devAttrs);

// console.log(node);
// console.log(myso);
describe('Constructor Check', function () {
    it('MqttNode(shepherd, clientId, devAttrs)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);
        should(node.shepherd).be.equal(fakeShp);
        should(node.clientId).be.eql(cId);
        should(node.ip).be.eql('140.117.11.1');
        should(node.mac).be.eql('11:22:AA:BB:CC:DD');
        should(node.version).be.eql('v0.0.1');
        should(node.lifetime).be.eql(60000);
        should(node.objList).be.eql({});
        should(node.so).be.null();
        should(node._registered).be.false();
        should(node.status).be.eql('offline');
        should(node.lifeChecker).be.null();
    });
});

describe('Signature Check', function () {
    it('MqttNode(shepherd, clientId, devAttrs)', function () {
        (function () { return new MqttNode({}, 'xxx'); }).should.not.throw();
        (function () { return new MqttNode({}, 'xxx', {}); }).should.not.throw();

        (function () { return new MqttNode({}, 'xxx', []); }).should.throw();
        (function () { return new MqttNode({}, 'xxx', 1); }).should.throw();
        (function () { return new MqttNode({}, 'xxx', 'ttt'); }).should.throw();

        (function () { return new MqttNode({}, [], {}); }).should.throw();
        (function () { return new MqttNode({}, {}, {}); }).should.throw();
        (function () { return new MqttNode({}, false, {}); }).should.throw();
        (function () { return new MqttNode({}, undefined, {}); }).should.throw();
        (function () { return new MqttNode({}, null, {}); }).should.throw();

        (function () { return new MqttNode({}); }).should.throw();

        (function () { return new MqttNode([], 'xxx', {}); }).should.throw();
        (function () { return new MqttNode(1, 'xxx', {}); }).should.throw();
        (function () { return new MqttNode(false, 'xxx', {}); }).should.throw();
        (function () { return new MqttNode(undefined, 'xxx', {}); }).should.throw();
        (function () { return new MqttNode(null, 'xxx', {}); }).should.throw();
        (function () { return new MqttNode('fff', 'xxx', {}); }).should.throw();
    });

    it('bindSo(so)', function () {
        var nodex = new MqttNode(fakeShp, cId, devAttrs);
        (function () { nodex.bindSo(); }).should.throw();
        (function () { nodex.bindSo('x'); }).should.throw();
        (function () { nodex.bindSo(2); }).should.throw();
        (function () { nodex.bindSo(null); }).should.throw();
        (function () { nodex.bindSo(false); }).should.throw();
        (function () { nodex.bindSo([]); }).should.throw();
        (function () { nodex.bindSo({}); }).should.throw();
    });

    it('getRootObject(oid) - so not bound', function () {
        (function () { node.getRootObject('x'); }).should.throw();
    });

    it('geIObject(oid, iid) - so not bound', function () {
        (function () { node.getIObject('x', 2); }).should.throw();
    });

    it('getResource(oid, iid, rid) - so not bound', function () {
        (function () { node.getResource('x', 2, 0); }).should.throw();
    });

    it('getRootObject(oid) - bad argument', function () {
        node.bindSo(myso);
        (function () { node.getRootObject({}); }).should.throw();
        (function () { node.getRootObject([]); }).should.throw();
        (function () { node.getRootObject(true); }).should.throw();
        (function () { node.getRootObject(null); }).should.throw();
        (function () { node.getRootObject(); }).should.throw();
        (function () { node.getRootObject(1); }).should.not.throw();
    });

    it('getIObject(oid, iid) - bad argument', function () {
        (function () { node.getIObject(); }).should.throw();
        (function () { node.getIObject(1); }).should.throw();

        (function () { node.getIObject({}, 1); }).should.throw();
        (function () { node.getIObject([], 1); }).should.throw();
        (function () { node.getIObject(true, 1); }).should.throw();
        (function () { node.getIObject(null, 1); }).should.throw();

        (function () { node.getIObject(1, {}); }).should.throw();
        (function () { node.getIObject(1, []); }).should.throw();
        (function () { node.getIObject(1, true); }).should.throw();
        (function () { node.getIObject(1, null); }).should.throw();
        (function () { node.getIObject(1, 2); }).should.not.throw();
    });


    it('getResource(oid, iid, rid) - bad argument', function () {
        (function () { node.getResource(); }).should.throw();
        (function () { node.getResource(1); }).should.throw();
        (function () { node.getResource(1, 2); }).should.throw();

        (function () { node.getResource({}, 1, 2); }).should.throw();
        (function () { node.getResource([], 1, 2); }).should.throw();
        (function () { node.getResource(true, 1, 2); }).should.throw();
        (function () { node.getResource(null, 1, 2); }).should.throw();

        (function () { node.getResource(1, {}, 1); }).should.throw();
        (function () { node.getResource(1, [], 1); }).should.throw();
        (function () { node.getResource(1, true, 1); }).should.throw();
        (function () { node.getResource(1, null, 1); }).should.throw();

        (function () { node.getResource(1, 1, {}); }).should.throw();
        (function () { node.getResource(1, 1, []); }).should.throw();
        (function () { node.getResource(1, 1, true); }).should.throw();
        (function () { node.getResource(1, 1, null); }).should.throw();

        (function () { node.getResource(1, 2, 3); }).should.not.throw();
        (function () { node.getResource('f', 2, 'c'); }).should.not.throw();
    });

    it('dump() - no so', function () {
        node.so = null;
        (function () { node.dump(); }).should.throw();
        node.so = myso;
    });

    // enableLifeChecker(), disableLifeChecker() no arguments
    // dbRead(), dbSave(), dbRemove() no arguments
    // dump(), restore(), maintain() only a callback.... will throw if it is not a function

    // Asynchronous APIs
    it('readReq(path, callback) - bad path type', function (done) {
        node.readReq().fail(function (err) {
            done();
        });
    });

    it('readReq(path, callback) - no shepherd', function (done) {
        node.shepherd = null;
        node.readReq('x').fail(function (err) {
            done();
        });
        node.shepherd = fakeShp;
    });

    it('readReq(path, callback) - no so', function (done) {
        node.so = null;
        node.readReq('x').fail(function (err) {
            done();
        });
        node.so = myso;
    });

    it('writeReq(path, data, callback) - bad path type', function (done) {
        node.writeReq(3, 'data').fail(function (err) {
            done();
        });
    });

    it('writeReq() - no shepherd', function (done) {
        node.shepherd = null;
        node.writeReq('x', {}).fail(function (err) {
            done();
        });
        node.shepherd = fakeShp;
    });

    it('writeReq() - no so', function (done) {
        node.so = null;
        node.writeReq('x', {}).fail(function (err) {
            done();
        });
        node.so = myso;
    });

    it('writeReq(path, data, callback) - bad object', function (done) {
        node.writeReq('/', 'data').fail(function (err) {
            done();
        });
    });

    it('writeReq(path, data, callback) - bad object data', function (done) {
        node.writeReq('/x', 'data').fail(function (err) {
            done();
        });
    });

    it('writeReq(path, data, callback) - bad instance data', function (done) {
        node.writeReq('/x/2', 'data').fail(function (err) {
            done();
        });
    });

    it('discoverReq(path, callback) - bad path type', function (done) {
        node.discoverReq().fail(function (err) {
            done();
        });
    });

    it('discoverReq(path, callback) - no shepherd', function (done) {
        node.shepherd = null;
        node.discoverReq('x').fail(function (err) {
            done();
        });
        node.shepherd = fakeShp;
    });

    it('discoverReq(path, callback) - no so', function (done) {
        node.so = null;
        node.discoverReq('x').fail(function (err) {
            done();
        });
        node.so = myso;
    });

    it('writeAttrsReq(path, attrs, callback) - bad path type', function (done) {
        node.writeAttrsReq(3, 'data').fail(function (err) {
            done();
        });
    });

    it('writeAttrsReq(path, attrs, callback) - no shepherd', function (done) {
        node.shepherd = null;
        node.writeAttrsReq('x', {}).fail(function (err) {
            done();
        });
        node.shepherd = fakeShp;
    });

    it('writeAttrsReq(path, attrs, callback) - no so', function (done) {
        node.so = null;
        node.writeAttrsReq('x', {}).fail(function (err) {
            done();
        });
        node.so = myso;
    });

    it('writeAttrsReq(path, data, callback) - bad object data', function (done) {
        node.writeAttrsReq('/x', 'data').fail(function (err) {
            done();
        });
    });

    it('writeAttrsReq(path, data, callback) - bad instance data', function (done) {
        node.writeAttrsReq('/x/2', 'data').fail(function (err) {
            done();
        });
    });

    it('writeAttrsReq(path, data, callback) - bad resource data', function (done) {
        node.writeAttrsReq('/x/2/3', 'data').fail(function (err) {
            done();
        });
    });

    it('executeReq(path, callback) - bad path type', function (done) {
        node.executeReq().fail(function (err) {
            done();
        });
    });

    it('executeReq(path, callback) - no shepherd', function (done) {
        node.shepherd = null;
        node.executeReq('x').fail(function (err) {
            done();
        });
        node.shepherd = fakeShp;
    });

    it('executeReq(path, callback) - no so', function (done) {
        node.so = null;
        node.executeReq('x').fail(function (err) {
            done();
        });
        node.so = myso;
    });

    it('observeReq(path, callback) - bad path type', function (done) {
        node.observeReq().fail(function (err) {
            done();
        });
    });

    it('observeReq(path, callback) - no shepherd', function (done) {
        node.shepherd = null;
        node.observeReq('x').fail(function (err) {
            done();
        });
        node.shepherd = fakeShp;
    });

    it('observeReq(path, callback) - no so', function (done) {
        node.so = null;
        node.observeReq('x').fail(function (err) {
            done();
        });
        node.so = myso;
    });

    it('replaceObjectInstance(oid, iid, data, callback) - - no shepherd', function (done) {
        node.shepherd = null;
        node.replaceObjectInstance('x', 1, {}).fail(function (err) {
            done();
        });
        node.shepherd = fakeShp;
    });

    it('replaceObjectInstance(oid, iid, data, callback) - - no so', function (done) {
        node.so = null;
        node.replaceObjectInstance('x', 1, {}).fail(function (err) {
            done();
        });
        node.so = myso;
    });

    it('replaceObjectInstance(oid, iid, data, callback) - bad oid', function (done) {
        node.replaceObjectInstance([], 1, {}).fail(function (err) {
            done();
        });
    });

    it('replaceObjectInstance(oid, iid, data, callback) - bad iid', function (done) {
        node.replaceObjectInstance(1, {}, {}).fail(function (err) {
            done();
        });
    });

    it('replaceObjectInstance(oid, iid, data, callback) - bad data', function (done) {
        node.replaceObjectInstance(1, {}, 'xx').fail(function (err) {
            done();
        });
    });

    it('updateObjectInstance(oid, iid, data, callback) - - no shepherd', function (done) {
        node.shepherd = null;
        node.updateObjectInstance('x', 1, {}).fail(function (err) {
            done();
        });
        node.shepherd = fakeShp;
    });

    it('updateObjectInstance(oid, iid, data, callback) - - no so', function (done) {
        node.so = null;
        node.updateObjectInstance('x', 1, {}).fail(function (err) {
            done();
        });
        node.so = myso;
    });

    it('updateObjectInstance(oid, iid, data, callback) - bad oid', function (done) {
        node.updateObjectInstance([], 1, {}).fail(function (err) {
            done();
        });
    });

    it('updateObjectInstance(oid, iid, data, callback) - bad iid', function (done) {
        node.updateObjectInstance(1, {}, {}).fail(function (err) {
            done();
        });
    });

    it('updateObjectInstance(oid, iid, data, callback) - bad data', function (done) {
        node.updateObjectInstance(1, 2, 'xx').fail(function (err) {
            done();
        });
    });

    it('updateObjectInstance(oid, iid, data, callback) - bad data', function (done) {
        node.updateObjectInstance('y', 2, 'xx').fail(function (err) {
            done();
        });
    });
//
    it('updateResource(oid, iid, rid, data, callback) - - no shepherd', function (done) {
        node.shepherd = null;
        node.updateResource('x', 1, 1, {}).fail(function (err) {
            done();
        });
        node.shepherd = fakeShp;
    });

    it('updateResource() - - no so', function (done) {
        node.so = null;
        node.updateResource('x', 1, 1, 'ddd').fail(function (err) {
            done();
        });
        node.so = myso;
    });

    it('updateResource() - bad oid', function (done) {
        node.updateResource([], 1, 1, 'xxx').fail(function (err) {
            done();
        });
    });

    it('updateResource() - bad iid', function (done) {
        node.updateResource(1, {}, 1, 'xxxx').fail(function (err) {
            done();
        });
    });

    it('updateResource() - bad rid', function (done) {
        node.updateResource(1, 1, {}, 'xxxx').fail(function (err) {
            done();
        });
    });

    it('updateResource() - bad data', function (done) {
        node.updateResource(1, 2, 3).fail(function (err) {
            done();
        });
    });

    it('updateResource() - no oid', function (done) {
        node.updateResource(1, 0, 'z11', 'xxxx').fail(function (err) {
            done();
        });
    });

    it('updateResource() - no iid', function (done) {
        node.updateResource('z', 2, 'z11', 'xxxx').fail(function (err) {
            done();
        });
    });

    it('updateResource() - no rid', function (done) {
        node.updateResource('z', 1, 'z14', 'xxxx').fail(function (err) {
            done();
        });
    });

//
    it('updateAttrs(attrs, callback) - no shepherd', function (done) {
        node.shepherd = null;
        node.updateAttrs({}).fail(function (err) {
            done();
        });
        node.shepherd = fakeShp;
    });

    it('updateAttrs(attrs, callback) - no so', function (done) {
        node.so = null;
        node.updateAttrs({}).fail(function (err) {
            done();
        });
        node.so = myso;
    });

    it('updateAttrs(attrs, callback) - bad attrs', function (done) {
        node.updateAttrs('dd').fail(function (err) {
            done();
        });
    });
});

describe('Functional Check', function () {
    var nodex = new MqttNode(fakeShp, cId, devAttrs);

    it('bindSo()', function () {
        nodex.bindSo(myso).should.be.equal(nodex);
        nodex.so.should.be.equal(myso);
        myso.node.should.be.equal(nodex);
    });

    it('getRootObject(oid)', function () {
        should(nodex.getRootObject(100)).be.undefined();
        should(nodex.getRootObject('z')).be.eql({
            '0': { z11: 'hello', z12: 'world' },
            '1': { z11: 'hello', z12: 'world' }
        });
    });

    it('getIObject(oid, iid)', function () {
        should(nodex.getIObject(100, 3)).be.undefined();
        should(nodex.getIObject('y', 7)).be.undefined();
        should(nodex.getIObject('z', 1)).be.eql({ z11: 'hello', z12: 'world' });
        should(nodex.getIObject('z', '1')).be.eql({ z11: 'hello', z12: 'world' });
        should(nodex.getIObject('x', '0')).be.eql({ x1: 1, x2: 2 });
        should(nodex.getIObject('x', 0)).be.eql({ x1: 1, x2: 2 });
    });

    it('getResource(oid, iid, rid)', function () {
        should(nodex.getResource('y', 3, 'xq')).be.undefined();
        should(nodex.getResource('y', 2, 'y31')).be.undefined();
        should(nodex.getResource('xx', 3, 'y31')).be.undefined();
        should(nodex.getResource('y', 7, 'y31')).be.undefined();

        should(nodex.getResource('x', 0, 'x1')).be.eql(1);
        should(nodex.getResource('x', 0, 'x2')).be.eql(2);
        should(nodex.getResource('x', 1, 'y1')).be.eql(3);
        should(nodex.getResource('x', 1, 'y2')).be.eql(4);

        should(nodex.getResource('y', 3, 'y31')).be.eql('hi');
        should(nodex.getResource('y', 3, 'y31')).be.eql('hi');

        should(nodex.getResource('z', 0, 'z11')).be.eql('hello');
        should(nodex.getResource('z', 0, 'z12')).be.eql('world');
        should(nodex.getResource('z', 1, 'z11')).be.eql('hello');
        should(nodex.getResource('z', 1, 'z12')).be.eql('world');
    });

    it('enableLifeChecker()', function () {
        should(nodex.lifeChecker).be.null();
        should(nodex.enableLifeChecker()).be.equal(nodex);
        should(nodex.lifeChecker).not.be.null();
        should(nodex.lifeChecker).not.be.undefined();
    });

    it('disableLifeChecker()', function () {
        should(nodex.lifeChecker).not.be.null();
        should(nodex.disableLifeChecker()).be.equal(nodex);
        should(nodex.lifeChecker).be.null();
    });

    it('dump()', function () {
        var dumped = {
            clientId: cId,
            lifetime: devAttrs.lifetime,
            ip: devAttrs.ip,
            mac: devAttrs.mac,
            version: devAttrs.version,
            objList: {},
            so: {
                name: 'myso',
                x: smObj1.x,
                y: smObj2[0].y,
                z: smObj2[1].z
            }
        };

        should(nodex.dump()).be.eql(dumped);
    });

    it('dbSave()', function (done) {
        var dumped = {
            clientId: cId,
            lifetime: devAttrs.lifetime,
            ip: devAttrs.ip,
            mac: devAttrs.mac,
            version: devAttrs.version,
            objList: {},
            so: {
                name: 'myso',
                x: smObj1.x,
                y: smObj2[0].y,
                z: smObj2[1].z
            }
        };
        nodex.dbSave().done(function (data) {
            delete data._id;
            if (_.isEqual(data, dumped))
                done();
        }, function (err) {
            console.log(err);
        });
    });

    it('dbRead()', function (done) {
        var dumped = {
            clientId: cId,
            lifetime: devAttrs.lifetime,
            ip: devAttrs.ip,
            mac: devAttrs.mac,
            version: devAttrs.version,
            objList: {},
            so: {
                name: 'myso',
                x: smObj1.x,
                y: smObj2[0].y,
                z: smObj2[1].z
            }
        };
        nodex.dbRead().done(function (data) {
            if (_.isEqual(data, dumped))
                done();
        }, function (err) {
            console.log(err);
        });
    });

    it('dbRemove()', function (done) {
        nodex.dbRemove().done(function (num) {
            if (num === 1)
                done();
        }, function (err) {
            console.log(err);
        });
    });

    it('dbRemove() - nothing to remove', function (done) {
        nodex.dbRemove().done(function (num) {
            if (num === 0)
                done();
        }, function (err) {
            console.log(err);
        });
    });


    it('dbSave()', function (done) {
        nodex.dbSave().done(function (data) {
                done();
        }, function (err) {
            console.log(err);
        });
    });

    it('restore()', function (done) {
        var nodeCloned = new MqttNode(fakeShp, cId);
        nodeCloned.restore().done(function (node) {
            if (_.isEqual(node, nodex))
                done();
        }, function (err) {
            console.log(err);
        });
    });

    it('replaceObjectInstance(oid, iid, data)', function (done) {
        var newInst = { newY1: 100, newY2: 'hihi' },
            inst;
        nodex.replaceObjectInstance('y', 3, newInst).then(function (ninst) {
            inst = ninst;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.y[3], newInst) && _.isEqual(nodex.so.y[3], ndata.so.y[3]))
                done();
        }, function (err) {
            console.log(err);
        });
    });


    it('updateObjectInstance(oid, iid, data) - partial', function (done) {
        var newInst = { y1: 'hello', y2: 4 },
            diff;

        nodex.updateObjectInstance('x', 1, newInst).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.x[1], newInst) && _.isEqual(nodex.so.x[1], ndata.so.x[1]))
                if (_.isEqual(diff, { y1: 'hello' }))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    it('updateObjectInstance(oid, iid, data) - full update', function (done) {
        var newInst = { y1: 'world', y2: 1200 },
            diff;

        nodex.updateObjectInstance('x', 1, newInst).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.x[1], newInst) && _.isEqual(nodex.so.x[1], ndata.so.x[1]))
                if (_.isEqual(diff, { y1: 'world', y2: 1200  }))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    it('updateResource(oid, iid, rid, data, callback) - value/value', function (done) {
        var newVal = 'new value',
            diff;

        nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))
                if (_.isEqual(diff, newVal))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    it('updateResource(oid, iid, rid, data, callback) - value/object', function (done) {
        var newVal = { n1: 100, n2: 30 },
            diff;

        nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {

            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))
                if (_.isEqual(diff, newVal))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    it('updateResource(oid, iid, rid, data, callback) - object/object', function (done) {
        var newVal = { n1: 300, n2: 30 },
            diff;

        nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))
                if (_.isEqual(diff, { n1: 300 }))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    it('updateResource(oid, iid, rid, data, callback) - object/value', function (done) {
        var newVal = 'I am new value',
            diff;

        nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))

                if (_.isEqual(diff, newVal))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    it('updateResource(oid, iid, rid, data, callback) - value/object', function (done) {
        var newVal = { n1: 1, n2: 2, n3: { n31: 'hi', n32: 3 } },
            diff;

        nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {

            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))
                if (_.isEqual(diff, newVal))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    it('updateResource(oid, iid, rid, data, callback) - object/object', function (done) {
        var newVal = { n3: { n31: 'hello' } },
            diff;

        nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.z[0].z12, { n1: 1, n2: 2, n3: { n31: 'hello', n32: 3 } }) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))
                if (_.isEqual(diff, { n3: { n31: 'hello' } }))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    it('updateResource(oid, iid, rid, data, callback) - object/object', function (done) {
        var newVal = { n1: 1024, n3: { n31: 'world' } },
            diff;

        nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.z[0].z12, { n1: 1024, n2: 2, n3: { n31: 'world', n32: 3 } }) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))
                if (_.isEqual(diff, { n1: 1024, n3: { n31: 'world' } }))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    // { lifetime, ip, mac, version }
    it('updateAttrs(attrs, callback)', function (done) {
        var newAttrs = { lifetime: 1000, ip: '111.111.222.222' },
            diff;

        nodex.updateAttrs(newAttrs).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.lifetime, newAttrs.lifetime) && _.isEqual(nodex.ip, newAttrs.ip))
                done();
        }, function (err) {
            console.log(err);
        });
    });

    it('updateAttrs(attrs, callback)', function (done) {
        var newAttrs = { ip: '111.111.222.221' },
            diff;

        nodex.updateAttrs(newAttrs).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.ip, newAttrs.ip))
                done();
        }, function (err) {
            console.log(err);
        });
    });

    it('_checkAndUpdate(attrs, callback) - object', function (done) {
        var diff;
  
        nodex._checkAndUpdate('/y', { '3': { newY1: 999 } } ).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.y[3], { newY1: 999, newY2: 'hihi' }) && _.isEqual(nodex.so.y[3], ndata.so.y[3]))
                if (_.isEqual(diff, { '3': { newY1: 999 } }))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    it('_checkAndUpdate(attrs, callback) - object', function (done) {
        var diff;
  
        nodex._checkAndUpdate('/y', { '3': { newY1: 'hello', newY2: 'world' } } ).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.y[3], { newY1: 'hello', newY2: 'world' }) && _.isEqual(nodex.so.y[3], ndata.so.y[3]))
                if (_.isEqual(diff, { '3': { newY1: 'hello', newY2: 'world' } }))
                    done();
        }, function (err) {
            console.log(err);
        });
    });


    it('_checkAndUpdate(attrs, callback) - instance', function (done) {
        var diff;
  
        nodex._checkAndUpdate('/x/0', { x1: 1111 } ).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.x[0], { x1: 1111, x2: 2 }) && _.isEqual(nodex.so.x[0], ndata.so.x[0]))
                if (_.isEqual(diff, { x1: 1111 }))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    it('_checkAndUpdate(attrs, callback) - instance', function (done) {
        var diff;
  
        nodex._checkAndUpdate('/x/0', { x1: 'hi', x2: 'friend' } ).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.x[0], { x1: 'hi', x2: 'friend' }) && _.isEqual(nodex.so.x[0], ndata.so.x[0]))
                if (_.isEqual(diff, { x1: 'hi', x2: 'friend' }))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    it('_checkAndUpdate(attrs, callback) - resource', function (done) {
        var diff;
  
        nodex._checkAndUpdate('/z/1/z11', 'awesome' ).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.z[1].z11, 'awesome') && _.isEqual(nodex.so.z[1], ndata.so.z[1]))
                if (_.isEqual(diff, 'awesome'))
                    done();
        }, function (err) {
            console.log(err);
        });
    });

    it('_checkAndUpdate(attrs, callback) - resource', function (done) {
        var diff;
  
        nodex._checkAndUpdate('/z/1/z11', { a: 'amazing' } ).then(function (idiff) {
            diff = idiff;
            return nodex.dbRead();
        }).done(function (ndata) {
            if (_.isEqual(nodex.so.z[1].z11, { a: 'amazing' }) && _.isEqual(nodex.so.z[1], ndata.so.z[1]))
                if (_.isEqual(diff, { a: 'amazing' }))
                    done();
        }, function (err) {
            console.log(err);
        });
    });
});

// { name: 'myso',
//   y: { '3': { newY1: 100, newY2: 'hihi' } },
//   z: 
//    { '0': { z11: 'hello', z12: 'world' },
//      '1': { z11: 'hello', z12: 'world' } },
//   x: { '0': { x1: 1, x2: 2 }, '1': { y1: 3, y2: 4 } } }