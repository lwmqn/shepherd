var util = require('util'),
    moment = require('moment'),
    Shepherd = require('./index');

var shepherd = new Shepherd('my_shepherd');
var preUnix = null,
    nowUnix = null;
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

var t = 0;
shepherd.on('notified', function (msg) {
    // preUnix = nowUnix;
    // nowUnix = moment().unix();

    // // t++;
    // // if (t > 5) {
    // //     shepherd._responseSender('notify', msg.clientId, { transId: msg.transId, status: 204, cancel: true });
    // //     t = 0;
    // // }

    // var tdf = nowUnix - preUnix;
    // tdf  = tdf > 10000 ? 0 : tdf;
    // console.log('>>>>>>>>>> NOTIFIED');
    // console.log(tdf);
    // console.log(msg.data);

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

//     setTimeout(function () {
// //     setInterval(function () {
//             node.writeAttrsReq('/tempSensor/0/sensorValue', {
//                 pmin: 1,
//                 pmax: 4
//                 // gt: 100,
//                 // lt: 50,
//                 // step: 20
//             }).done(function (r) {
//                 // setTimeout(function () {
//                 //     node.writeAttrsReq('/tempSensor/0/sensorValue', {
//                 //                     cancel: true
//                 //                 }).done(function (r) {
//                 //                     console.log('cancel observe');
//                 //                     console.log(r);
//                 //                 });
//                 // }, 10000);
//                 node.observeReq('/tempSensor/0/sensorValue').done(function (x) {
//                     console.log('OBSERVER RSP');
//                     console.log(x);
//                 }, function (err) {
//                     console.log(err);
//                 });

//              console.log('>>>>>>>> Write Attrs');
//              console.log(r);
//                 setTimeout(function () {
//                     shepherd.announce('Announce to the world!!!');
//                 }, 3000);


//             }, function (err) {
//                 console.log('>>>>>>>> Write Attrs ERR');
//                 console.log(err);
//                 console.log(node.shepherd._nodebox[node.clientId]);
//                 setTimeout(function () {
//                     console.log(node.shepherd._rspsToResolve);
//                 }, 3000);
                
//             });
//      // }, 3200);

//     }, 5000);



});