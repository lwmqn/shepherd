var util = require('util'),
    Shepherd = require('./index');

var shepherd = new Shepherd('my_shepherd');


shepherd.start(function (err, res) {
    if (err) console.log(err);
});

shepherd.on('ready', function () {
    console.log('shepherd ready');
    //console.log(shepherd);
});

shepherd.on('updated', function (diff) {
    console.log(diff);
});

shepherd.on('error', function (err) {
    console.log(err);
});

shepherd.on('notified', function (diff) {
    console.log('%%%%%%%%%%%%%% NOTIFIED %%%%%%%%%%%%%%%%%%%%');
    console.log(diff);
});

shepherd.on('registered', function (node) {
    console.log('REGISTERED');
    console.log(node.clientId);
    console.log(node.status);

//.writeAttrsReq(path, attrs, callback)

    // this.attrs = {
    //     mute: true,
    //     cancel: true,
    //     pmin: 10,
    //     pmax: 60,
    //     gt: null,                 // only valid for number
    //     lt: null,                 // only valid for number
    //     step: null,               // only valid for number
    //     // lastReportedValue: xxx // optional
    // };

    setTimeout(function () {
//     setInterval(function () {
            node.writeAttrsReq('/tempSensor/0/sensorValue', {
                pmin: 5,
                pmax: 15,
                // gt: 1000,
                // lt: 50,
                //step: 200
            }).done(function (r) {

                node.observeReq('/tempSensor/0/sensorValue').done();

             console.log('>>>>>>>> Write Attrs');
             console.log(r);
                setTimeout(function () {
                    shepherd.announce('Announce to the world!!!');
                }, 3000);

                setTimeout(function () {
                    console.log(node.shepherd._rspsToResolve.mnode_1);
                }, 16000);
            }, function (err) {
                console.log('>>>>>>>> Write Attrs ERR');
                console.log(err);
                console.log(node.shepherd._nodebox[node.clientId]);
                setTimeout(function () {
                    console.log(node.shepherd._rspsToResolve);
                }, 3000);
                
            });
     // }, 3200);

    }, 5000);


    // setTimeout(function () {
    //     node.writeReq('/device/0/manuf', 'abc').done(function (r) {
    //         console.log('>>>>>>>> writeReq /device/0/manuf');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 5600);

    // setTimeout(function () {
    //     node.writeAttrsReq('/', { pmax: 333 }).done(function (r) {
    //         console.log('>>>>>>>> writeReq Root');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 5500);

    // setTimeout(function () {
    //     node.writeAttrsReq('/device', { pmax: 333 }).done(function (r) {
    //         console.log('>>>>>>>> writeReq device');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 5600);

    // setTimeout(function () {
    //     node.writeAttrsReq('/device1', { pmax: 333 }).done(function (r) {
    //         console.log('>>>>>>>> writeReq device1');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 5700);

    // setTimeout(function () {
    //     node.writeAttrsReq('/device/0', { pmax: 321, pmin: 1 }).done(function (r) {
    //         console.log('>>>>>>>> writeReq device 0 ');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 5800);

    // setTimeout(function () {
    //     node.writeAttrsReq('/device/1', { pmax: 321, pmin: 1 }).done(function (r) {
    //         console.log('>>>>>>>> writeReq device 1 ');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 5900);

    // setTimeout(function () {
    //     node.writeAttrsReq('/device/0/pwrSrcVoltage', { lt: 500, gt: 1000, step: 60 }).done(function (r) {
    //         console.log('>>>>>>>> writeReq device 0 pwrSrcVoltage ');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 6000);

    // setTimeout(function () {
    //     node.writeAttrsReq('/tempSensor/1x/sensorValue', { pmin: 20, gt: 300 }).done(function (r) {
    //         console.log('>>>>>>>> writeReq device 1 sensorValue ');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 6000);

    // setTimeout(function () {
    //     node.writeAttrsReq('/tempSensor/1/sensorValue', { pminx: 20, gt: 300 }).done(function (r) {
    //         console.log('>>>>>>>> writeReq device 1 sensorValue ');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 6000);
    // setTimeout(function () {
    //     node.executeReq('/tempSensor/1/resetMinMaxMeaValues', [ 'param1', 'abc', 22 ]).done(function (r) {
    //         console.log('>>>>>>>> executeReq resetMinMaxMeaValues');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 5500);

    // setTimeout(function () {
    //     node.discoverReq('/').done(function (r) {
    //         console.log('>>>>>>>> discover Root');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 5500);

    // setTimeout(function () {
    //     node.discoverReq('/tempSensorx').done(function (r) {
    //         console.log('>>>>>>>> discover Device');
    //         console.log(util.inspect(r, { showHidden: true, depth: null }));
    //         // console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 6000);

    // setTimeout(function () {
    //     node.discoverReq('/device/0x').done(function (r) {
    //         console.log('>>>>>>>> discover Device instance 0');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 6500);

    // setTimeout(function () {
    //     node.discoverReq('/device/0/pwrSrcVoltagex').done(function (r) {
    //         console.log('>>>>>>>> discover Device pwrSrcVoltage');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 7000);

    // setTimeout(function () {
    //     node.discoverReq('/3/0/0x').done(function (r) {
    //         console.log('>>>>>>>> discover 3/0/0');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 7500);
    // setTimeout(function () {
    //     node.readReq('/').done(function (r) {
    //         console.log('>>>>>>>> read tempSensor Object');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 5500);

    // setTimeout(function () {
    //     node.readReq('tempSensor/0').done(function (r) {
    //         console.log('>>>>>>>> read tempSensor Instance 0');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 6000);

    // setTimeout(function () {
    //     node.readReq('tempSensor/1').done(function (r) {
    //         console.log('>>>>>>>> read tempSensor Instance 1');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 6500);

    // setTimeout(function () {
    //     node.readReq('tempSensor/1/sensorValue').done(function (r) {
    //         console.log('>>>>>>>> read tempSensor resource 0/sensorValue');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 7000);

    // setTimeout(function () {
    //     node.readReq('tempSensor/1/maxRangeValue').done(function (r) {
    //         console.log('>>>>>>>> read tempSensor resource 0/maxRangeValue');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 7500);

    // setTimeout(function () {
    //     node.readReq('tempSensor/1/resetMinMaxMeaValues').done(function (r) {
    //         console.log('>>>>>>>> read tempSensor resource 1/resetMinMaxMeaValues');
    //         console.log(r);
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }, 8000);
    // setTimeout(function () {
    //     setInterval(function () {
    //         node.readReq('tempSensor/1/').done(function (r) {
    //             console.log('>>>>>>>> read tempSensor Instance');
    //             console.log(r);
    //         }, function (err) {
    //             console.log(err);
    //         });
    //     }, 3200);

    // }, 12000);

    // setTimeout(function () {
    //     setInterval(function () {
    //         node.readReq('tempSensor/0/sensorValue').done(function (r) {
    //             console.log('>>>>>>>> read tempSensor Resource');
    //             console.log(r);
    //         }, function (err) {
    //             console.log(err);
    //         });
    //     }, 4000);

    // }, 15000);

});