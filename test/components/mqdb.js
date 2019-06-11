/* eslint-env mocha */
const _ = require('busyman')
const fs = require('fs')
const path = require('path')
const Mqdb = require('../../lib/components/mqdb')

const nodeMock1 = {
  clientId: 'mock01',
  lifetime: 1200,
  ip: '192.168.1.100',
  mac: '11:22:33:44:55:66',
  version: '0.0.1',
  device: { 0: { manuf: 'sivann', model: 'fake01' } },
  connMonitor: { 0: { ip: '192.168.1.100' } },
  humidSensor: { 0: { sensorValue: 60, units: 'pcnt' } }
}

const nodeMock2 = {
  clientId: 'mock02',
  lifetime: 2200,
  ip: '192.168.1.101',
  mac: '11:22:33:44:55:AA',
  version: '0.0.2',
  device: { 0: { manuf: 'sivann', model: 'fake02' } },
  connMonitor: { 0: { ip: '192.168.1.101' } },
  humidSensor: { 0: { sensorValue: 10, units: 'pcnt' } }
}

const nodeMock3 = {
  clientId: 'mock03',
  lifetime: 22120,
  ip: '192.168.1.102',
  mac: 'EE:22:33:44:55:AA',
  version: '1.0.2',
  device: { 0: { manuf: 'sivann', model: 'fake03' } },
  connMonitor: { 0: { ip: '192.168.1.102' } },
  humidSensor: { 0: { sensorValue: 70, units: 'pcnt' } }
}

const nodeMock4 = {
  clientId: 'mock04',
  lifetime: 4456,
  ip: '192.168.1.103',
  mac: 'FF:00:33:44:55:CC',
  version: '6.1.3',
  device: { 0: { manuf: 'sivann', model: 'fake04' } },
  connMonitor: { 0: { ip: '192.168.1.103' } },
  humidSensor: { 0: { sensorValue: 11, units: 'pcnt' } }
}

let mqdb = null

after((done) => {
  fs.unlink(path.resolve('./lib/database/mqttDB.db'), () => {
    setTimeout(() => {
      done()
    }, 200)
  })
})

