var Shepherd = require('./index');

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
    // console.log('%%%%%%%%%%%%%% NOTIFIED %%%%%%%%%%%%%%%%%%%%');
    // console.log(diff);
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
// console.log(node.shepherd._rspsToResolve.mnode_1.read[0]);
// console.log(node.shepherd._rspsToResolve.mnode_1.read[1]);
// console.log(node.shepherd._rspsToResolve.mnode_1.read[2]);
    setTimeout(function () {
//     setInterval(function () {
            node.writeAttrsReq('/device/0/manuf', {
                pmin: 20,
                pmax: 100,
                // gt: 1000,
                // lt: 50,
                //step: 200
            }).done(function (r) {
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

    // node.readReq('tempSensor/').done(function (r) {
    //     console.log('>>>>>>>> read tempSensor Object');
    //     console.log(r);
    // }, function (err) {
    //     console.log(err);
    // });

    // setTimeout(function () {
    //     setInterval(function () {
    //         node.readReq('tempSensor/0/').done(function (r) {
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