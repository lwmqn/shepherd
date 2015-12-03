var should = require('should'),
    SO = require('../smartobject');

describe('Constructor Check', function () {
    var so = new SO('myso');

    it('name and node', function () {
        should(so.name).be.eql('myso');
        should(so.node).be.eql(null);
    });
});


describe('Signature Check', function () {
    var so = new SO('myso');

    it('Constructor', function () {
        (function () { return new SO(); }).should.not.throw();
        (function () { return new SO(2); }).should.throw();
        (function () { return new SO([]); }).should.throw();
        (function () { return new SO({}); }).should.throw();
    });

    it('addObjects(smObjs)', function () {
        (function () { so.addObjects(1); }).should.throw();
        (function () { so.addObjects('xxx'); }).should.throw();
        (function () { so.addObjects([]); }).should.not.throw();
        (function () { so.addObjects({}); }).should.not.throw();
    });

    it('addIObjects(iObjs)', function () {
        (function () { so.addIObjects(1, []); }).should.not.throw();
        (function () { so.addIObjects('1', {}); }).should.not.throw();
        (function () { so.addIObjects(1, 1); }).should.throw();
        (function () { so.addIObjects(1, 'xxx'); }).should.throw();
        (function () { so.addIObjects(1); }).should.throw();
        (function () { so.addIObjects(1, null); }).should.throw();
    });

    it('addResources(oid, iid, rObjs)', function () {
        (function () { so.addResources(1, 20 ,[]); }).should.not.throw();
        (function () { so.addResources('1', '20', {}); }).should.not.throw();
        (function () { so.addResources(1, 20, 1); }).should.throw();
        (function () { so.addResources(1, 20, 'xxx'); }).should.throw();
        (function () { so.addResources(1, 20, null); }).should.throw();
        (function () { so.addResources(1, 20); }).should.throw();
        (function () { so.addResources(1); }).should.throw();
        (function () { so.addResources(1, null); }).should.throw();
    });
});

describe('Functional Check', function () {
    var so = new SO('myso'),
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
        smObj2 = [ { 'y': { 3: { 'y31': 'hi' }} }, { 'z': { 1: { 'z11': 'hello', 'z12': 'world' }, 0: { 'z11': 'hello', 'z12': 'world' }} } ],
        iobj = {
            0: {
                'ri1': 'hi'
            },
            1: {
                'ri2': 100
            }
        },
        resrc = {
            'r1': 3,
            'r2': 4
        },
        resrc1 = [{ 'rx1': 10}, {'rx3': 600}];

    it('addObjects(smObjs)', function () {
        so.addObjects(smObj1);
        so.addObjects(smObj2);
        should(so.x).be.eql(smObj1.x);
        should(so.y).be.eql(smObj2[0].y);
    });

    it('addIObjects(oid, iObjs)', function () {
        so.addIObjects('new', iobj);
        should(so.new).be.eql(iobj);
    });

    it('addResources(oid, iid, rObjs)', function () {
        so.addResources('hiver', 3, resrc);
        so.addResources('hiver', 4, resrc1);
        so.addResources(3200, 0, { 5502: 1});
        should(so.hiver[3]).be.eql(resrc);
        should(so.hiver[4]).be.eql({
            'rx1': 10,
            'rx3': 600
        });
    });

    it('dump()', function () {
        should(so.dump()).be.eql({
            name: 'myso',
            x: { '0': { x1: 1, x2: 2 }, '1': { y1: 3, y2: 4 } },
            y: { '3': { y31: 'hi' } },
            z: { '0': { z11: 'hello', z12: 'world' },
                 '1': { z11: 'hello', z12: 'world' } },
            'new': { '0': { ri1: 'hi' }, '1': { ri2: 100 } },
            hiver: { '3': { r1: 3, r2: 4 }, '4': { rx1: 10, rx3: 600 } },
            digitalInput: { '0' : { dInPolarity: 1 }}
        });
    });
});