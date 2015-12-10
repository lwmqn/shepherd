var Shepherd = require('./index');

var shepherd = new Shepherd('my_shepherd');


shepherd.start(function (err, res) {
	if (err) console.log(err);
});

shepherd.on('ready', function () {
    console.log('shepherd ready');
    //console.log(shepherd);
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

    node.readReq('tempSensor/').done(function (r) {
    	console.log('>>>>>>>> read tempSensor Object');
    	console.log(r);
    }, function (err) {
    	console.log(err);
    });

    setTimeout(function () {
    	setInterval(function () {
		    node.readReq('tempSensor/0/').done(function (r) {
		    	console.log('>>>>>>>> read tempSensor Instance');
		    	console.log(r);
		    }, function (err) {
		    	console.log(err);
		    });
    	}, 3200);

    }, 12000);

    setTimeout(function () {
    	setInterval(function () {
		    node.readReq('tempSensor/0/sensorValue').done(function (r) {
		    	console.log('>>>>>>>> read tempSensor Resource');
		    	console.log(r);
		    }, function (err) {
		    	console.log(err);
		    });
    	}, 4000);

    }, 15000);

});