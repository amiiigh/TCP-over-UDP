let timer = setTimeout(() => {f()}, 3000);

let f = function () {
	console.log('running')
	timer = setTimeout(() => {f()}, 3000);	
}
