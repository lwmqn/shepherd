var util = require('util'),
    crypto = require('crypto'),
    moment = require('moment'),
    Shepherd = require('./index');

var shepherd = new Shepherd('my_shepherd');
var preUnix = null,
    nowUnix = null;

// shepherd.encrypt = function (msg, clientId, callback) {
//     var msgBuf = new Buffer(msg),
//         cipher = crypto.createCipher('aes128', 'mypassword'),
//         encrypted = cipher.update(msgBuf, 'binary', 'base64');

//     try {
//         encrypted += cipher.final('base64');
//         callback(null, encrypted);
//     } catch (e) {
//         callback(e);
//     }
// };

// shepherd.decrypt = function (msg, clientId, callback) {
//     msg = msg.toString();
//     var decipher = crypto.createDecipher('aes128', 'mypassword'),
//         decrypted = decipher.update(msg, 'base64', 'utf8');

//     try {
//         decrypted += decipher.final('utf8');
//         callback(null, decrypted);
//     } catch (e) {
//         callback(e);
//     }
// };

function runtest(cb, delay, rp) {
    setTimeout(function () {
        if (rp === undefined)
            cb();
        else
            setInterval(cb, rp);
    }, delay);
}

shepherd.start(function (err, res) {
    if (err) console.log(err);
});

shepherd.on('ready', function () {
    console.log('shepherd ready');
    //setTimeout(function () {
        shepherd.permitJoin(20);
    //}, 2000);
    //console.log(shepherd);
    shepherd.on('priphDisconnected', function (c) {
        console.log('some one disconnected');
        console.log(c.id);
        // var n = shepherd.find(c.id);
        // console.log(n.status);
    });
});

shepherd.on('permitJoining', function (t) {
    console.log('PERMIT JOIN: ' + t);
    console.log('PERMIT JOIN: ' + shepherd._joinable);
    console.log('SERVER ENABLED: ' + shepherd._enabled);

});

shepherd.on('updated', function (qnode, diff) {
    console.log(diff);
});

shepherd.on('error', function (err) {
    console.log(err);
});

var t = 0;
shepherd.on('ind:changed', function (msg) {
    console.log('>>>>>>>>>> CHANGED');
    console.log(msg);
});

shepherd.on('ind:notified', function (qnode, msg) {
    // preUnix = nowUnix;
    // nowUnix = moment().unix();

    // t++;
    // if (t > 5) {
    //     shepherd._responseSender('notify', msg.clientId, { transId: msg.transId, status: 204, cancel: true });
    //     t = 0;
    // }

    // var tdf = nowUnix - preUnix;
    // tdf  = tdf > 10000 ? 0 : tdf;
    console.log('>>>>>>>>>> NOTIFIED');
    // console.log(tdf);
    console.log(msg);

    //var n = shepherd.find(msg.clientId);
    // console.log(n.dump());
    // setTimeout(function () {
    //     n.pingReq(function (err, rsp) {
    //         console.log('>>>>>>>>>> PINING');
    //         if (err)
    //             console.log(err);
    //         console.log(rsp);
    //     });
    // }, 3000);

    // shepherd.devListMaintain(function (err, r) {
    //     console.log('########## maintain ########');
    //     console.log(err);
    //     console.log(r);
    // });


});

// shepherd.on('notify', function (msg) {
//     console.log('>>>>>>>>>> NOTIFY');
//     console.log(msg);

// });
shepherd.on('ind:status', function (qnode, status) {
    console.log('ind:status');
    console.log(qnode.status);
    console.log(status);
});

// shepherd.on('message', function (topic, message) {
//     console.log('>>>>>> ALL MESSAGES <<<<<<<<');
//     console.log(topic);
//     console.log(message);
// });

