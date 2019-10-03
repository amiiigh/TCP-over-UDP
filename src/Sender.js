var helpers = require('./helpers');
var constants = require('./constants');
var PendingPacket = require('./PendingPacket');
var Packet = require('./Packet');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

module.exports = Sender;
function Sender(packetSender) {
	this._packetSender = packetSender;
	this._sendingQueue = [];
	this._currentCongestionControlState = constants.CongestionControlStates.SLOW_START;
	this._currentTCPState = constants.TCPStates.CLOSED;
	this._baseSequenceNumber = Math.floor(Math.random() * (1000)); // initial value needs further work
	this._nextSequenceNumber = this._baseSequenceNumber + 1;
	this._retransmissionQueue = {};
	this._maxWindowSize = constants.INITIAL_MAX_WINDOW_SIZE;
	this._sendInterval = constants.INITIAL_SEND_INTERVAL;
}

Sender.prototype.send = function (data) {
	if (this._currentTCPState === constants.TCPStates.CLOSED) {
		this._currentTCPState = constants.TCPStates.SYN_SENT
		this._packetSender.send(new Packet(constants.PacketTypes.SYN, this._baseSequenceNumber, Buffer.alloc(0)))
	} else if (this._currentTCPState === constants.TCPStates.SYN_SENT) {

	} else if (this._currentTCPState === constants.TCPStates.ESTABLISHED) {
		
	}
	var chunks = helpers.splitArrayLike(data, constants.UDP_SAFE_SEGMENT_SIZE);
	this._sendingQueue = this._sendingQueue.concat(chunks);
	if (!this._sending) {
		this._sendData()
		this._sending = true;
	}
}

Sender.prototype._sendData = function () {
	var self = this;
	if (this._lostList.length) {
		var sequenceNumber = this._lostList.shift()
		var packet = this._window[sequenceNumber]
		this._packetSender.send(packet)
	} else if (this._sendingQueue.length && Object.keys(this._window).length < constants.INITIAL_MAX_WINDOW_SIZE) {
		var payload = this._sendingQueue.shift();
		var sequenceNumber = this._nextSequenceNumber;
		var packet = new Packet(constants.PacketTypes.DATA, this._nextSequenceNumber, payload);
		this._nextSequenceNumber += 1;
		this._window[sequenceNumber] = packet
	} else {
		//we wait 
	}
	if (this._enable){
		setTimeout(this._sendData, this._sendInterval)
	}
}

Sender.prototype.positiveAck = function (sequenceNumber) {
	if (sequenceNumber === this._baseSequenceNumber) {
		this._isSynched = true;
	} else {

	}
}