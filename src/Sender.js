var helpers = require('./helpers');
var constants = require('./constants');
var Packet = require('./Packet');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

module.exports = Sender;
function Sender(packetSender) {
	this._packetSender = packetSender;
	// TODO
	this._initialSequenceNumber = helpers.generateRandomNumber(constants.INITIAL_MAX_WINDOW_SIZE, constants.MAX_SEQUENCE_NUMBER)
	this._currentCongestionControlState = constants.CongestionControlStates.SLOW_START;
	this._retransmissionTimer = -1
	this._retransmissionTime = constants.INITIAL_RETRANSMISSION_INTERVAL;
	this._nextSequenceNumber = 0;
	this._nextExpectedSequenceNumber = 0;
	this._retransmissionQueue = [];
	this._sendingQueue = [];
	this._maxWindowSize = constants.INITIAL_MAX_WINDOW_SIZE;
}
util.inherits(Sender, EventEmitter);

Sender.prototype.send = function (data) {
	if (!this._sending) {
		this._sendData()
		this._sending = true;
	}
}

Sender.prototype.addDataToQueue = function (data) {
	let chunks = helpers.splitArrayLike(data, constants.UDP_SAFE_SEGMENT_SIZE);
	this._sendingQueue = this._sendingQueue.concat(chunks);
}

Sender.prototype.stopRetransmissionTimer = function () {
	clearTimeout(this._retransmissionTimer)
}

Sender.prototype.startRetranmissionTimer = function () {
	this._retransmissionTimer = setTimeout(this._retransmit, this._retransmissionTime)
}

Sender.prototype._retransmit = function() {
	for (packet of this._retransmissionQueue) {
		this._packetSender.send(packet)
	}
	this._startRetransmissionTimer()
};

Sender.prototype.sendSyn = function () {
	let synPacket = new Packet(this._initialSequenceNumber, 0, constants.PacketTypes.SYN, Buffer.alloc(0))
	synPacket.on('acknowledge', () => {
		this.emit('syn_acked');
	});
	this._nextSequenceNumber = this._initialSequenceNumber + 1;
	this._packetSender.send(synPacket);
	this._retransmissionQueue = []
	this._retransmissionQueue.push(synPacket)
};

Sender.prototype.getNextExpectedSequenceNumber = function () {
	return this._nextExpectedSequenceNumber;
}

Sender.prototype.setNextExpectedSequenceNumber = function (sequenceNumber) {
	this._nextExpectedSequenceNumber = sequenceNumber;
}

Sender.prototype.sendSynAck = function (sequenceNumber) {
	let synAckPacket = new Packet(this._initialSequenceNumber, sequenceNumber + 1, constants.PacketTypes.SYN_ACK, Buffer.alloc(0))
	synAckPacket.on('acknowledge', () => {
		this.emit('syn_ack_acked');
	});
	this._packetSender.send(synAckPacket)
	this._retransmissionQueue.push(synAckPacket)

};

Sender.prototype.sendAck = function (sequenceNumber) {
	this._packetSender.send(new Packet(this._nextSequenceNumber, sequenceNumber + 1, constants.PacketTypes.ACK, Buffer.alloc(0)))
};

Sender.prototype.sendFin = function () {
	let finPacket = new Packet(this._nextSequenceNumber, this._nextExpectedSequenceNumber, constants.PacketTypes.FIN, Buffer.alloc(0))
	finPacket.on('acknowledge', () => {
		this.emit('fin_acked');
	});
	this._packetSender.send(finPacket)
	this._retransmissionQueue.push(finPacket)
}

Sender.prototype._incrementSequenceNumber = function () {
	this._nextSequenceNumber +=1;
}

Sender.prototype._sendData = function () {
	if (this._retransmissionQueue.length < constants.INITIAL_MAX_WINDOW_SIZE){
		let payload = this._sendingQueue.shift();
		let sequenceNumber = this._nextSequenceNumber;
		this._incrementSequenceNumber();
		let packet = new Packet(sequenceNumber, this._nextExpectedSequenceNumber, constants.PacketTypes.DATA, payload);
		this._packetSender.send(packet)
		this._retransmissionQueue.push(packet)

	} else {
		// we wait
	}
};

Sender.prototype.verifyAck = function (sequenceNumber) {
	while (this._retransmissionQueue.length && this._retransmissionQueue[0].getSequenceNumber() <= sequenceNumber) {
		let packet = this._retransmissionQueue.shift();
		packet.acknowledge();
	}
}