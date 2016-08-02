var _ = require('busyman'),
    chai = require('chai'),
    expect = chai.expect;

var fs = require('fs'),
    path = require('path'),
    Q = require('q'),
    Mqdb = require('../lib/components/mqdb');

var nodeMock1 = {
    clientId: 'mock01',
    lifetime: 1200,
    ip: '192.168.1.100',
    mac: '11:22:33:44:55:66',
    version: '0.0.1',
    device: { 0: { manuf: 'sivann', model: 'fake01' } },
    connMonitor: { 0: { ip: '192.168.1.100' } },
    humidSensor: { 0: { sensorValue: 60, units: 'pcnt' } }
};

var nodeMock2 = {
    clientId: 'mock02',
    lifetime: 2200,
    ip: '192.168.1.101',
    mac: '11:22:33:44:55:AA',
    version: '0.0.2',
    device: { 0: { manuf: 'sivann', model: 'fake02' } },
    connMonitor: { 0: { ip: '192.168.1.101' } },
    humidSensor: { 0: { sensorValue: 10, units: 'pcnt' } }
};

var nodeMock3 = {
    clientId: 'mock03',
    lifetime: 22120,
    ip: '192.168.1.102',
    mac: 'EE:22:33:44:55:AA',
    version: '1.0.2',
    device: { 0: { manuf: 'sivann', model: 'fake03' } },
    connMonitor: { 0: { ip: '192.168.1.102' } },
    humidSensor: { 0: { sensorValue: 70, units: 'pcnt' } }
};

var nodeMock4 = {
    clientId: 'mock04',
    lifetime: 4456,
    ip: '192.168.1.103',
    mac: 'FF:00:33:44:55:CC',
    version: '6.1.3',
    device: { 0: { manuf: 'sivann', model: 'fake04' } },
    connMonitor: { 0: { ip: '192.168.1.103' } },
    humidSensor: { 0: { sensorValue: 11, units: 'pcnt' } }
};

var mqdb = null;

