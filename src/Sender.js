var helpers = require('./helpers');
var constants = require('./constants');
var Packet = require('./Packet');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

module.exports = Sender;
function Sender(packetSender) {
	this._packetSender = packetSender;
	this._initialSequenceNumber = helpers.generateRandomNumber(constants.INITIAL_MAX_WINDOW_SIZE, constants.MAX_SEQUENCE_NUMBER)
	this._currentCongestionControlState = constants.CongestionControlStates.SLOW_START;
	this._retransmissionTimer = -1;
	this._retransmissionInterval = constants.Retransmission.INITIAL_RETRANSMISSION_INTERVAL;
	this._estimatedRTT = 0;
	this._devRTT = 0;
	this._nextSequenceNumber = 0;
	this._retransmissionQueue = [];
	this._sendingQueue = [];
	this._maxWindowSize = constants.INITIAL_MAX_WINDOW_SIZE;
	this._delayedAckTimer = null;

	this._startRetransmissionTimer();
	this.on('ready', () => {
		if (this._sending) {
			this._sendData();
		}
	})
}
util.inherits(Sender, EventEmitter);

Sender.prototype.close = function () {
	this._retransmissionQueue = [];
	this._sendingQueue = [];
	this._delayedAckTimer = null;
	this._retransmissionTimer = null;
}

Sender.prototype.send = function () {
	this._sending = true;
	this._sendData()
}

Sender.prototype.addDataToQueue = function (data) {
	let chunks = helpers.splitArrayLike(data, constants.UDP_SAFE_SEGMENT_SIZE);
	this._sendingQueue = this._sendingQueue.concat(chunks);
}

Sender.prototype._stopRetransmissionTimer = function () {
	clearTimeout(this._retransmissionTimer)
	this._retransmissionTimer = null;
}

Sender.prototype._startRetransmissionTimer = function () {
	this._numberOfRetransmission = 0;
	this._retransmissionTimer = setTimeout(() => {
		this._retransmit();
	}, this._retransmissionInterval)
}

Sender.prototype.restartRetransmissionTimer = function () {
	this._stopRetransmissionTimer();
	this._startRetransmissionTimer();
}

Sender.prototype._retransmit = function () {
	if (this._retransmissionQueue.length !== 0) {
		this._numberOfRetransmission += 1;
	}
	if (this._numberOfRetransmission > constants.Retransmission.MAX_NUMBER_OF_RETRANSMISSION) {
		this._stopRetransmissionTimer();
		this.emit('max_number_of_tries_reached');
	} else {
		for (packetObject of this._retransmissionQueue) {
			this._packetSender.send(packetObject.packet)
			packetObject.retransmitted = true;
		}
		this._retransmissionTimer = setTimeout(() => {
			this._retransmit();
		}, this._retransmissionInterval)
	}
};

Sender.prototype._pushToRetransmissionQueue = function (packet) {
	let packetObject = {
		packet: packet,
		retransmitted: false,
		sentTime: process.hrtime(),
	}
	this._retransmissionQueue.push(packetObject)
};

Sender.prototype.sendSyn = function () {
	let synPacket = new Packet(this._initialSequenceNumber, 0, constants.PacketTypes.SYN, Buffer.alloc(0))
	synPacket.on('acknowledge', () => {
		this.emit('syn_acked');
	});
	this._nextSequenceNumber = this._initialSequenceNumber + 1;
	this._packetSender.send(synPacket);
	this._retransmissionQueue = []
	this._pushToRetransmissionQueue(synPacket)
};

Sender.prototype.sendSynAck = function (nextExpectedSequenceNumber) {
	this._nextExpectedSequenceNumber = nextExpectedSequenceNumber;
	this._nextSequenceNumber = this._initialSequenceNumber + 1;
	let synAckPacket = new Packet(this._initialSequenceNumber, this._nextExpectedSequenceNumber, constants.PacketTypes.SYN_ACK, Buffer.alloc(0))
	synAckPacket.on('acknowledge', () => {
		this.emit('syn_ack_acked');
	});
	this._packetSender.send(synAckPacket)
	this._pushToRetransmissionQueue(synAckPacket)
};

Sender.prototype.sendAck = function (nextExpectedSequenceNumber, immediate = true) {
	this._nextExpectedSequenceNumber = nextExpectedSequenceNumber;
	if (immediate === true) {
		this._packetSender.send(new Packet(this._nextSequenceNumber, this._nextExpectedSequenceNumber, constants.PacketTypes.ACK, Buffer.alloc(0)))
	} else if (immediate === false && this._delayedAckTimer === null) {
		this._delayedAckTimer = setTimeout(()=> {
			this.sendAck(this._nextExpectedSequenceNumber, true);
			this._delayedAckTimer = null;
		}, constants.DELAYED_ACK_TIME)
	}
};

Sender.prototype._updateRTT = function (sampleRTT) {
	sampleRTT = sampleRTT[0] * 1000 + sampleRTT[1] / 1000000;
	this._estimatedRTT = (1 - constants.Retransmission.ALPHA) * this._estimatedRTT + constants.Retransmission.ALPHA * sampleRTT
	this._devRTT = (1 - constants.Retransmission.BETA) * this._devRTT + constants.Retransmission.BETA * Math.abs(sampleRTT - this._estimatedRTT);
	this._retransmissionInterval = Math.floor(this._estimatedRTT + 4 * this._devRTT);
	console.log('RTT updated', this._retransmissionInterval)
}

Sender.prototype.sendFin = function () {
	let finPacket = new Packet(this._nextSequenceNumber, this._nextExpectedSequenceNumber, constants.PacketTypes.FIN, Buffer.alloc(0))
	finPacket.on('acknowledge', () => {
		this.emit('fin_acked');
	});
	this._packetSender.send(finPacket)
	this._pushToRetransmissionQueue(finPacket)
}

Sender.prototype._incrementSequenceNumber = function () {
	this._nextSequenceNumber = (this._nextSequenceNumber + 1) % constants.MAX_SEQUENCE_NUMBER;
}

Sender.prototype._windowHasSpace = function () {
	return this._retransmissionQueue.length < this._maxWindowSize;
}

Sender.prototype._sendData = function () {
	while (this._sendingQueue.length && this._windowHasSpace()) {
		let payload = this._sendingQueue.shift();
		let sequenceNumber = this._nextSequenceNumber;
		this._incrementSequenceNumber();
		let packet = new Packet(sequenceNumber, this._nextExpectedSequenceNumber, constants.PacketTypes.DATA, payload);
		this._packetSender.send(packet)
		this._pushToRetransmissionQueue(packet)
	}
};

Sender.prototype.verifyAck = function (sequenceNumber) {
	if (sequenceNumber > this._nextExpectedSequenceNumber) {
		this._nextExpectedSequenceNumber = (sequenceNumber + 1) % constants.MAX_SEQUENCE_NUMBER;
	}
	while (this._retransmissionQueue.length && this._retransmissionQueue[0].packet.getSequenceNumber() < sequenceNumber) {
		let packetObject = this._retransmissionQueue.shift();
		packetObject.packet.acknowledge();
		if (packetObject.retransmitted === false) {
			let sampleRTT = process.hrtime(packetObject.sentTime)
			this._updateRTT(sampleRTT);
		}
	}
	if (this._retransmissionQueue.length < this._maxWindowSize) {
		this.emit('ready')
	}
}