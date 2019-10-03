var Sender = require('./Sender');
var Receiver = require('./Receiver');
var constants = require('./constants');
var Duplex = require('stream').Duplex;
var util = require('util');

module.exports = Connection;
function Connection(packetSender) {
	this._currentTCPState = constants.TCPStates.LISTEN;
	this._sender = new Sender(packetSender);
	this._receiver = new Receiver(packetSender);
	Duplex.call(this)

	var self = this;
	this._receiver.on('data', function (data) {
		self.emit('data', data)
	});
};

util.inherits(Connection, Duplex);

Connection.prototype.send = function (data) {
	this._sender.send(data);
};

Connection.prototype.receive = function (packet) {
	if (this._currentTCPState === constants.TCPStates.LISTEN) {
		switch(packet.getPacketType()) {
			case constants.PacketTypes.SYN:
			this._currentTCPState = constants.TCPStates.SYN_RCVD;
			this._packetSender.send(new Packet(constants.PacketTypes.ACK, packet.getSequenceNumber(), Buffer.alloc(0)))
			this._packetSender.send(new Packet(constants.PacketTypes.SYN, packet.getSequenceNumber(), Buffer.alloc(0)))
			default:
			break
		}
	} else if (this._currentTCPState === constants.TCPStates.SYN_RCVD) {
		switch(packet.getPacketType()) {
			case constants.PacketTypes.ACK:
			this._baseSequenceNumber = packet.getSequenceNumber();
			this._currentTCPState = constants.TCPStates.ESTABLISHED;
			default:
			break;
		}
	} else if (this._currentTCPState === constants.TCPStates.ESTABLISHED) {
		switch(packet.getPacketType()) {
			// here is data 
			case constants.PacketTypes.DATA:

		}
	}
	switch(packet.getPacketType()) {
		case constants.PacketTypes.DATA:
		this._receiver.receive(packet)
		case constants.PacketTypes.ACK:
		this._sender.positiveAck(packet.getSequenceNumber());
		default:
		this._receiver.receive(packet)
	}
};

Connection.prototype._write = function (chunk, encoding, callback) {
	this.send(chunk)
	callback()
}

Connection.prototype._read = function (n) {

}

Connection.prototype._final = function (callback) {
	callback()
}