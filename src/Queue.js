function Node(id, value) {
	this.id = id;
	this.value = value;
	this.next = null;
}

module.exports = Queue;
function Queue() {
	this._ids = {};
	this.size = 0;
	this._head = null;
	this._tail = null;
}

Queue.prototype.getIterator = function () {
	return Object.assign({}, this._head);
}

Queue.prototype.enqueue = function (id, object) {
	if (!!this._ids[id]){
		return
	}
	let newTail = new Node(id, object);
	this._ids[id] = newTail;
	if (this._head === null) {
		this._head = newTail

      	this._tail = newTail

	} else {
		this._tail.next = newTail;
		this._tail = newTail;
	}
	this.size = this.size + 1;
}


Queue.prototype.dequeue = function () {
	if (this._head === null) {
		return null;
	}
	this.size = this.size - 1;
	let node = new Node(this._head.id, this._head.value);
	delete this._ids[node.id]
	this._head = this._head.next;
	return node;
}

Queue.prototype.clear = function () {
	this._head = null;
	this._tail = null;
	this.size = 0;
};

Queue.prototype.currentNode = function () {
	if (this._head === null) {
		return null;
	}
	return this._head;
}

Queue.prototype.currentValue = function () {
	if (this._head === null) {
		return null;
	}
	return this._head.value;
};

Queue.prototype.toArray = function () {
	let list = [];
	let iter = this.getIterator();
	while(iter) {
		list.push(iter.value)
		iter = iter.next;
	}
	return list;
}
