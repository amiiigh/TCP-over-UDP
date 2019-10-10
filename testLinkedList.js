var LinkedList = require('./src/LinkedList');

var list = new LinkedList(function (packetA, packetB) {
    return packetA - packetB;
});


list.insert(9);
// console.log(list.toArray())
list.insert(8);
// console.log(list.toArray())
list.insert(5);
// console.log(list.toArray())
list.insert(6);
list.insert(7);
list.insert(7);
list.insert(7);
list.insert(1);
list.insert(9);
list.insert(1);
list.insert(3);
console.log(list.toArray())
list.shift()
console.log(list.toArray())
list.shift()
list.shift()
console.log(list.toArray())