describe('Database Testing', function () {
    // clear the database file
    var dbFolderX = path.resolve('./lib/database');
        dbPathX = path.resolve('./lib/database/mqttDB.db');

    before(function (done) {
        fs.stat(dbPathX, function (err, stats) {
            if (err) {
                fs.mkdir(dbFolderX, function () {

                    mqdb = new Mqdb(dbPathX);

                    setTimeout(function () {
                        done();
                    }, 200);
                });
            } else {
                fs.unlink(path.resolve('./lib/database/mqttDB.db'), function () {
                    mqdb = new Mqdb(dbPathX);
                    setTimeout(function () {
                        done();
                    }, 200);
                    
                });
            }
        });
    });

    describe('#.insert', function () {
        it('should insert nodeMock1', function (done) {
            mqdb.insert(nodeMock1).then(function (doc) {
                delete doc._id;
                if (_.isEqual(doc, nodeMock1))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('should insert nodeMock2', function (done) {
            mqdb.insert(nodeMock2).then(function (doc) {
                delete doc._id;
                if (_.isEqual(doc, nodeMock2))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('should insert nodeMock3', function (done) {
            mqdb.insert(nodeMock3).then(function (doc) {
                delete doc._id;
                if (_.isEqual(doc, nodeMock3))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('should not insert nodeMock1 - errorType: uniqueViolated', function (done) {
            mqdb.insert(nodeMock1).then(function (doc) {
                delete doc._id;
            }).fail(function (err) {
                if (err.errorType === 'uniqueViolated')
                    done();
            });
        });

        it('should not insert nodeMock2 - errorType: uniqueViolated', function (done) {
            mqdb.insert(nodeMock2).then(function (doc) {
                delete doc._id;
            }).fail(function (err) {
                if (err.errorType === 'uniqueViolated') done();
            });
        });

        it('should not insert nodeMock3 - errorType: uniqueViolated', function (done) {
            mqdb.insert(nodeMock3).then(function (doc) {
                delete doc._id;
            }).fail(function (err) {
                if (err.errorType === 'uniqueViolated') done();
            });
        });
    });

    describe('#Find By ClientId Check', function () {
        it('should find mock01', function (done) {
            mqdb.findByClientId('mock01').then(function (doc) {
                if (_.isEqual(doc, nodeMock1))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('should find mock02', function (done) {
            mqdb.findByClientId('mock02').then(function (doc) {
                if (_.isEqual(doc, nodeMock2))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('should find mock03', function (done) {
            mqdb.findByClientId('mock03').then(function (doc) {
                if (_.isEqual(doc, nodeMock3))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('should not find mock04 - not added', function (done) {
            mqdb.findByClientId('mock04').then(function (doc) {
                if (_.isNull(doc))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('insert nodeMock4 - add', function (done) {
            mqdb.insert(nodeMock4).then(function (doc) {
                delete doc._id;
                if (_.isEqual(doc, nodeMock4))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('should find mock04', function (done) {
            mqdb.findByClientId('mock04').then(function (doc) {
                if (_.isEqual(doc, nodeMock4))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });
    });

    describe('#.exportClientIds', function () {
        it('should get all client ids', function (done) {
            mqdb.exportClientIds().then(function (ids) {
                var allIds = [ 'mock01', 'mock02', 'mock03', 'mock04' ],
                    hasAll = true;

                _.forEach(ids, function (id) {
                    if (!_.includes(allIds, id))
                        hasAll = false;
                });

                if (hasAll)
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });
    });

    describe('#.replace', function () {
        it('should return error if someone like to replace clientId', function (done) {
            mqdb.replace('mock01', 'clientId', 'heloo').then(function (num) {
                console.log(num);
            }).fail(function (err) {
                if (err)
                    done();
            });
        });

        it('should be ok to replace lifetime', function (done) {
            mqdb.replace('mock01', 'lifetime', 200).then(function (num) {
                return mqdb.findByClientId('mock01');
            }).then(function (doc) {
                if (doc.lifetime === 200)
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('should be ok to replace ip', function (done) {
            mqdb.replace('mock01', 'ip', '192.168.1.222').then(function (num) {
                return mqdb.findByClientId('mock01');
            }).then(function (doc) {
                if (doc.ip === '192.168.1.222')
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('should be ok to replace device.0.manuf', function (done) {
            mqdb.replace('mock01', 'device.0.manuf', 'ti').then(function (num) {
                return mqdb.findByClientId('mock01');
            }).then(function (doc) {
                if (doc.device[0].manuf === 'ti') done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('should be ok to replace connMonitor object', function (done) {
            mqdb.replace('mock01', 'connMonitor', { '100': { ip: '192.168.1.100' } }).then(function (num) {
                return mqdb.findByClientId('mock01');
            }).then(function (doc) {
                if (_.isEqual(doc.connMonitor, { '100': { ip: '192.168.1.100' } }))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('should be ok to replace connMonitor object instance', function (done) {
            mqdb.replace('mock01', 'connMonitor.100', { ip: '192.168.1.30' } ).then(function (num) {
                return mqdb.findByClientId('mock01');
            }).then(function (doc) {
                if (_.isEqual(doc.connMonitor[100], { ip: '192.168.1.30' } ))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('replace - nothing found to be repalced - no mock', function (done) {
            mqdb.replace('mock05', 'connMonitor.100', { ip: '192.168.1.30' } ).then(function (num) {
                return mqdb.findByClientId('mock01');
            }).then(function (doc) {

            }).fail(function (err) {
                if (err) done();
            });
        });

        it('replace - nothing found to be repalced - no Object Instance', function (done) {
            mqdb.replace('mock01', 'connMonitor.55', { ip: '192.168.1.30' } ).then(function (num) {
                return mqdb.findByClientId('mock01');
            }).then(function (doc) {

            }).fail(function (err) {
                if (err) done();
            });
        });

        it('replac - nothing found to be repalced - no Object', function (done) {
            mqdb.replace('mock01', 'connMonitor1.100', { ip: '192.168.1.30' } ).then(function (num) {
                return mqdb.findByClientId('mock01');
            }).then(function (doc) {

            }).fail(function (err) {
                if (err) done();
            });
        });

        it('replace - nothing found to be repalced - no mock and Object', function (done) {
            mqdb.replace('mock08', 'connMonitor1.100', { ip: '192.168.1.30' } ).then(function (num) {
                return mqdb.findByClientId('mock01');
            }).then(function (doc) {

            }).fail(function (err) {
                if (err) done();
            });
        });
    });

    describe('#.modify', function () {
        it('shound return error to modify clientId - string', function (done) {
            mqdb.modify('mock01', 'clientId', 'hihi').then(function (diff) {

            }).fail(function (err) {
                if (err) done();
            });
        });

        it('shound return error to modify clientId - something else', function (done) {
            mqdb.modify('mock01', 'clientId', { x: 'hihi' }).then(function (diff) {
                console.log(diff);
            }).fail(function (err) {
                if (err) done();
            });
        });

        it('should be ok to modify lifetime', function (done) {
            mqdb.modify('mock01', 'lifetime', 100).then(function (diff) {
                if (diff.lifetime === 100)
                    done();
                return mqdb.findByClientId('mock01');
            }).fail(function (err) {
                if (err)
                    console.log(err);
            });
        });

        it('should be ok to modify ip', function (done) {
            mqdb.modify('mock01', 'ip', 'AA:BB:33:44:55:66').then(function (diff) {
                if (diff.ip === 'AA:BB:33:44:55:66')
                    done();
            }).fail(function (err) {
                if (err)
                    console.log(err);
            });
        });

        it('should be ok to modify device Object', function (done) {
            mqdb.modify('mock01', 'device', { 0: { manuf: 'sivannx', model: 'fake01' } }).then(function (diff) {
                if (_.isEqual(diff, { 0: { manuf: 'sivannx' } }))
                    done();
            }).fail(function (err) {
                if (err)
                    console.log(err);
            });
        });

        it('should be ok to modify device.0 Object Instance', function (done) {
            mqdb.modify('mock01', 'device.0', { manuf: 'sivannx', model: 'fake01x' } ).then(function (diff) {
                if (_.isEqual(diff, { model: 'fake01x' }))
                    done();
            }).fail(function (err) {
                if (err)
                    console.log(err);
            });
        });

        it('should be ok to modify device.0 Object Instance - nothing changed', function (done) {
            mqdb.modify('mock01', 'device.0', { model: 'fake01x' } ).then(function (diff) {
                if (_.isEqual(diff, {}))
                    done();
            }).fail(function (err) {
                if (err)
                    console.log(err);
            });
        });

        it('should return error to modify something not there - bad property', function (done) {
            mqdb.modify('mock01', 'device.0', { modelx: 'fake01x' } ).then(function (diff) {
                console.log(diff);
            }).fail(function (err) {
                if (err)
                    done();
            });
        });

        it('should return error to modify something not there - no Object Instance', function (done) {
            mqdb.modify('mock01', 'device.5', { model: 'fake01x' } ).then(function (diff) {
            }).fail(function (err) {
                // console.log(err);
                if (err)
                    done();
            });
        });

        it('should return error to modify something not there - no Object', function (done) {
            mqdb.modify('mock01', 'Xdevice.0', { model: 'fake01x' } ).then(function (diff) {
                console.log(doc);
            }).fail(function (err) {
                if (err)
                    done();
            });
        });

        it('should return error to modify something not there - no mock', function (done) {
            mqdb.modify('mock09', 'device.0', { modelx: 'fake01x' } ).then(function (diff) {
                console.log(diff);
            }).fail(function (err) {
                if (err)
                    done();
            });
        });
    });

    describe('#.remove', function () {
        it('should be success to remove mock01 by removeByClientId()', function (done) {
            mqdb.removeByClientId('mock01').then(function () {
                return mqdb.findByClientId('mock01');
            }).then(function (doc) {
                if (_.isNull(doc))
                    done();
            });
        });

        it('should be success to remove a mock not there by removeByClientId()', function (done) {
            mqdb.removeByClientId('mock011').then(function () {
                return mqdb.findByClientId('mock011');
            }).then(function (doc) {
                if (_.isNull(doc))
                    done();
            });
        });

        it('should be success to remove mock02 by removeByClientId()', function (done) {
            mqdb.removeByClientId('mock02').then(function () {
                return mqdb.findByClientId('mock02');
            }).then(function (doc) {
                if (_.isNull(doc))
                    done();
            });
        });

        it('should be success to remove mock03 by removeByClientId()', function (done) {
            mqdb.removeByClientId('mock03').then(function () {
                return mqdb.findByClientId('mock03');
            }).then(function (doc) {
                if (_.isNull(doc))
                    done();
            });
        });

        it('find all client ids - only mock04 left', function (done) {
            mqdb.exportClientIds().then(function (ids) {
                if (_.isEqual(ids, ['mock04']))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });

        it('should be success to remove mock04 by removeByClientId()', function (done) {
            mqdb.removeByClientId('mock04').then(function () {
                return mqdb.findByClientId('mock04');
            }).then(function (doc) {
                if (_.isNull(doc))
                    done();
            });
        });

        it('find all client ids - no mock left', function (done) {
            mqdb.exportClientIds().then(function (ids) {
                if (_.isEqual(ids, []))
                    done();
            }).fail(function (err) {
                console.log(err);
            });
        });
    });

});
