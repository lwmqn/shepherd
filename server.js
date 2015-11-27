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