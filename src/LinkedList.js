function Node(value) {
	this.value = value;
	this.next = null;
}

module.exports = LinkedList;
function LinkedList(orderBy) {
	this._head = null;
	this._orderBy = orderBy;
}

const InsertionResult = LinkedList.InsertionResult = {
	INSERTED: 'inserted',
	EXISTS: 'exists',
	FAILED: 'failed'
};

LinkedList.prototype.insert = function (object) {
	let newNode = new Node(object);
	if (!this._head) {
		this._head = newNode;
		return InsertionResult.INSERTED;
	} else {
		let order = this._orderBy(newNode.value, this._head.value)
		if (order === 0) {
			return InsertionResult.EXISTS;
		} else if (order <= -1) {
			let temp = this._head;
			this._head = newNode;
			this._head.next = temp;
		} else if (order >= 1) {
			let currentNode = this._head;
			while (currentNode.next !== null && this._orderBy(newNode.value, currentNode.next.value) > 0 ) {
				currentNode = currentNode.next;
			}
			if (this._orderBy(newNode.value, currentNode.next.value) === 0) {
				return InsertionResult.EXISTS;
			}
			newNode.next = currentNode.next;
			currentNode.next = newNode;
		}
	}
};

LinkedList.prototype.clear = function () {
	this._head = null;
};

LinkedList.prototype.currentValue = function () {
	if (!this._head) {
		throw new Error('There aren\'t any nodes on the list.');
	}
	return this._head.value;
};

LinkedList.prototype.shift = function () {
	if (!this._head) {
		return false;
	}
	this._head = this._head.next;
	return true;
}

LinkedList.prototype.toArray = function () {
	let currentNode = this._head;
	let result = []
	while (currentNode !== null) {
		result.push(currentNode.value);
		currentNode = currentNode.next;
	}
	return result;
};