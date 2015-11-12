var x = '/xxxxy/';
console.log(x);
// x = x.replace('.', function (c) {
// 	return '/';
// });
x = x.replace(/\./g, '/');
// for (var i = 0, len = x.length; i < len; i++) {
// 	if (x[i] === ".") {
// 		console.log('fuck');
// 		x[i] = '0';
// 	}//x[i] = "a";
// 	//console.log(x[i]);
// }
console.log(x);
// if (x[0] === '/') x = x.slice(1);
// if (x[x.length-1] === '/') {
// 	x = x.slice(0, x.length-1);
// 	console.log(x);
// }

// var y = x.split('/');
// console.log(y);