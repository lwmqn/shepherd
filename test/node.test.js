var _ = require('busyman'),
    chai = require('chai'),
    expect = chai.expect;

var fs = require('fs'),
    path = require('path');

var MqttNode = require('../lib/components/mqtt-node'),
    SmartObject = require('../lib/components/smartobject'),
    Mqdb = require('../lib/components/mqdb');

var cId = 'Im-client-node',
    devAttrs = {
        lifetime: 60000,
        ip: '140.117.11.1',
        mac: '11:22:AA:BB:CC:DD',
        version: 'v0.0.1'
    };

var smObj1 = {
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
    smObj2 = {
        'y': { 3: { 'y31': 'hi' }},
        'z': { 1: { 'z11': 'hello', 'z12': 'world' }, 0: { 'z11': 'hello', 'z12': 'world' }}
    }

var node;


var fakeShp = {
    _mqdb: null,
    emit: function () {}
};

var node = new MqttNode(fakeShp, cId, devAttrs);
node.so.addObjects(_.merge(smObj1, smObj2));
var myso = node.so;

describe('mqtt-node verify', function () {
    var dbFolderY = path.resolve('./lib/database');
        dbPathY = path.resolve('./lib/database/mqttNode.db');

    before(function (done) {
        fs.stat(dbPathY, function (err, stats) {
            if (err) {
                fs.mkdir(dbFolderY, function () {

                    fakeShp._mqdb = new Mqdb(dbPathY);

                    setTimeout(function () {
                        done();
                    }, 200);
                });
            } else {
                fs.unlink(path.resolve('./lib/database/mqttNode.db'), function () {
                    fakeShp._mqdb = new Mqdb(dbPathY);
                    setTimeout(function () {
                        done();
                    }, 200);
                    
                });
            }
        });
    });

    describe('Constructor Check', function () {
        it('should has all correct members after new', function () {
            var node = new MqttNode(fakeShp, cId, devAttrs);
            expect(node.shepherd).be.deep.equal(fakeShp);
            expect(node.clientId).be.equal(cId);
            expect(node.ip).be.equal('140.117.11.1');
            expect(node.mac).be.equal('11:22:AA:BB:CC:DD');
            expect(node.version).be.equal('v0.0.1');
            expect(node.lifetime).be.equal(60000);
            expect(node.objList).be.deep.equal({});
            expect(node.so).not.to.be.null;
            expect(node._registered).to.be.false;
            expect(node.status).be.equal('offline');
            expect(node.lifeChecker).to.be.null;
        });
    });

    describe('Signature Check', function () {
        describe('#.MqttNode(shepherd, clientId, devAttrs)', function () {
            it('should throw if input arguments have wrong type', function () {
                expect(function () { return new MqttNode({}, 'xxx'); }).not.to.throw(Error);
                expect(function () { return new MqttNode({}, 'xxx', {}); }).not.to.throw(Error);

                expect(function () { return new MqttNode({}, 'xxx', []); }).to.throw(TypeError);
                expect(function () { return new MqttNode({}, 'xxx', 1); }).to.throw(TypeError);
                expect(function () { return new MqttNode({}, 'xxx', 'ttt'); }).to.throw(TypeError);

                expect(function () { return new MqttNode({}, [], {}); }).to.throw(TypeError);
                expect(function () { return new MqttNode({}, {}, {}); }).to.throw(TypeError);
                expect(function () { return new MqttNode({}, false, {}); }).to.throw(TypeError);
                expect(function () { return new MqttNode({}, undefined, {}); }).to.throw(TypeError);
                expect(function () { return new MqttNode({}, null, {}); }).to.throw(TypeError);

                expect(function () { return new MqttNode({}); }).to.throw();

                expect(function () { return new MqttNode([], 'xxx', {}); }).to.throw(TypeError);
                expect(function () { return new MqttNode(1, 'xxx', {}); }).to.throw(TypeError);
                expect(function () { return new MqttNode(false, 'xxx', {}); }).to.throw(TypeError);
                expect(function () { return new MqttNode(undefined, 'xxx', {}); }).to.throw(TypeError);
                expect(function () { return new MqttNode(null, 'xxx', {}); }).to.throw(TypeError);
                expect(function () { return new MqttNode('fff', 'xxx', {}); }).to.throw(TypeError);
            });
        });

        describe('#.acquire(oid)', function () {
            it('should throw if input arguments have wrong type', function () {
                expect(function () { node.so.acquire({}); }).to.throw(TypeError);
                expect(function () { node.so.acquire([]); }).to.throw(TypeError);
                expect(function () { node.so.acquire(true); }).to.throw(TypeError);
                expect(function () { node.so.acquire(null); }).to.throw(TypeError);
                expect(function () { node.so.acquire(1); }).not.to.throw(TypeError);

                expect(node.so.acquire()).to.be.undefined;
            });

            it('should throw if so not bound', function () {
                var sotmp = node.so;
                node.so = null;
                expect(function () { node.so.acquire('x'); }).to.throw(Error);
                node.so = sotmp;
            });
        });

        describe('#.geIObject(oid, iid)', function () {
            it('should throw if input arguments have wrong type', function () {
                node.so = myso;
                expect(node.so.acquire()).to.be.undefined;

                expect(function () { node.so.acquire({}, 1); }).to.throw(TypeError);
                expect(function () { node.so.acquire([], 1); }).to.throw(TypeError);
                expect(function () { node.so.acquire(true, 1); }).to.throw(TypeError);
                expect(function () { node.so.acquire(null, 1); }).to.throw(TypeError);

                expect(function () { node.so.acquire(1, {}); }).to.throw(TypeError);
                expect(function () { node.so.acquire(1, []); }).to.throw(TypeError);
                expect(function () { node.so.acquire(1, true); }).to.throw(TypeError);
                expect(function () { node.so.acquire(1, null); }).to.throw(TypeError);
                expect(function () { node.so.acquire(1, 2); }).not.to.throw(TypeError);
            });

            it('should throw if so not bound', function () {
                var sotmp = node.so;
                node.so = null;
                expect(function () {node.so.acquire('x', 2); }).to.throw(Error);
                node.so = sotmp;
            });
        });

        describe('#.getResource(oid, iid, rid)', function () {
            it('should throw if input arguments have wrong type', function () {
                node.so = myso;
                expect(node.so.acquire()).to.be.undefined;

                expect(function () { node.so.acquire({}, 1, 2); }).to.throw(TypeError);
                expect(function () { node.so.acquire([], 1, 2); }).to.throw(TypeError);
                expect(function () { node.so.acquire(true, 1, 2); }).to.throw(TypeError);
                expect(function () { node.so.acquire(null, 1, 2); }).to.throw(TypeError);

                expect(function () { node.so.acquire('x', {}, 1); }).to.throw(TypeError);
                expect(function () { node.so.acquire('x', [], 1); }).to.throw(TypeError);
                expect(function () { node.so.acquire('x', true, 1); }).to.throw(TypeError);
                expect(function () { node.so.acquire('x', null, 1); }).to.throw(TypeError);

                expect(function () { node.so.acquire('x', 0, {}); }).to.throw(TypeError);
                expect(function () { node.so.acquire('x', 0, []); }).to.throw(TypeError);
                expect(function () { node.so.acquire('x', 0, true); }).to.throw(TypeError);
                expect(function () { node.so.acquire('x', 0, null); }).to.throw(TypeError);

                expect(function () { node.so.acquire('x', 2, 3); }).not.to.throw(Error);
                expect(function () { node.so.acquire('f', 2, 'c'); }).not.to.throw(Error);
            });

            it('should throw if so not bound - no acquire method', function () {
                node.so = null;
                expect(function () { node.so.acquire('x', 2, 0); }).to.throw(Error);
                node.so = myso;
            });
        });

        describe('#.maintain', function () {
            it('should throw if cIds is not a string or not an array of strings', function () {
                expect(function () { node.maintain({}); }).to.throw(TypeError);
                expect(function () { node.maintain(true); }).to.throw(TypeError);
                expect(function () { node.maintain([ 'ceed', {} ]); }).to.throw(TypeError);

                expect(function () { node.maintain('ceed'); }).to.throw(TypeError);
                expect(function () { node.maintain([ 'ceed', 'xxx' ]); }).to.throw(TypeError);
                expect(function () { node.maintain(function () {}); }).not.to.throw(Error);
            });
        });

        describe('#.dump()', function () {
            it('should should empty object if no so bound', function () {
                node.so = null;
                expect(node.dump().so).to.be.deep.equal({});
                node.so = myso;
            });
        });

        // enableLifeChecker(), disableLifeChecker() no arguments
        // dbRead(), dbSave(), dbRemove() no arguments
        // dump(), restore(), maintain() only a callback.... will throw if it is not a function

        // Asynchronous APIs
        describe('#.readReq(path, callback)', function () {
            it('should return error if input arguments have wrong path type', function (done) {
                node.readReq().fail(function (err) {
                    done();
                });
            });

            it('should return error if no shepherd', function (done) {
                node.shepherd = null;
                node.readReq('x').fail(function (err) {
                    done();
                });
                node.shepherd = fakeShp;
            });

            it('should return error if no so', function (done) {
                node.so = null;
                node.readReq('x').fail(function (err) {
                    done();
                });
                //node.so = myso;
            });
        });

        describe('#.writeReq(path, data, callback)', function () {
            it('should return error if input arguments have wrong path type', function (done) {
                node.writeReq(3, 'data').fail(function (err) {
                    done();
                });
            });

            it('should return error if no shepherd', function (done) {
                node.shepherd = null;
                node.writeReq('x', {}).fail(function (err) {
                    done();
                });
                node.shepherd = fakeShp;
            });

            it('should throw if no so', function (done) {
                node.so = null;
                node.writeReq('x', {}).fail(function (err) {
                    done();
                });
                //node.so = myso;
            });

            it('should return error if bad object', function (done) {
                node.writeReq('/', 'data').fail(function (err) {
                    done();
                });
            });

            it('should return error if bad object data', function (done) {
                node.writeReq('/x', 'data').fail(function (err) {
                    done();
                });
            });

            it('should return error if bad instance data', function (done) {
                node.writeReq('/x/2', 'data').fail(function (err) {
                    done();
                });
            });
        });

        describe('#.discoverReq(path, callback)', function () {
            it('should return error if input arguments have wrong path type', function (done) {
                node.discoverReq().fail(function (err) {
                    done();
                });
            });

            it('should return error if no shepherd', function (done) {
                node.shepherd = null;
                node.discoverReq('x').fail(function (err) {
                    done();
                });
                node.shepherd = fakeShp;
            });

            it('should return error if no so', function (done) {
                node.so = null;
                node.discoverReq('x').fail(function (err) {
                    done();
                });
                node.so = myso;
            });
        });

        describe('#.writeAttrsReq(path, attrs, callback)', function () {
            it('should return error if input arguments have wrong path type', function (done) {
                node.writeAttrsReq(3, 'data').fail(function (err) {
                    done();
                });
            });

            it('should return error if no shepherd', function (done) {
                node.shepherd = null;
                node.writeAttrsReq('x', {}).fail(function (err) {
                    done();
                });
                node.shepherd = fakeShp;
            });

            it('should return error if no so', function (done) {
                node.so = null;
                node.writeAttrsReq('x', {}).fail(function (err) {
                    done();
                });
                node.so = myso;
            });

            it('should return error if bad object data', function (done) {
                node.writeAttrsReq('/x', 'data').fail(function (err) {
                    done();
                });
            });

            it('should return error if bad instance data', function (done) {
                node.writeAttrsReq('/x/2', 'data').fail(function (err) {
                    done();
                });
            });

            it('should return error if bad resource data', function (done) {
                node.writeAttrsReq('/x/2/3', 'data').fail(function (err) {
                    done();
                });
            });
        });

        describe('#.executeReq(path, callback)', function () {
            it('should return error if input arguments have wrong path type', function (done) {
                node.executeReq().fail(function (err) {
                    done();
                });
            });

            it('should return error if no shepherd', function (done) {
                node.shepherd = null;
                node.executeReq('x').fail(function (err) {
                    done();
                });
                node.shepherd = fakeShp;
            });

            it('should return error if no so', function (done) {
                node.so = null;
                node.executeReq('x').fail(function (err) {
                    done();
                });
                node.so = myso;
            });
        });

        describe('#.observeReq(path, callback)', function () {
            it('should return error if input arguments have wrong path type', function (done) {
                node.observeReq().fail(function (err) {
                    done();
                });
            });

            it('should return error if no shepherd', function (done) {
                node.shepherd = null;
                node.observeReq('x').fail(function (err) {
                    done();
                });
                node.shepherd = fakeShp;
            });

            it('should return error if no so', function (done) {
                node.so = null;
                node.observeReq('x').fail(function (err) {
                    done();
                });
                node.so = myso;
            });
        });

        describe('#.replaceObjectInstance(oid, iid, data, callback)', function () {
            it('should return error if no shepherd', function (done) {
                node.shepherd = null;
                node.replaceObjectInstance('x', 1, {}).fail(function (err) {
                    done();
                });
                node.shepherd = fakeShp;
            });

            it('should return error if no so', function (done) {
                node.shepherd = fakeShp;
                node.so = null;
                node.replaceObjectInstance('x', 1, {}).fail(function (err) {
                    done();
                });
                node.so = myso;
            });

            it('should return error if bad oid', function (done) {
                node.shepherd = fakeShp;
                node.replaceObjectInstance([], 1, {}).fail(function (err) {
                    done();
                });
            });

            it('should return error if bad iid', function (done) {
                node.shepherd = fakeShp;
                node.replaceObjectInstance(1, {}, {}).fail(function (err) {
                    done();
                });
            });

            it('should return error if bad data', function (done) {
                node.shepherd = fakeShp;
                node.replaceObjectInstance(1, {}, 'xx').fail(function (err) {
                    done();
                });
            });
        });

        describe('#.updateObjectInstance(oid, iid, data, callback)', function () {
            it('should return error if no shepherd', function (done) {
                node.shepherd = null;
                node.updateObjectInstance('x', 1, {}).fail(function (err) {
                    done();
                });
                node.shepherd = fakeShp;
            });

            it('should return error if no so', function (done) {
                node.so = null;
                node.updateObjectInstance('x', 1, {}).fail(function (err) {
                    done();
                });
                node.so = myso;
            });

            it('should return error if bad oid', function (done) {
                node.updateObjectInstance([], 1, {}).fail(function (err) {
                    done();
                });
            });

            it('should return error if bad iid', function (done) {
                node.updateObjectInstance(1, {}, {}).fail(function (err) {
                    done();
                });
            });

            it('should return error if bad data', function (done) {
                node.updateObjectInstance(1, 2, 'xx').fail(function (err) {
                    done();
                });
            });

            it('should return error if bad data', function (done) {
                node.updateObjectInstance('y', 2, 'xx').fail(function (err) {
                    done();
                });
            });
        });

        describe('#.updateResource(oid, iid, rid, data, callback)', function () {
            it('should return error if no shepherd', function (done) {
                node.shepherd = null;
                node.updateResource('x', 1, 1, {}).fail(function (err) {
                    done();
                });
                node.shepherd = fakeShp;
            });

            it('should return error if no so', function (done) {
                node.so = null;
                node.updateResource('x', 1, 1, 'ddd').fail(function (err) {
                    done();
                });
                node.so = myso;
            });

            it('should return error if bad oid', function (done) {
                node.updateResource([], 1, 1, 'xxx').fail(function (err) {
                    done();
                });
            });

            it('should return error if bad iid', function (done) {
                node.updateResource(1, {}, 1, 'xxxx').fail(function (err) {
                    done();
                });
            });

            it('should return error if bad rid', function (done) {
                node.updateResource(1, 1, {}, 'xxxx').fail(function (err) {
                    done();
                });
            });

            it('should return error if bad data', function (done) {
                node.updateResource(1, 2, 3).fail(function (err) {
                    done();
                });
            });

            it('should return error if no oid', function (done) {
                node.updateResource(1, 0, 'z11', 'xxxx').fail(function (err) {
                    done();
                });
            });

            it('should return error if no iid', function (done) {
                node.updateResource('z', 2, 'z11', 'xxxx').fail(function (err) {
                    done();
                });
            });

            it('should return error if no rid', function (done) {
                node.updateResource('z', 1, 'z14', 'xxxx').fail(function (err) {
                    done();
                });
            });
        });

        describe('#.updateAttrs(attrs, callback)', function () {
            it('should return error if no shepherd', function (done) {
                node.shepherd = null;
                node.updateAttrs({}).fail(function (err) {
                    done();
                });
                node.shepherd = fakeShp;
            });

            it('should return error if no so', function (done) {
                node.so = null;
                node.updateAttrs({}).fail(function (err) {
                    done();
                });
                node.so = myso;
            });

            it('should return error if bad attrs', function (done) {
                node.updateAttrs('dd').fail(function (err) {
                    done();
                });
            });
        });
    });

    describe('Functional Check', function () {
        var nodex = new MqttNode(fakeShp, cId, devAttrs);
        nodex.so = myso;

        describe('#.bind smart object', function () {
            it('should has correct node and so', function () {
                expect(nodex.so).to.be.equal(myso);
            });
        });

        describe('#.getRootObject(oid)', function () {
            it('should pass equality test', function () {
                expect(nodex.so.acquire(100)).to.be.undefined;
                expect(nodex.so.dumpSync('z')).to.deep.equal({
                    '0': { z11: 'hello', z12: 'world' },
                    '1': { z11: 'hello', z12: 'world' }
                });
            });
        });

        describe('#.getIObject(oid, iid)', function () {
            it('should pass equality test', function () {
                expect(nodex.so.acquire(100, 3)).to.be.undefined;
                expect(nodex.so.acquire('y', 7)).to.be.undefined;
                expect(nodex.so.dumpSync('z', 1)).be.deep.equal({ z11: 'hello', z12: 'world' });
                expect(nodex.so.dumpSync('z', '1')).be.deep.equal({ z11: 'hello', z12: 'world' });
                expect(nodex.so.dumpSync('x', '0')).be.deep.equal({ x1: 1, x2: 2 });
                expect(nodex.so.dumpSync('x', 0)).be.deep.equal({ x1: 1, x2: 2 });
            });
        });

        describe('#.getResource(oid, iid, rid)', function () {
            it('should pass equality test', function () {
                expect(nodex.so.acquire('y', 3, 'xq')).to.be.undefined;
                expect(nodex.so.acquire('y', 2, 'y31')).to.be.undefined;
                expect(nodex.so.acquire('xx', 3, 'y31')).to.be.undefined;
                expect(nodex.so.acquire('y', 7, 'y31')).to.be.undefined;

                expect(nodex.so.acquire('x', 0, 'x1')).to.be.eql(1);
                expect(nodex.so.acquire('x', 0, 'x2')).to.be.eql(2);
                expect(nodex.so.acquire('x', 1, 'y1')).to.be.eql(3);
                expect(nodex.so.acquire('x', 1, 'y2')).to.be.eql(4);

                expect(nodex.so.acquire('y', 3, 'y31')).to.be.eql('hi');
                expect(nodex.so.acquire('y', 3, 'y31')).to.be.eql('hi');

                expect(nodex.so.acquire('z', 0, 'z11')).to.be.eql('hello');
                expect(nodex.so.acquire('z', 0, 'z12')).to.be.eql('world');
                expect(nodex.so.acquire('z', 1, 'z11')).to.be.eql('hello');
                expect(nodex.so.acquire('z', 1, 'z12')).to.be.eql('world');
            });
        });

        describe('#.enableLifeChecker()', function () {
            it('should pass equality test', function () {
                expect(nodex.lifeChecker).to.be.null;
                expect(nodex.enableLifeChecker()).to.be.equal(nodex);
                expect(nodex.lifeChecker).not.to.be.null;
                expect(nodex.lifeChecker).not.to.be.undefined;
            });
        });

        describe('#.disableLifeChecker()', function () {
            it('should pass equality test', function () {
                expect(nodex.lifeChecker).not.to.be.null;
                expect(nodex.disableLifeChecker()).to.be.equal(nodex);
                expect(nodex.lifeChecker).to.be.null;
            });
        });

        describe('#.dump()', function () {
            it('should pass equality test', function () {
                var dumped = {
                    clientId: cId,
                    lifetime: devAttrs.lifetime,
                    ip: devAttrs.ip,
                    mac: devAttrs.mac,
                    joinTime: nodex.joinTime,
                    version: devAttrs.version,
                    objList: {},
                    so: {
                        x: smObj1.x,
                        y: smObj2.y,
                        z: smObj2.z
                    }
                };
                expect(nodex.dump()).to.be.deep.equal(dumped);
            });
        });

        describe('#.dbSave()', function () {
            it('should pass data store test', function (done) {
                var dumped = {
                    clientId: cId,
                    lifetime: devAttrs.lifetime,
                    ip: devAttrs.ip,
                    mac: devAttrs.mac,
                    joinTime: nodex.joinTime,
                    version: devAttrs.version,
                    objList: {},
                    so: {
                        x: smObj1.x,
                        y: smObj2.y,
                        z: smObj2.z
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
        });

        describe('#.dbRead()', function () {
            it('should pass data read test', function (done) {
                var dumped = {
                    clientId: cId,
                    lifetime: devAttrs.lifetime,
                    ip: devAttrs.ip,
                    mac: devAttrs.mac,
                    joinTime: nodex.joinTime,
                    version: devAttrs.version,
                    objList: {},
                    so: {
                        x: smObj1.x,
                        y: smObj2.y,
                        z: smObj2.z
                    }
                };
                nodex.dbRead().done(function (data) {
                    if (_.isEqual(data, dumped))
                        done();
                }, function (err) {
                    console.log(err);
                });
            });
        });

        describe('#.dbRemove()', function () {
            it('should pass data remove test', function (done) {
                nodex.dbRemove().done(function (clientId) {
                    if (clientId === 'Im-client-node')
                        done();
                }, function (err) {
                    console.log(err);
                });
            });

            it('should pass data remove test - nothing to remove', function (done) {
                nodex.dbRemove().done(function (clientId) {
                    if (clientId === 'Im-client-node')
                        done();
                }, function (err) {
                    console.log(err);
                });
            });
        });

        describe('#.restore()', function () {
            it ('should pass data restore test' , function (done) {
                nodex.dbSave().done(function (data) {
                    var nodeCloned = new MqttNode(fakeShp, cId);
                    nodeCloned.restore().done(function (node) {
                        if (_.isEqual(nodeCloned.dump(), nodex.dump()))
                            done();
                    }, function (err) {
                        console.log(err);
                    });
                }, function (err) {
                    console.log(err);
                });
            });
        });

        describe('#.replaceObjectInstance(oid, iid, data)', function () {
            it('should pass equality test after replaced', function (done) {
                nodex._registered = true;
                var newInst = { newY1: 100, newY2: 'hihi' },
                    inst;
                nodex.replaceObjectInstance('y', 3, newInst).then(function (ninst) {
                    inst = ninst;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.dumpSync('y', 3), newInst) && _.isEqual(nodex.so.dumpSync('y', 3), ndata.so.y[3]))
                        done();
                }, function (err) {
                    console.log(err);
                });
            });
        });

        describe('#.updateObjectInstance(oid, iid, data)', function () {
            it('should pass equality test after partial update', function (done) {
                var newInst = { y1: 'hello', y2: 4 },
                    diff;
                nodex._registered = true;
                nodex.updateObjectInstance('x', 1, newInst).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    if (_.isEqual(nodex.so.dumpSync('x', 1), newInst) && _.isEqual(nodex.so.dumpSync('x', 1), ndata.so.x[1]))
                        if (_.isEqual(diff, { y1: 'hello' }))
                            done();
                }, function (err) {
                    console.log(err);
                });
            });

            it('should pass equality test after full update', function (done) {
                var newInst = { y1: 'world', y2: 1200 },
                    diff;
                nodex._registered = true;
                nodex.updateObjectInstance('x', 1, newInst).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.dumpSync('x', 1), newInst) && _.isEqual(nodex.so.dumpSync('x', 1), ndata.so.x[1]))
                        if (_.isEqual(diff, { y1: 'world', y2: 1200  }))
                            done();
                }, function (err) {
                    console.log(err);
                });
            });
        });

        describe('#.updateResource(oid, iid, rid, data, callback)', function () {
            it('should pass equality test after value/value update', function (done) {
                var newVal = 'new value',
                    diff;
                nodex._registered = true;
                nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.dumpSync('z', 0).z12, newVal) && _.isEqual(nodex.so.dumpSync('z', 0).z12, ndata.so.z[0].z12))
                        if (_.isEqual(diff, newVal))
                            done();
                }, function (err) {
                    console.log(err);
                });
            });

            it('should pass equality test after value/object update', function (done) {
                var newVal = { n1: 100, n2: 30 },
                    diff;
                nodex._registered = true;
                nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))
                        if (_.isEqual(diff, newVal))
                            done();
                }, function (err) {
                    console.log(err);
                });
            });

            it('should pass equality test after object/object update', function (done) {
                var newVal = { n1: 300, n2: 30 },
                    diff;
                nodex._registered = true;
                nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))
                        if (_.isEqual(diff, { n1: 300 }))
                            done();
                }, function (err) {
                    console.log(err);
                });
            });

            it('should pass equality test after object/value update', function (done) {
                var newVal = 'I am new value',
                    diff;
                nodex._registered = true;
                nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {
                    //console.log(idiff);
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))

                        if (_.isEqual(diff, newVal))
                            done();
                }, function (err) {
                    console.log(err);
                });
            });

            it('should pass equality test after value/object update', function (done) {
                var newVal = { n1: 1, n2: 2, n3: { n31: 'hi', n32: 3 } },
                    diff;
                nodex._registered = true;
                nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {

                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.z[0].z12, newVal) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))
                        if (_.isEqual(diff, newVal))
                            done();
                }, function (err) {
                    // console.log(err);
                });
            });
        
            it('should pass equality test after object/object update', function (done) {
                var newVal = { n3: { n31: 'hello' } },
                    diff;
                nodex._registered = true;
                nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.z[0].z12, { n1: 1, n2: 2, n3: { n31: 'hello', n32: 3 } }) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))
                        if (_.isEqual(diff, { n3: { n31: 'hello' } }))
                            done();
                }, function (err) {
                    // console.log(err);
                });
            });

            it('should pass equality test after object/object update', function (done) {
                var newVal = { n1: 1024, n3: { n31: 'world' } },
                    diff;
                nodex._registered = true;
                nodex.updateResource('z', 0, 'z12', newVal).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.z[0].z12, { n1: 1024, n2: 2, n3: { n31: 'world', n32: 3 } }) && _.isEqual(nodex.so.z[0].z12, ndata.so.z[0].z12))
                        if (_.isEqual(diff, { n1: 1024, n3: { n31: 'world' } }))
                            done();
                }, function (err) {
                    console.log(err);
                });
            });
        });

        describe('#.updateAttrs(attrs, callback)', function () {
            // { lifetime, ip, mac, version }
            it('should pass equality test after lifetime and ip update', function (done) {
                var newAttrs = { lifetime: 1000, ip: '111.111.222.222' },
                    diff;
                nodex._registered = true;
                nodex.updateAttrs(newAttrs).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.lifetime, newAttrs.lifetime) && _.isEqual(nodex.ip, newAttrs.ip))
                        done();
                }, function (err) {
                    console.log(err);
                });
            });

            it('should pass equality test after ip update', function (done) {
                var newAttrs = { ip: '111.111.222.221' },
                    diff;
                nodex._registered = true;
                nodex.updateAttrs(newAttrs).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.ip, newAttrs.ip))
                        done();
                }, function (err) {
                    console.log(err);
                });
            });
        });

        describe('#._checkAndUpdate(attrs, callback)', function () {
            it('should ignore if no such property to update', function (done) {
                var diff;
                nodex._registered = true;
                nodex._checkAndUpdate('/y', { '3': { newY8: 999 } } ).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.dumpSync('y', 3), { newY1: 100, newY2: 'hihi' }))
                        done();
                }, function (err) {
                    console.log(err);
                });
            });

            it('should pass equality test after instance update 1', function (done) {
                var diff;
                nodex._registered = true;
                nodex._checkAndUpdate('/x/0', { x1: 1111 } ).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.dumpSync('x', 0), { x1: 1111, x2: 2 }) && _.isEqual(nodex.so.dumpSync('x', 0), ndata.so.x[0]))
                        if (_.isEqual(diff, { x1: 1111 }))
                            done();
                }, function (err) {
                    console.log(err);
                });
            });

            it('should pass equality test after instance update 2', function (done) {
                var diff;
                nodex._registered = true;
                nodex._checkAndUpdate('/x/0', { x1: 'hi', x2: 'friend' } ).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.dumpSync('x', 0), { x1: 'hi', x2: 'friend' }) && _.isEqual(nodex.so.dumpSync('x', 0), ndata.so.x[0]))
                        if (_.isEqual(diff, { x1: 'hi', x2: 'friend' }))
                            done();
                }, function (err) {
                    console.log(err);
                });
            });

            it('should pass equality test after resource update 1', function (done) {
                var diff;
                nodex._registered = true;
                nodex._checkAndUpdate('/z/1/z11', 'awesome' ).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;
                    if (_.isEqual(nodex.so.z[1].z11, 'awesome') && _.isEqual(nodex.so.dumpSync('z', 1), ndata.so.z[1]))
                        if (_.isEqual(diff, 'awesome'))
                            done();
                }, function (err) {
                    console.log(err);
                });
            });

            it('should pass equality test after resource update 2', function (done) {
                var diff;
                nodex._registered = true;
                nodex._checkAndUpdate('/z/1/z11', { a: 'amazing' } ).then(function (idiff) {
                    diff = idiff;
                    return nodex.dbRead();
                }).done(function (ndata) {
                    nodex._registered = false;

                    if (_.isEqual(nodex.so.z[1].z11, { a: 'amazing' }) && _.isEqual(nodex.so.dumpSync('z', 1), ndata.so.z[1]))
                        if (_.isEqual(diff, { a: 'amazing' }))
                            done();
                }, function (err) {
                    console.log(err);
                });
            });
        });
    });

});

