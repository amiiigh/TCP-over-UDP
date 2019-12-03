var Queue = require('./src/Queue');

var q = new Queue();

var z = new Queue();


console.log(q.toArray())
q.enqueue(9, 9);
// console.log(q.toArray())
q.enqueue(8, 8);
// console.log(q.toArray())
q.enqueue(5, 5);
console.log(q.toArray())
q.dequeue();
// console.log(q.toArray())
z.enqueue(6, 6);
z.enqueue(7, 7);
z.enqueue(7, 7);
z.enqueue(8, 8);
z.enqueue(7, 7);
z.enqueue(1, 1);
// console.log(z.dequeue())
console.log(q.toArray())

console.log(q.toArray())
console.log(q.toArray())
console.log(q.toArray())
console.log(z.toArray())