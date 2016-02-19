var should = require('should'),
    mutils = require('../utils/mutils');

describe('Signature Check', function () {
    it('jsonify', function () {
        (function () { mutils.jsonify('x'); }).should.not.throw();
        (function () { mutils.jsonify(5); }).should.not.throw();
        (function () { mutils.jsonify({ a: '55' }); }).should.not.throw();
        (function () { mutils.jsonify([ { a: '55' } ]); }).should.not.throw();
    });

    it('getCmd', function () {
        (function () { mutils.getCmd('x'); }).should.not.throw();
        (function () { mutils.getCmd(5); }).should.not.throw();
        (function () { mutils.getCmd({}); }).should.throw();
        (function () { mutils.getCmd([]); }).should.throw();
        (function () { mutils.getCmd(); }).should.throw();
    });

    it('getRspCode', function () {
        (function () { mutils.getRspCode('x'); }).should.not.throw();
        (function () { mutils.getRspCode(5); }).should.not.throw();
        (function () { mutils.getRspCode({}); }).should.throw();
        (function () { mutils.getRspCode([]); }).should.throw();
        (function () { mutils.getRspCode(); }).should.throw();
    });

    it('getOid', function () {
        (function () { mutils.getOid('x'); }).should.not.throw();
        (function () { mutils.getOid(5); }).should.not.throw();
        (function () { mutils.getOid({}); }).should.throw();
        (function () { mutils.getOid([]); }).should.throw();
        (function () { mutils.getOid(); }).should.throw();
    });

    it('getRid', function () {
        (function () { mutils.getRid('x', 'y'); }).should.not.throw();
        (function () { mutils.getRid(5, 'y'); }).should.not.throw();
        (function () { mutils.getRid('x', 5); }).should.not.throw();
        (function () { mutils.getRid(1, 5); }).should.not.throw();
        (function () { mutils.getRid({}, 'x'); }).should.throw();
        (function () { mutils.getRid([], 'x'); }).should.throw();
        (function () { mutils.getRid('x', []); }).should.throw();
        (function () { mutils.getRid('x', {}); }).should.throw();
        (function () { mutils.getRid(); }).should.throw();
    });

    it('oidKey', function () {
        (function () { mutils.oidKey('x'); }).should.not.throw();
        (function () { mutils.oidKey(5); }).should.not.throw();
        (function () { mutils.oidKey({}); }).should.throw();
        (function () { mutils.oidKey([]); }).should.throw();
        (function () { mutils.oidKey(); }).should.throw();
    });

    it('oidNum', function () {
        (function () { mutils.oidNum('x'); }).should.not.throw();
        (function () { mutils.oidNum(5); }).should.not.throw();
        (function () { mutils.oidNum({}); }).should.throw();
        (function () { mutils.oidNum([]); }).should.throw();
        (function () { mutils.oidNum(); }).should.throw();
    });

    it('ridKey', function () {
        (function () { mutils.ridKey('x', 'y'); }).should.not.throw();
        (function () { mutils.ridKey(5, 'y'); }).should.not.throw();
        (function () { mutils.ridKey('x', 5); }).should.not.throw();
        (function () { mutils.ridKey(1, 5); }).should.not.throw();
        (function () { mutils.ridKey({}, 'x'); }).should.throw();
        (function () { mutils.ridKey([], 'x'); }).should.throw();
        (function () { mutils.ridKey('x', []); }).should.throw();
        (function () { mutils.ridKey('x', {}); }).should.throw();
        (function () { mutils.ridKey(); }).should.throw();
    });

    it('ridNum', function () {
        (function () { mutils.ridNum('x', 'y'); }).should.not.throw();
        (function () { mutils.ridNum(5, 'y'); }).should.not.throw();
        (function () { mutils.ridNum('x', 5); }).should.not.throw();
        (function () { mutils.ridNum(1, 5); }).should.not.throw();
        (function () { mutils.ridNum({}, 'x'); }).should.throw();
        (function () { mutils.ridNum([], 'x'); }).should.throw();
        (function () { mutils.ridNum('x', []); }).should.throw();
        (function () { mutils.ridNum('x', {}); }).should.throw();
        (function () { mutils.ridNum(); }).should.throw();
    });

    it('getSpecificResrcChar', function () {
        (function () { mutils.getSpecificResrcChar('x', 'y'); }).should.not.throw();
        (function () { mutils.getSpecificResrcChar(5, 'y'); }).should.not.throw();
        (function () { mutils.getSpecificResrcChar('x', 5); }).should.not.throw();
        (function () { mutils.getSpecificResrcChar(1, 5); }).should.not.throw();
        (function () { mutils.getSpecificResrcChar({}, 'x'); }).should.throw();
        (function () { mutils.getSpecificResrcChar([], 'x'); }).should.throw();
        (function () { mutils.getSpecificResrcChar('x', []); }).should.throw();
        (function () { mutils.getSpecificResrcChar('x', {}); }).should.throw();
        (function () { mutils.getSpecificResrcChar(); }).should.throw();
    });

    it('dotPath', function () {
        (function () { mutils.dotPath('xyz'); }).should.not.throw();
        (function () { mutils.dotPath(5); }).should.throw();
        (function () { mutils.dotPath({}); }).should.throw();
        (function () { mutils.dotPath([]); }).should.throw();
        (function () { mutils.dotPath(); }).should.throw();
    });

    it('slashPath', function () {
        (function () { mutils.slashPath('xyz'); }).should.not.throw();
        (function () { mutils.slashPath(5); }).should.throw();
        (function () { mutils.slashPath({}); }).should.throw();
        (function () { mutils.slashPath([]); }).should.throw();
        (function () { mutils.slashPath(); }).should.throw();
    });

    it('pathItems', function () {
        (function () { mutils.pathItems('xyz'); }).should.not.throw();
        (function () { mutils.pathItems(5); }).should.throw();
        (function () { mutils.pathItems({}); }).should.throw();
        (function () { mutils.pathItems([]); }).should.throw();
        (function () { mutils.pathItems(); }).should.throw();
    });

    it('buildPathValuePairs(rootPath, obj)', function () {
        (function () { mutils.buildPathValuePairs('/xyz', { a: { b: 1 } }); }).should.not.throw();
        (function () { mutils.buildPathValuePairs(3, { a: { b: 1 } }); }).should.throw();
        (function () { mutils.buildPathValuePairs([], { a: { b: 1 } }); }).should.throw();
        (function () { mutils.buildPathValuePairs({}, { a: { b: 1 } }); }).should.throw();
        (function () { mutils.buildPathValuePairs(undefined, { a: { b: 1 } }); }).should.throw();
        (function () { mutils.buildPathValuePairs(null, { a: { b: 1 } }); }).should.throw();
    });

    it('turnPathToReqArgs(path, clientId, data, callback)', function () {
        (function () { mutils.turnPathToReqArgs('a/b/c', 'test_id', 1); }).should.not.throw();
        (function () { mutils.turnPathToReqArgs('a/b/', 'test_id', 2); }).should.not.throw();
        (function () { mutils.turnPathToReqArgs('a', 'test_id', 3); }).should.not.throw();
        (function () { mutils.turnPathToReqArgs('a/b/c/d', 'test_id', 4); }).should.throw();
        (function () { mutils.turnPathToReqArgs(undefined, 'test_id', 3); }).should.throw();
        (function () { mutils.turnPathToReqArgs('a', 100, 3); }).should.not.throw();
        (function () { mutils.turnPathToReqArgs('a/b/', 'test_id'); }).should.not.throw();
    });
});

