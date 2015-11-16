var _ = require('lodash');

var x = {
    'barney': {
        kelly: {
            john: 'doe',
            '1': [ 220, 110 ]
        },
        yoman: 'pppp'
    },
    'fred': 40,
    hey: {
        man: 'here'
    }
};

var res = extract('', x);

console.log(res);

function extract(rootPath, obj, arr) {
    var result = {};

    if (rootPath !== '' && rootPath !== '.' && rootPath !== '/' && !_.isUndefined(rootPath))
        rootPath = rootPath + '.';

    _.forEach(obj, function (n, key) {
        if (_.isObject(n)) {
            var tmp;
            if (arr)
                key = '[' + key + ']';

            tmp = extract(rootPath + key, n, _.isArray(n));
            _.assign(result, tmp);
        } else {
            result[rootPath + key] = n;
        }
    });

    return result;
}