describe('mqdb -> Database Testing', () => {
  // clear the database file
  const dbFolderX = path.resolve('./lib/database')
  const dbPathX = path.resolve('./lib/database/mqttDB.db')

  before((done) => {
    fs.stat(dbPathX, (err, stats) => {
      if (err) {
        fs.mkdir(dbFolderX, () => {
          mqdb = new Mqdb(dbPathX)

          setTimeout(() => {
            done()
          }, 200)
        })
      } else {
        fs.unlink(path.resolve('./lib/database/mqttDB.db'), () => {
          mqdb = new Mqdb(dbPathX)
          setTimeout(() => {
            done()
          }, 200)
        })
      }
    })
  })

  describe('#.insert', () => {
    it('should insert nodeMock1', (done) => {
      mqdb.insert(nodeMock1).then((doc) => {
        delete doc._id
        if (_.isEqual(doc, nodeMock1)) done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('should insert nodeMock2', (done) => {
      mqdb.insert(nodeMock2).then((doc) => {
        delete doc._id
        if (_.isEqual(doc, nodeMock2)) done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('should insert nodeMock3', (done) => {
      mqdb.insert(nodeMock3).then((doc) => {
        delete doc._id
        if (_.isEqual(doc, nodeMock3)) done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('should not insert nodeMock1 - errorType: uniqueViolated', (done) => {
      mqdb.insert(nodeMock1).then((doc) => {
        delete doc._id
      }).fail((err) => {
        if (err.errorType === 'uniqueViolated') done()
      })
    })

    it('should not insert nodeMock2 - errorType: uniqueViolated', (done) => {
      mqdb.insert(nodeMock2).then((doc) => {
        delete doc._id
      }).fail((err) => {
        if (err.errorType === 'uniqueViolated') done()
      })
    })

    it('should not insert nodeMock3 - errorType: uniqueViolated', (done) => {
      mqdb.insert(nodeMock3).then((doc) => {
        delete doc._id
      }).fail((err) => {
        if (err.errorType === 'uniqueViolated') done()
      })
    })
  })

  describe('#Find By ClientId Check', () => {
    it('should find mock01', (done) => {
      mqdb.findByClientId('mock01').then((doc) => {
        if (_.isEqual(doc, nodeMock1)) done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('should find mock02', (done) => {
      mqdb.findByClientId('mock02').then((doc) => {
        if (_.isEqual(doc, nodeMock2)) done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('should find mock03', (done) => {
      mqdb.findByClientId('mock03').then((doc) => {
        if (_.isEqual(doc, nodeMock3)) done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('should not find mock04 - not added', (done) => {
      mqdb.findByClientId('mock04').then((doc) => {
        if (_.isNull(doc)) done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('insert nodeMock4 - add', (done) => {
      mqdb.insert(nodeMock4).then((doc) => {
        delete doc._id
        if (_.isEqual(doc, nodeMock4)) done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('should find mock04', (done) => {
      mqdb.findByClientId('mock04').then((doc) => {
        if (_.isEqual(doc, nodeMock4)) done()
      }).fail((err) => {
        console.log(err)
      })
    })
  })

  describe('#.exportClientIds', () => {
    it('should get all client ids', (done) => {
      mqdb.exportClientIds().then((ids) => {
        const allIds = ['mock01', 'mock02', 'mock03', 'mock04']
        let hasAll = true

        _.forEach(ids, (id) => {
          if (!_.includes(allIds, id)) hasAll = false
        })

        if (hasAll) done()
      }).fail((err) => {
        console.log(err)
      })
    })
  })

  describe('#.replace', () => {
    it('should return error if someone like to replace clientId', (done) => {
      mqdb.replace('mock01', 'clientId', 'heloo').then((num) => {
        console.log(num)
      }).fail((err) => {
        if (err) done()
      })
    })

    it('should be ok to replace lifetime', (done) => {
      mqdb.replace('mock01', 'lifetime', 200).then(num => mqdb.findByClientId('mock01')).then((doc) => {
        if (doc.lifetime === 200) done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('should be ok to replace ip', (done) => {
      mqdb.replace('mock01', 'ip', '192.168.1.222').then(num => mqdb.findByClientId('mock01')).then((doc) => {
        if (doc.ip === '192.168.1.222') done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('should be ok to replace device.0.manuf', (done) => {
      mqdb.replace('mock01', 'device.0.manuf', 'ti').then(num => mqdb.findByClientId('mock01')).then((doc) => {
        if (doc.device[0].manuf === 'ti') done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('should be ok to replace connMonitor object', (done) => {
      mqdb.replace('mock01', 'connMonitor', { 100: { ip: '192.168.1.100' } }).then(num => mqdb.findByClientId('mock01')).then((doc) => {
        if (_.isEqual(doc.connMonitor, { 100: { ip: '192.168.1.100' } })) done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('should be ok to replace connMonitor object instance', (done) => {
      mqdb.replace('mock01', 'connMonitor.100', { ip: '192.168.1.30' }).then(num => mqdb.findByClientId('mock01')).then((doc) => {
        if (_.isEqual(doc.connMonitor[100], { ip: '192.168.1.30' })) done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('replace - nothing found to be repalced - no mock', (done) => {
      mqdb.replace('mock05', 'connMonitor.100', { ip: '192.168.1.30' }).then(num => mqdb.findByClientId('mock01')).then((doc) => {

      }).fail((err) => {
        if (err) done()
      })
    })

    it('replace - nothing found to be repalced - no Object Instance', (done) => {
      mqdb.replace('mock01', 'connMonitor.55', { ip: '192.168.1.30' }).then(num => mqdb.findByClientId('mock01')).then((doc) => {

      }).fail((err) => {
        if (err) done()
      })
    })

    it('replac - nothing found to be repalced - no Object', (done) => {
      mqdb.replace('mock01', 'connMonitor1.100', { ip: '192.168.1.30' }).then(num => mqdb.findByClientId('mock01')).then((doc) => {

      }).fail((err) => {
        if (err) done()
      })
    })

    it('replace - nothing found to be repalced - no mock and Object', (done) => {
      mqdb.replace('mock08', 'connMonitor1.100', { ip: '192.168.1.30' }).then(num => mqdb.findByClientId('mock01')).then((doc) => {

      }).fail((err) => {
        if (err) done()
      })
    })
  })

  describe('#.modify', () => {
    it('shound return error to modify clientId - string', (done) => {
      mqdb.modify('mock01', 'clientId', 'hihi').then((diff) => {

      }).fail((err) => {
        if (err) done()
      })
    })

    it('shound return error to modify clientId - something else', (done) => {
      mqdb.modify('mock01', 'clientId', { x: 'hihi' }).then((diff) => {
        console.log(diff)
      }).fail((err) => {
        if (err) done()
      })
    })

    it('should be ok to modify lifetime', (done) => {
      mqdb.modify('mock01', 'lifetime', 100).then((diff) => {
        if (diff.lifetime === 100) done()
        return mqdb.findByClientId('mock01')
      }).fail((err) => {
        if (err) console.log(err)
      })
    })

    it('should be ok to modify ip', (done) => {
      mqdb.modify('mock01', 'ip', 'AA:BB:33:44:55:66').then((diff) => {
        if (diff.ip === 'AA:BB:33:44:55:66') done()
      }).fail((err) => {
        if (err) console.log(err)
      })
    })

    it('should be ok to modify device Object', (done) => {
      mqdb.modify('mock01', 'device', { 0: { manuf: 'sivannx', model: 'fake01' } }).then((diff) => {
        if (_.isEqual(diff, { 0: { manuf: 'sivannx' } })) done()
      }).fail((err) => {
        if (err) console.log(err)
      })
    })

    it('should be ok to modify device.0 Object Instance', (done) => {
      mqdb.modify('mock01', 'device.0', { manuf: 'sivannx', model: 'fake01x' }).then((diff) => {
        if (_.isEqual(diff, { model: 'fake01x' })) done()
      }).fail((err) => {
        if (err) console.log(err)
      })
    })

    it('should be ok to modify device.0 Object Instance - nothing changed', (done) => {
      mqdb.modify('mock01', 'device.0', { model: 'fake01x' }).then((diff) => {
        if (_.isEqual(diff, {})) done()
      }).fail((err) => {
        if (err) console.log(err)
      })
    })

    it('should return error to modify something not there - bad property', (done) => {
      mqdb.modify('mock01', 'device.0', { modelx: 'fake01x' }).then((diff) => {
        console.log(diff)
      }).fail((err) => {
        if (err) done()
      })
    })

    it('should return error to modify something not there - no Object Instance', (done) => {
      mqdb.modify('mock01', 'device.5', { model: 'fake01x' }).then((diff) => {
      }).fail((err) => {
        // console.log(err);
        if (err) done()
      })
    })

    it('should return error to modify something not there - no Object', (done) => {
      mqdb.modify('mock01', 'Xdevice.0', { model: 'fake01x' }).then((diff) => {
        console.log(diff)
      }).fail((err) => {
        if (err) done()
      })
    })

    it('should return error to modify something not there - no mock', (done) => {
      mqdb.modify('mock09', 'device.0', { modelx: 'fake01x' }).then((diff) => {
        console.log(diff)
      }).fail((err) => {
        if (err) done()
      })
    })
  })

  describe('#.remove', () => {
    it('should be success to remove mock01 by removeByClientId()', (done) => {
      mqdb.removeByClientId('mock01').then(() => mqdb.findByClientId('mock01')).then((doc) => {
        if (_.isNull(doc)) done()
      })
    })

    it('should be success to remove a mock not there by removeByClientId()', (done) => {
      mqdb.removeByClientId('mock011').then(() => mqdb.findByClientId('mock011')).then((doc) => {
        if (_.isNull(doc)) done()
      })
    })

    it('should be success to remove mock02 by removeByClientId()', (done) => {
      mqdb.removeByClientId('mock02').then(() => mqdb.findByClientId('mock02')).then((doc) => {
        if (_.isNull(doc)) done()
      })
    })

    it('should be success to remove mock03 by removeByClientId()', (done) => {
      mqdb.removeByClientId('mock03').then(() => mqdb.findByClientId('mock03')).then((doc) => {
        if (_.isNull(doc)) done()
      })
    })

    it('find all client ids - only mock04 left', (done) => {
      mqdb.exportClientIds().then((ids) => {
        if (_.isEqual(ids, ['mock04'])) done()
      }).fail((err) => {
        console.log(err)
      })
    })

    it('should be success to remove mock04 by removeByClientId()', (done) => {
      mqdb.removeByClientId('mock04').then(() => mqdb.findByClientId('mock04')).then((doc) => {
        if (_.isNull(doc)) done()
      })
    })

    it('find all client ids - no mock left', (done) => {
      mqdb.exportClientIds().then((ids) => {
        if (_.isEqual(ids, [])) done()
      }).fail((err) => {
        console.log(err)
      })
    })
  })
})
