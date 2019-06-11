/* eslint-env mocha */
const assert = require('assert')
const SO = require('../../lib/components/smartobject')

describe('Signature Check', () => {
  const so = new SO()

  describe('#Constructor', () => {
    it("Aruguments no use, thus won't throw", () => {
      assert.doesNotThrow(() => new SO(), Error)
      assert.doesNotThrow(() => new SO(2), Error)
      assert.doesNotThrow(() => new SO([]), Error)
      assert.doesNotThrow(() => new SO({}), Error)
    })
  })

  describe('#.shoudaddObjects', () => {
    it('should throw if smObjs is not an object', () => {
      assert.throws(() => { so.addObjects(1) }, TypeError)
      assert.throws(() => { so.addObjects('xxx') }, TypeError)
      assert.throws(() => { so.addObjects([]) }, TypeError)

      assert.doesNotThrow(() => { so.addObjects({}) }, Error)
    })
  })

  describe('#.addIObjects', () => {
    it('should throw if iObjs is not an object', () => {
      assert.throws(() => { so.addIObjects(1, []) }, TypeError)
      assert.throws(() => { so.addIObjects(1, 1) }, TypeError)
      assert.throws(() => { so.addIObjects(1, 'xxx') }, TypeError)
      assert.throws(() => { so.addIObjects(1) }, TypeError)
      assert.throws(() => { so.addIObjects(1, null) }, TypeError)

      assert.doesNotThrow(() => { so.addIObjects('1', {}) }, Error)
    })
  })

  describe('#.init', () => {
    it('should throw if resources is not an object', () => {
      assert.throws(() => { so.init(1, 20, []) }, TypeError)
      assert.throws(() => { so.init(1, 20, 1) }, TypeError)
      assert.throws(() => { so.init(1, 20, 'xxx') }, TypeError)
      assert.throws(() => { so.init(1, 20, null) }, TypeError)
      assert.throws(() => { so.init(1, 20) }, TypeError)
      assert.throws(() => { so.init(1) }, TypeError)
      assert.throws(() => { so.init(1, null) }, TypeError)

      assert.doesNotThrow(() => { so.init('1', '20', {}) }, Error)
    })
  })
})

describe('smartobject -> Functional Check', () => {
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

    assert.deepStrictEqual(so.dumpSync('x'), smObj1.x)
    assert.deepStrictEqual(so.dumpSync('y'), smObj2.y)
  })

  it('should be pass equality check - addIObjects(oid, iObjs)', () => {
    so.addIObjects('new', iobj)
    assert.deepStrictEqual(so.dumpSync('new'), iobj)
  })

  it('should be pass equality check - init(oid, iid, rObjs)', () => {
    so.init('hiver', 3, resrc)
    so.init('hiver', 4, resrc1)
    so.init(3200, 0, { 5502: 1 })

    assert.deepStrictEqual(so.dumpSync('hiver', 3), resrc)
    assert.deepStrictEqual(so.dumpSync('hiver', 4), { rx1: 10, rx3: 600 })
  })

  it('should be pass equality check - dumpSync()', () => {
    assert.deepStrictEqual(so.dumpSync(), {
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
