var _ = require('lodash');
var points = [40, 100, 1, 5, 25, 10];
//console.log(points.sort());

function x() {
	var c = arguments[0],
		path = '';
	_.forEach(arguments, function (arg, i) {
		if (i === 0) return;
		path = path + arg + c;
	});

	return path.slice(0, path.length - 1);
}

console.log(x('/', 'xsd', 1, 2, 'hh', 6, 7, 111));