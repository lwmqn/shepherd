var x = {
	x1: 3,
	x2: (function () {
		return this.x1;
	}())
};

console.log(x);