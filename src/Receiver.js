var LinkedList = require('./LinkedList');
var constants = require('./constants');
var Packet = require('./Packet');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

module.exports = Receiver;
function Receiver(packetSender) {
  this._nextExpectedSequenceNumber = 0;
  this._initialSequenceNumber = 0;
  this._packets = new LinkedList(function (packetA, packetB) {
    return packetA.getSequenceNumber() - packetB.getSequenceNumber();
  });
  this._packetSender = packetSender;
}
util.inherits(Receiver, EventEmitter);

Receiver.prototype.setInitialSequenceNumber = function (sequenceNumber) {
	this._initialSequenceNumber = sequenceNumber;
}

Receiver.prototype.receive = function (packet) {
  if (packet.getSequenceNumber() < this._nextExpectedSequenceNumber) {
  	this.emit('send_ack', this._nextExpectedSequenceNumber)
    return;
  } else if (packet.getSequenceNumber() >= this._nextExpectedSequenceNumber) {
  	let insertionResult = this._packets.insert(packet);
  	if (insertionResult === LinkedList.InsertionResult.INSERTED) {
		this._pushIfExpectedSequence(packet);
  	} else if (insertionResult === LinkedList.InsertionResult.EXISTS) {
  		this.emit('send_ack', this._nextExpectedSequenceNumber)
  	}
  }
};

Receiver.prototype._pushIfExpectedSequence = function (packet) {
  if (packet.getSequenceNumber() === this._nextExpectedSequenceNumber) {
    this.emit('data', packet.getPayload());
    this._nextExpectedSequenceNumber += 1;
    this.emit('send_ack', this._nextExpectedSequenceNumber)
    this._packets.shift();
    if (this._packets.hasNext()) {
      this._pushIfExpectedSequence(this._packets.nextValue());
    }
  }
};