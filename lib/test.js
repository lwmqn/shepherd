var _ = require('lodash');

var x = {
    y: {
        20: {
            z: 100
        }
    }
};

console.log(_.has(x, 'y.20.f'));

var str = "VisitMicrosoft!";
var res = str.split("Visit");
console.log(res);

var k = {};
_.set(k, 0, 'hi');
console.log(k);
