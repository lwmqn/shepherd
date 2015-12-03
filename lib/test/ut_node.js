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

var fakeShp = {};
        var node = new MqttNode(fakeShp, cId, devAttrs);

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
        var node = new MqttNode(fakeShp, cId, devAttrs);
        (function () { node.bindSo(); }).should.throw();
        (function () { node.bindSo('x'); }).should.throw();
        (function () { node.bindSo(2); }).should.throw();
        (function () { node.bindSo(null); }).should.throw();
        (function () { node.bindSo(false); }).should.throw();
        (function () { node.bindSo([]); }).should.throw();
        (function () { node.bindSo({}); }).should.throw();
    });

    it('updateObjectInstance(oid, iid, data, callback)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);
        node.updateObjectInstance(0, 0, {});
        // node.updateObjectInstance(0, 0, {}).then(function (data) {
        //     if (_.isEqual({}, data))
        //         done();
        // });
    });

    it('updateResource(oid, iid, rid, data, callback)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);

    });

    it('updateAttrs(attrs, callback)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);

    });

    it('_checkAndUpdate(path, data, callback)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);

    });

    it('readReq(path, callback)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);

    });


    it('writeReq(path, data, callback)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);

    });

    it('discoverReq(path, callback)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);

    });

    it('writeAttrsReq(path, attrs, callback)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);

    });

    it('executeReq(path, callback)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);

    });

    it('observeReq(path, callback)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);

    });

    it('addObjects(smObj)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);

    });

    it('addInstances(oid, iObj)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);

    });

    it('addResources(oid, iid, rObjs)', function () {
        var node = new MqttNode(fakeShp, cId, devAttrs);

    });
});
