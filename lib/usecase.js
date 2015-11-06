var Mcute = require('mcute');

var mqServer = Mcute('freebird_mqtt_server', settings);

mqServer.permitJoin();
