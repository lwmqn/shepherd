var util = require('util'),
    crypto = require('crypto'),
    moment = require('moment'),
    Shepherd = require('./index');

var shepherd = new Shepherd('my_shepherd');
var preUnix = null,
    nowUnix = null;


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
    setTimeout(function () {
        shepherd.permitJoin(20);
    }, 2000);
    shepherd.on('priphDisconnected', function (c) {
        console.log('some one disconnected');
        console.log(c.id);
    });
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
    console.log('>>>>>>>>>> NOTIFIED');
    console.log(msg);

    var n = shepherd.find(msg.clientId);

});

shepherd.on('ind:status', function (qnode, status) {
    console.log('ind:status');
    console.log(qnode.status);
    console.log(status);
});

shepherd.on('ind:incoming', function (node) {
    console.log('NODE INCOMING');
    console.log(node.clientId);
    console.log(node.status);

    // read test - resource
    runtest(function () {
        node.readReq('/generic/0/sensorValue', function (err, rsp) {
            console.log('>>>>> read test');
            if (err)
                console.log(err);

            console.log(rsp);
        });
    }, 5000, 2000);

    // observe test - lt, gt, step rules
    runtest(function () {
        var attrs = {
            pmin: 5,
            pmax: 100,
            gt: 800,
            lt: 100,
            stp: 60
        };

        node.writeAttrsReq('/generic/0/sensorValue', attrs , function (err, rsp) {
            console.log('>>>>> writeAttrs test');
            console.log(err);
            console.log(rsp);

            node.observeReq('/generic/0/sensorValue', function (err, rsp) {
                console.log('>>>>> observe test');
                console.log(err);
                console.log(rsp);
            });
        });
    }, 2000);


    // setInterval(function () {
    //     shepherd.announce('Hello World!');
    // }, 6000);
});