var _ = require('busyman'),
    chai = require('chai'),
    expect = chai.expect;

var SO = require('../lib/components/smartobject');

describe('Signature Check', function () {
    var so = new SO();

    describe('#Constructor', function () {
        it("Aruguments no use, thus won't throw", function () {
            expect(function () { return new SO(); }).not.to.throw(Error);
            expect(function () { return new SO(2); }).not.to.throw(Error);
            expect(function () { return new SO([]); }).not.to.throw(Error);
            expect(function () { return new SO({}); }).not.to.throw(Error);
        });
    });

    describe('#.shoudaddObjects', function () {
        it('should throw if smObjs is not an object or an array', function () {
            expect(function () { so.addObjects(1); }).to.throw(Error);
            expect(function () { so.addObjects('xxx'); }).to.throw(Error);
            expect(function () { so.addObjects([]); }).not.to.throw(Error);
            expect(function () { so.addObjects({}); }).not.to.throw(Error);
        });
    });

    describe('#.addIObjects', function () {
        it('should throw if iObjs is not an object or an array', function () {
            expect(function () { so.addIObjects(1, []); }).not.to.throw(Error);
            expect(function () { so.addIObjects('1', {}); }).not.to.throw(Error);
            expect(function () { so.addIObjects(1, 1); }).to.throw(Error);
            expect(function () { so.addIObjects(1, 'xxx'); }).to.throw(Error);
            expect(function () { so.addIObjects(1); }).to.throw(Error);
            expect(function () { so.addIObjects(1, null); }).to.throw(Error);
        });
    });

    describe('#.addResources', function () {
        expect(function () { so.addResources(1, 20 ,[]); }).not.to.throw(Error);
        expect(function () { so.addResources('1', '20', {}); }).not.to.throw(Error);
        expect(function () { so.addResources(1, 20, 1); }).to.throw(Error);
        expect(function () { so.addResources(1, 20, 'xxx'); }).to.throw(Error);
        expect(function () { so.addResources(1, 20, null); }).to.throw(Error);
        expect(function () { so.addResources(1, 20); }).to.throw(Error);
        expect(function () { so.addResources(1); }).to.throw(Error);
        expect(function () { so.addResources(1, null); }).to.throw(Error);
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

    it('should be pass equality check - addObjects(smObjs)', function () {
        so.addObjects(smObj1);
        so.addObjects(smObj2);
        expect(so.x).to.deep.equal(smObj1.x);
        expect(so.y).to.deep.equal(smObj2[0].y);
    });

    it('should be pass equality check - addIObjects(oid, iObjs)', function () {
        so.addIObjects('new', iobj);
        expect(so.new).be.deep.equal(iobj);
    });

    it('should be pass equality check - addResources(oid, iid, rObjs)', function () {
        so.addResources('hiver', 3, resrc);
        so.addResources('hiver', 4, resrc1);
        so.addResources(3200, 0, { 5502: 1});
        expect(so.hiver[3]).be.deep.equal(resrc);
        expect(so.hiver[4]).be.deep.equal({
            'rx1': 10,
            'rx3': 600
        });
    });

    it('should be pass equality check - dump()', function () {
        expect(so.dump()).be.deep.equal({
            x: { '0': { x1: 1, x2: 2 }, '1': { y1: 3, y2: 4 } },
            y: { '3': { y31: 'hi' } },
            z: { '0': { z11: 'hello', z12: 'world' },
                 '1': { z11: 'hello', z12: 'world' } },
            'new': { '0': { ri1: 'hi' }, '1': { ri2: 100 } },
            hiver: { '3': { r1: 3, r2: 4 }, '4': { rx1: 10, rx3: 600 } },
            dIn: { '0' : { dInPolarity: 1 }}
        });
    });
});