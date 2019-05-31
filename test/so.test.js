/* eslint-env mocha */
const chai = require('chai')
const { expect } = chai
const SO = require('../lib/components/smartobject')

describe('Signature Check', () => {
  const so = new SO()

  describe('#Constructor', () => {
    it("Aruguments no use, thus won't throw", () => {
      expect(() => new SO()).not.to.throw(Error)
      expect(() => new SO(2)).not.to.throw(Error)
      expect(() => new SO([])).not.to.throw(Error)
      expect(() => new SO({})).not.to.throw(Error)
    })
  })

  describe('#.shoudaddObjects', () => {
    it('should throw if smObjs is not an object', () => {
      expect(() => { so.addObjects(1) }).to.throw(TypeError)
      expect(() => { so.addObjects('xxx') }).to.throw(TypeError)
      expect(() => { so.addObjects([]) }).to.throw(TypeError)
      expect(() => { so.addObjects({}) }).not.to.throw(Error)
    })
  })

  describe('#.addIObjects', () => {
    it('should throw if iObjs is not an object', () => {
      expect(() => { so.addIObjects(1, []) }).to.throw(TypeError)
      expect(() => { so.addIObjects(1, 1) }).to.throw(TypeError)
      expect(() => { so.addIObjects(1, 'xxx') }).to.throw(TypeError)
      expect(() => { so.addIObjects(1) }).to.throw(TypeError)
      expect(() => { so.addIObjects(1, null) }).to.throw(TypeError)

      expect(() => { so.addIObjects('1', {}) }).not.to.throw(Error)
    })
  })

  describe('#.init', () => {
    it('should throw if resources is not an object', () => {
      expect(() => { so.init(1, 20, []) }).to.throw(TypeError)
      expect(() => { so.init(1, 20, 1) }).to.throw(TypeError)
      expect(() => { so.init(1, 20, 'xxx') }).to.throw(TypeError)
      expect(() => { so.init(1, 20, null) }).to.throw(TypeError)
      expect(() => { so.init(1, 20) }).to.throw(TypeError)
      expect(() => { so.init(1) }).to.throw(TypeError)
      expect(() => { so.init(1, null) }).to.throw(TypeError)

      expect(() => { so.init('1', '20', {}) }).not.to.throw(Error)
    })
  })
})

describe('Functional Check', () => {
  const so = new SO()
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
  // smObj2 = [ { 'y': { 3: { 'y31': 'hi' }} }, { 'z': { 1: { 'z11': 'hello', 'z12': 'world' }, 0: { 'z11': 'hello', 'z12': 'world' }} } ],
  const smObj2 = {
    y: {
      3: {
        y31: 'hi'
      }
    },
    z: {
      0: { z11: 'hello', z12: 'world' },
      1: { z11: 'hello', z12: 'world' }
    }
  }
  const iobj = {
    0: {
      ri1: 'hi'
    },
    1: {
      ri2: 100
    }
  }
  const resrc = {
    r1: 3,
    r2: 4
  }
  const resrc1 = {
    rx1: 10,
    rx3: 600
  }

  it('should be pass equality check - addObjects(smObjs)', () => {
    so.addObjects(smObj1)
    so.addObjects(smObj2)

    expect(so.dumpSync('x')).to.deep.equal(smObj1.x)
    expect(so.dumpSync('y')).to.deep.equal(smObj2.y)
  })

  it('should be pass equality check - addIObjects(oid, iObjs)', () => {
    so.addIObjects('new', iobj)
    expect(so.dumpSync('new')).be.deep.equal(iobj)
  })

  it('should be pass equality check - init(oid, iid, rObjs)', () => {
    so.init('hiver', 3, resrc)
    so.init('hiver', 4, resrc1)
    so.init(3200, 0, { 5502: 1 })

    expect(so.dumpSync('hiver', 3)).be.deep.equal(resrc)
    expect(so.dumpSync('hiver', 4)).be.deep.equal({ rx1: 10, rx3: 600 })
  })

  it('should be pass equality check - dumpSync()', () => {
    expect(so.dumpSync()).be.deep.equal({
      x: { 0: { x1: 1, x2: 2 }, 1: { y1: 3, y2: 4 } },
      y: { 3: { y31: 'hi' } },
      z: {
        0: { z11: 'hello', z12: 'world' },
        1: { z11: 'hello', z12: 'world' }
      },
      new: { 0: { ri1: 'hi' }, 1: { ri2: 100 } },
      hiver: { 3: { r1: 3, r2: 4 }, 4: { rx1: 10, rx3: 600 } },
      dIn: { 0: { dInPolarity: 1 } }
    })
  })
})