describe('Functional Check', function () {
    var obj1 = { x: 'y' },
        obj2 = [ obj1 ];

    it('jsonify', function () {
        should(mutils.jsonify()).be.undefined();
        should(mutils.jsonify('x')).be.undefined();
        should(mutils.jsonify(3)).be.eql(3);
        should(mutils.jsonify("[1, 2]")).be.eql([1, 2]);
        should(mutils.jsonify(JSON.stringify(obj1))).be.eql(obj1);
        should(mutils.jsonify(JSON.stringify(obj2))).be.eql(obj2);
    });

    it('getCmd', function () {
        should(mutils.getCmd('x')).be.undefined();
        should(mutils.getCmd(100)).be.undefined();
        should(mutils.getCmd(3).key).be.eql('writeAttrs');
        should(mutils.getCmd('writeAttrs').value).be.eql(3);
    });

    it('getRspCode', function () {
        should(mutils.getRspCode('x')).be.undefined();
        should(mutils.getRspCode(100)).be.undefined();
        should(mutils.getRspCode(204).key).be.eql('Changed');
        should(mutils.getRspCode('Changed').value).be.eql(204);
    });

    it('getOid', function () {
        should(mutils.getOid('x')).be.undefined();
        should(mutils.getOid(9999)).be.undefined();
        should(mutils.getOid(2051).key).be.eql('cmdhDefEcValues');
        should(mutils.getOid('cmdhDefEcValues').value).be.eql(2051);
    });

    it('getRid', function () {
        should(mutils.getRid('x', 1)).be.undefined();
        should(mutils.getRid('x', 1)).be.undefined();
        should(mutils.getRid(9999)).be.undefined();
        should(mutils.getRid(9999, 1)).be.undefined();
        should(mutils.getRid(1, 9999)).be.undefined();
        should(mutils.getRid(1, 'xxx')).be.undefined();

        should(mutils.getRid(5602).key).be.eql('maxMeaValue');
        should(mutils.getRid('5602').key).be.eql('maxMeaValue');
        should(mutils.getRid('maxMeaValue').value).be.eql(5602);
        should(mutils.getRid('lwm2mServer', 5).key).be.eql('disableTimeout');
        should(mutils.getRid('lwm2mServer', '5').key).be.eql('disableTimeout');
        should(mutils.getRid(1, 5).key).be.eql('disableTimeout');
        should(mutils.getRid(1, '5').key).be.eql('disableTimeout');
        should(mutils.getRid(1, 'disableTimeout').value).be.eql(5);
        should(mutils.getRid('1', 'disableTimeout').value).be.eql(5);
    });

    it('oidKey', function () {
        should(mutils.oidKey('x')).be.eql('x');
        should(mutils.oidKey(9999)).be.eql(9999);
        should(mutils.oidKey(2051)).be.eql('cmdhDefEcValues');
        should(mutils.oidKey('2051')).be.eql('cmdhDefEcValues');
        should(mutils.oidKey('cmdhDefEcValues')).be.eql('cmdhDefEcValues');
    });

    it('oidNum', function () {
        should(mutils.oidNum('x')).be.eql(NaN);
        should(mutils.oidNum(9999)).be.eql(9999);
        should(mutils.oidNum(2051)).be.eql(2051);
        should(mutils.oidNum('2051')).be.eql(2051);
        should(mutils.oidNum('cmdhDefEcValues')).be.eql(2051);
    });

    it('ridKey', function () {
        should(mutils.ridKey('x', 1)).be.eql(1);
        should(mutils.ridKey('x', 1)).be.eql(1);
        should(mutils.ridKey(9999)).be.eql(9999);
        should(mutils.ridKey(9999, 1)).be.eql(1);
        should(mutils.ridKey(1, 9999)).be.eql(9999);
        should(mutils.ridKey(1, 'xxx')).be.eql('xxx');

        should(mutils.ridKey(5602)).be.eql('maxMeaValue');
        should(mutils.ridKey('5602')).be.eql('maxMeaValue');
        should(mutils.ridKey('maxMeaValue')).be.eql('maxMeaValue');
        should(mutils.ridKey('lwm2mServer', 5)).be.eql('disableTimeout');
        should(mutils.ridKey('lwm2mServer', '5')).be.eql('disableTimeout');
        should(mutils.ridKey(1, 5)).be.eql('disableTimeout');
        should(mutils.ridKey(1, '5')).be.eql('disableTimeout');
        should(mutils.ridKey(1, 'disableTimeout')).be.eql('disableTimeout');
        should(mutils.ridKey('1', 'disableTimeout')).be.eql('disableTimeout');
    });

    it('ridNum', function () {
        should(mutils.ridNum('x', 1)).be.eql(1);
        should(mutils.ridNum('x', 1)).be.eql(1);
        should(mutils.ridNum(9999)).be.eql(9999);
        should(mutils.ridNum(9999, 1)).be.eql(1);
        should(mutils.ridNum(1, 9999)).be.eql(9999);
        should(mutils.ridNum(1, 'xxx')).be.eql(NaN);

        should(mutils.ridNum(5602)).be.eql(5602);
        should(mutils.ridNum('5602')).be.eql(5602);
        should(mutils.ridNum('maxMeaValue')).be.eql(5602);
        should(mutils.ridNum('lwm2mServer', 5)).be.eql(5);
        should(mutils.ridNum('lwm2mServer', '5')).be.eql(5);
        should(mutils.ridNum(1, 5)).be.eql(5);
        should(mutils.ridNum(1, '5')).be.eql(5);
        should(mutils.ridNum(1, 'disableTimeout')).be.eql(5);
        should(mutils.ridNum('1', 'disableTimeout')).be.eql(5);
    });

    it('getSpecificResrcChar', function () {
        var checkChar = { "access": "R", "multi": false, "mand": true, "type": "interger", "range": 65535, "init": 1 };
        should(mutils.getSpecificResrcChar('x')).be.undefined();
        should(mutils.getSpecificResrcChar('x')).be.undefined();
        should(mutils.getSpecificResrcChar(9999)).be.undefined();
        should(mutils.getSpecificResrcChar(9999)).be.undefined();
        should(mutils.getSpecificResrcChar(1)).be.undefined();
        should(mutils.getSpecificResrcChar(1)).be.undefined();

        should(mutils.getSpecificResrcChar('x', 1)).be.undefined();
        should(mutils.getSpecificResrcChar('x', 1)).be.undefined();
        should(mutils.getSpecificResrcChar(9999)).be.undefined();
        should(mutils.getSpecificResrcChar(9999, 1)).be.undefined();
        should(mutils.getSpecificResrcChar(1, 9999)).be.undefined();
        should(mutils.getSpecificResrcChar(1, 'xxx')).be.undefined();

        should(mutils.getSpecificResrcChar('device')).be.undefined();
        should(mutils.getSpecificResrcChar(3)).be.undefined();
        should(mutils.getSpecificResrcChar('3')).be.undefined();

        should(mutils.getSpecificResrcChar('lwm2mServer', 'shortServerId')).be.eql(checkChar);
        should(mutils.getSpecificResrcChar('lwm2mServer', 0)).be.eql(checkChar);
        should(mutils.getSpecificResrcChar('lwm2mServer', '0')).be.eql(checkChar);
        should(mutils.getSpecificResrcChar(1, 'shortServerId')).be.eql(checkChar);
        should(mutils.getSpecificResrcChar(1, 0)).be.eql(checkChar);
        should(mutils.getSpecificResrcChar(1, '0')).be.eql(checkChar);
        should(mutils.getSpecificResrcChar('1', 'shortServerId')).be.eql(checkChar);
        should(mutils.getSpecificResrcChar('1', 0)).be.eql(checkChar);
        should(mutils.getSpecificResrcChar('1', '0')).be.eql(checkChar);
    });

    it('dotPath', function () {
        should(mutils.dotPath('.x.y.z')).be.eql('x.y.z');
        should(mutils.dotPath('x.y.z.')).be.eql('x.y.z');
        should(mutils.dotPath('/x.y.z.')).be.eql('x.y.z');
        should(mutils.dotPath('/x.y/z.')).be.eql('x.y.z');
        should(mutils.dotPath('/x/y/z')).be.eql('x.y.z');
        should(mutils.dotPath('x/y/z/')).be.eql('x.y.z');
        should(mutils.dotPath('/x.y/z.')).be.eql('x.y.z');
        should(mutils.dotPath('/x.y/z/')).be.eql('x.y.z');
    });

    it('slashPath', function () {
        should(mutils.slashPath('.x.y.z')).be.eql('x/y/z');
        should(mutils.slashPath('x.y.z.')).be.eql('x/y/z');
        should(mutils.slashPath('/x.y.z.')).be.eql('x/y/z');
        should(mutils.slashPath('/x.y/z.')).be.eql('x/y/z');
        should(mutils.slashPath('/x/y/z')).be.eql('x/y/z');
        should(mutils.slashPath('x/y/z/')).be.eql('x/y/z');
        should(mutils.slashPath('/x.y/z.')).be.eql('x/y/z');
        should(mutils.slashPath('/x.y/z/')).be.eql('x/y/z');
    });

    it('pathItems', function () {
        should(mutils.pathItems('.x.y.z')).be.eql(['x', 'y', 'z']);
        should(mutils.pathItems('x.y.z.')).be.eql(['x', 'y', 'z']);
        should(mutils.pathItems('/x.y.z.')).be.eql(['x', 'y', 'z']);
        should(mutils.pathItems('/x.y/z.')).be.eql(['x', 'y', 'z']);
        should(mutils.pathItems('/x/y/z')).be.eql(['x', 'y', 'z']);
        should(mutils.pathItems('x/y/z/')).be.eql(['x', 'y', 'z']);
        should(mutils.pathItems('/x.y/z.')).be.eql(['x', 'y', 'z']);
        should(mutils.pathItems('/x.y/z/')).be.eql(['x', 'y', 'z']);
    });

    it('buildPathValuePairs(rootPath, obj)', function () {
        should(mutils.buildPathValuePairs('/x/y/z', { a: { b: 3 } })).be.eql({ 'x.y.z.a.b': 3});
        should(mutils.buildPathValuePairs('/x/y/z', 3)).be.eql({ 'x.y.z': 3});
        should(mutils.buildPathValuePairs('/x/y/z', 'hello.world')).be.eql({ 'x.y.z': 'hello.world'});
        should(mutils.buildPathValuePairs('/x/y/z', [3, 2, 1])).be.eql({ 'x.y.z.0':3, 'x.y.z.1':2, 'x.y.z.2':1 });
        should(mutils.buildPathValuePairs('/x/y/z', [{ m: 3}, {m: 2}])).be.eql({ 'x.y.z.0.m': 3, 'x.y.z.1.m': 2 });
    });

    it('turnPathToReqArgs(path, clientId, data, callback)', function () {
        var cb = function () {};
        should(mutils.turnPathToReqArgs('/x/y/z', 'test_id', 100)).be.eql([ 'test_id', { oid: 'x', iid: 'y', rid: 'z', data: 100 } ]);
        should(mutils.turnPathToReqArgs('x/y/z', 'test_id', 200, cb)).be.eql([ 'test_id', { oid: 'x', iid: 'y', rid: 'z', data: 200 }, cb ]);
        should(mutils.turnPathToReqArgs('/x/y/z/', 'test_id', cb)).be.eql([ 'test_id', { oid: 'x', iid: 'y', rid: 'z' }, cb ]);
        should(mutils.turnPathToReqArgs('/x/y/z', 'test_id', { x: 3 }, cb)).be.eql([ 'test_id', { oid: 'x', iid: 'y', rid: 'z', data: { x: 3 } }, cb ]);

        should(mutils.turnPathToReqArgs('/x/y/', 'test_id', 100)).be.eql([ 'test_id', { oid: 'x', iid: 'y', data: 100 } ]);
        should(mutils.turnPathToReqArgs('/x/y', 'test_id', 200, cb)).be.eql([ 'test_id', { oid: 'x', iid: 'y', data: 200 }, cb ]);
        should(mutils.turnPathToReqArgs('x/y/', 'test_id', cb)).be.eql([ 'test_id', { oid: 'x', iid: 'y' }, cb ]);
        should(mutils.turnPathToReqArgs('x/y', 'test_id', { x: 3 }, cb)).be.eql([ 'test_id', { oid: 'x', iid: 'y', data: { x: 3 } }, cb ]);

        should(mutils.turnPathToReqArgs('/x/', 'test_id', 100)).be.eql([ 'test_id', { oid: 'x', data: 100 } ]);
        should(mutils.turnPathToReqArgs('x/', 'test_id', 200, cb)).be.eql([ 'test_id', { oid: 'x', data: 200 }, cb ]);
        should(mutils.turnPathToReqArgs('x', 'test_id', cb)).be.eql([ 'test_id', { oid: 'x' }, cb ]);
        should(mutils.turnPathToReqArgs('x', 'test_id', { x: 3 }, cb)).be.eql([ 'test_id', { oid: 'x', data: { x: 3 } }, cb ]);
    });
});