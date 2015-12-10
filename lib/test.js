var _ = require('lodash');

var dotPath = function (path) {
    path = path.replace(/\//g, '.');           // tranform slash notation into dot notation

    if (path[0] === '.')                       // if the first char of topic is '.', take it off
        path = path.slice(1);

    if (path[path.length-1] === '.')           // if the last char of topic is '.', take it off
        path = path.slice(0, path.length-1);

    return path;
};

var buildPathValuePairs = function (rootPath, obj) {
    var result = {};

    rootPath = dotPath(rootPath);

    if (_.isObject(obj)) {
        if (rootPath !== '' && rootPath !== '.' && rootPath !== '/' && !_.isUndefined(rootPath))
            rootPath = rootPath + '.';

        _.forEach(obj, function (n, key) {
            // Tricky: objList is an array, don't buid its full path, or updating new list will fail
            if (_.isObject(n) && key !== 'objList')
                _.assign(result, buildPathValuePairs(rootPath + key, n));
            else
                result[rootPath + key] = n;
        });
    } else {
        result[rootPath] = obj;
    }

    return result;
};

var objectDiff = function (oldObj, newObj) {
    var pvp = buildPathValuePairs('/', newObj),
        diff = {};

    _.forEach(pvp, function (val, path) {
        if (!_.has(oldObj, path) || _.get(oldObj, path) !== val)
            _.set(diff, path, val);
    });

    return diff;
};


var x = {
	x1: 3,
	x2: 'hi',
	x3: {
		x31: 'hello',
		x32: 'world',
		x33: [ 1, 2, 3 ],
		x34: {
			x341: 100,
			x342: false
		}
	}
};

var y = {
	x1: 20,
	x2: 'hi',
	x3: {
		x31: 'hellox',
		x32: 'world',
		x33: [ 3, 2, 1 ],
		x34: {
			x341: 100,
			x342: true
		}
	}
};
//console.log(_.isEqual(x.sort(), y.sort()));
console.log(objectDiff(x, y));