shepherd.on('ind:incoming', function (node) {
    console.log('NODE INCOMING');
    console.log(node.clientId);
    console.log(node.status);

    // read test - resource
    // runtest(function () {
    //     node.readReq('/temperature/0/sensorValue', function (err, rsp) {
    //         console.log('>>>>> read test');
    //         console.log(rsp);
    //     });
    // }, 5000, 2000);

    // // read test - bad resource
    // runtest(function () {
    //     node.readReq('/3303/0/sensorValue', function (err, rsp) {
    //         console.log('>>>>> read test');
    //         console.log(rsp);
    //     });
    // }, 5000, 2000);

    // // read test - not allowed resource
    // runtest(function () {
    //     node.readReq('/3303/0/some1', function (err, rsp) {
    //         console.log('>>>>> read not allowed test: some1');
    //         console.log(rsp);
    //     });
    //     node.readReq('/3303/0/some2', function (err, rsp) {
    //         console.log('>>>>> read not allowed test: some2');
    //         console.log(rsp);
    //     });
    // }, 5000, 2000);

    // // read test - instance
    // runtest(function () {
    //     node.readReq('/3303/0/', function (err, rsp) {
    //         console.log('>>>>> read instance test');
    //         console.log(rsp);
    //     });
    // }, 5000, 2000);
    // [TODO] >>>>>>>>>> CHANGED    dont know who changed?
    // { clientId: 'test_node_01', data: { sensorValue: 71 } }

    // // read test - object
    // runtest(function () {
    //     node.readReq('/3303', function (err, rsp) {
    //         console.log('>>>>> read object test');
    //         console.log(rsp);
    //     });
    // }, 5000, 2000);
    // [TODO] >>>>>>>>>> CHANGED    changed thing is not detected????
    // { clientId: 'test_node_01', data: { '0': {} } }

    // // read test - root
    // runtest(function () {
    //     node.readReq('/', function (err, rsp) {
    //         console.log('>>>>> read root test');
    //         console.log(rsp);
    //     });
    // }, 5000, 2000);

    // exec test - resource
    // runtest(function () {
    //     node.executeReq('/3303/0/some1', 'simen', function (err, rsp) {
    //         console.log('>>>>> exec resource test');
    //         console.log(rsp);
    //     });
    // }, 5000, 2000);

    // // exec test - resource not found
    // runtest(function () {
    //     node.executeReq('/3303/0/somex', 'simen', function (err, rsp) {
    //         console.log('>>>>> exec resource test');
    //         console.log(rsp);
    //     });
    // }, 5000, 2000);

    // // exec test - resource not allowed
    // runtest(function () {
    //     node.executeReq('/3303/0/some2', 'simen', function (err, rsp) {
    //         console.log('>>>>> exec resource test');
    //         console.log(rsp);
    //     });
    // }, 5000, 2000);

    // // exec test - instance not allowed
    // runtest(function () {
    //     node.executeReq('/3303/0/', 'simen', function (err, rsp) {
    //         console.log('>>>>> exec instance test');
    //         console.log(rsp);
    //     });
    // }, 5000, 2000);

    // // exec test - object not allowed
    // runtest(function () {
    //     node.executeReq('/3303/', 'simen', function (err, rsp) {
    //         console.log('>>>>> exec object test');
    //         console.log(rsp);
    //     });
    // }, 5000, 2000);

    // // write test - resource
    // runtest(function () {
    //     node.writeReq('/3303/0/sensorValue', 60, function (err, rsp) {
    //         console.log('>>>>> write resource test');
    //         console.log(rsp);
    //     });
    //     node.readReq('/3303/0/sensorValue', function (err, rsp) {
    //         console.log('>>>>> read resource test');
    //         console.log(rsp);
    //     });
    // }, 5000, 1000);

    // // write test
    // runtest(function () {
    //     node.writeReq('/3303/0/some2', 60, function (err, rsp) {
    //         console.log('>>>>> write resource test');
    //         console.log(rsp);
    //     });
    //     node.readReq('/3303/0/some2', function (err, rsp) {
    //         console.log('>>>>> read resource test');
    //         console.log(rsp);
    //     });
    // }, 5000, 1000);

    // // write test - write invlaid resource
    // runtest(function () {
    //     node.writeReq('/3303/0/x', 60, function (err, rsp) {
    //         console.log('>>>>> write resource test');
    //         console.log(rsp);
    //     });
    // }, 5000, 1000);

    // write test - write instance, object (not allowed)
    // runtest(function () {
    //     node.writeReq('/3303/', { x: 3 }, function (err, rsp) {
    //         console.log('>>>>> write resource test');
    //         console.log(err);
    //         console.log(rsp);
    //     });
    // }, 5000, 1000);

    // // write test - write resource with bad type
    // runtest(function () {
    //     node.writeReq('/3303/0/sensorValue', 30, function (err, rsp) {
    //         console.log('>>>>> write resource test');
    //         console.log(rsp);
    //     });
    // }, 5000, 1000);

    // // disover test
    // runtest(function () {
    //     node.discoverReq('/3/0', function (err, rsp) {
    //         console.log('>>>>> discover test');
    //         console.log(rsp);
    //     });
    // }, 2000, 2000);


    // // write test - resource - access control
    // runtest(function () {
    //     node.writeReq('/3303/0/minMeaValue', 100, function (err, rsp) {
    //         console.log('>>>>> write resource test');
    //         console.log(rsp);
    //     });
    //     node.readReq('/3303/0/minMeaValue', function (err, rsp) {
    //         console.log('>>>>> read resource test');
    //         console.log(rsp);
    //     });
    // }, 5000, 1000);

    // writeAttrs test
    // runtest(function () {
    //     var attrs = {
    //         pmin: 50,
    //         pmax: 600,
    //         stp: 10,
    //     };
    //     node.writeAttrsReq('/3303/0/sensorValue', attrs , function (err, rsp) {
    //         console.log('>>>>> writeAttrs test');
    //         console.log(rsp);
    //     });

    //     node.discoverReq('/3303/0/sensorValue', function (err, rsp) {
    //         console.log('>>>>> writeAttrs test:discover back');
    //         console.log(rsp);
    //     });

    // }, 2000, 2000);

    // // observe test
    // runtest(function () {
    //     var attrs = {
    //         pmin: 5,
    //         pmax: 10,
    //         // stp: 10,
    //     };

    //     // node.discoverReq('/3303/0/sensorValue', function (err, rsp) {
    //     //     console.log('>>>>> discover');
    //     //     console.log(rsp);
    //     // });
    //     node.writeAttrsReq('/3303/0/', attrs , function (err, rsp) {
    //         console.log('>>>>> writeAttrs test');
    //         console.log(rsp);

    //         node.observeReq('/3303/0/', function (err, rsp) {
    //             console.log('>>>>> observe test');
    //             console.log(err);
    //             console.log(rsp);
    //                     node.discoverReq('/3303/0/', function (err, rsp) {
    //                         console.log('>>>>> discover');
    //                         console.log(rsp);
    //                     });
    //         });
    //     });

    //     setTimeout(function () {
    //         node.observeReq('/3303/0/', { option: 1 }, function (err, rsp) {
    //             console.log('>>>>> stop observing');
    //             console.log(err);
    //             console.log(rsp);

    //                     node.discoverReq('/3303/0/', function (err, rsp) {
    //                         console.log('>>>>> discover after stop observing');
    //                         console.log(rsp);
    //                     });
    //         });
    //     }, 12000);

    // }, 2000);

    // observe test - lt, gt, step rules
    // runtest(function () {
    //     var attrs = {
    //         pmin: 1,
    //         pmax: 300,
    //         gt: 80,
    //         lt: 30,
    //         stp: 20
    //     };

    //     node.writeAttrsReq('/3303/0/sensorValue', attrs , function (err, rsp) {
    //         console.log('>>>>> writeAttrs test');
    //         console.log(rsp);

    //         node.observeReq('/3303/0/sensorValue', function (err, rsp) {
    //             console.log('>>>>> observe test');
    //             console.log(err);
    //             console.log(rsp);
    //         });
    //     });
    // }, 2000);


    // setInterval(function () {
    //     shepherd.announce('Hello World!');
    // }, 6000);
});