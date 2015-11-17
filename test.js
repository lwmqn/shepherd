var _ = require('lodash');

var diff = require('deep-diff').diff;
var observableDiff = require('deep-diff').observableDiff,
    applyChange = require('deep-diff').applyChange;

var x1 = {
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

var x2 = {
    'barney': {
        kelly: {
            john: 'doe1',
            '1': [ 220, 60 ]
        },
        yoman: 'pppp'
    },
    'fred3': 40,
    hey1: {
        man: 'here'
    }
};

var y1 = 8;
var y2 = 10;

var deff = diff(x1, x2);
var deff2 = diff(y1, y2);
console.log(deff2);

// var p = 'barney.kelly';
// var y = _.get(x, p);
// _.set(x, p, {john: 'xxxx'});
//y[1] = '2222';

// console.log(x);

// var res = buildPathValuePairs('/dev/oop/', 8);

// console.log(res);
// function buildPathValuePairs (rootPath, obj) {
//     var result = {};

//     rootPath = returnPathInDotNotation(rootPath);

//     if (_.isObject(obj)) {
//         if (rootPath !== '' && rootPath !== '.' && rootPath !== '/' && !_.isUndefined(rootPath))
//             rootPath = rootPath + '.';

//         _.forEach(obj, function (n, key) {
//             if (_.isObject(n)) {
//                 var tmp = buildPathValuePairs(rootPath + key, n);
//                 _.assign(result, tmp);
//             } else {
//                 result[rootPath + key] = n;
//             }
//         });
//     } else {
//         result[rootPath] = obj;
//     }

//     return result;
// }


// function returnPathInDotNotation (path) {
//     path = path.replace(/\//g, '.');           // tranform slash notation into dot notation

//     if (path[0] === '.')                       // if the first char of topic is '.', take it off
//         path = path.slice(1);

//     if (path[path.length-1] === '.')          // if the last char of topic is '.', take it off
//         path = path.slice(0, path.length-1);


//     return path;
// }
