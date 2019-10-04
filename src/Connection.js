var Sender = require('./Sender');
var Receiver = require('./Receiver');
var constants = require('./constants');
var Duplex = require('stream').Duplex;
var util = require('util');

module.exports = Connection;
function Connection(packetSender) {
	this._currentConnectionTCPState = constants.TCPStates.LISTEN;
	this._sender = new Sender(packetSender);
	this._receiver = new Receiver(packetSender);
	Duplex.call(this);
	var self = this;
	this._receiver.on('data', function (data) {
		self.emit('data', data)
	});
};

util.inherits(Connection, Duplex);

Connection.prototype.send = function (data) {
	switch(this._currentTCPState) {
		case constants.TCPStates.CLOSED:
			this._sender.sendSyn();
			this._currentTCPState = constants.TCPStates.SYN_SENT;
			break;
		case constants.TCPStates.SYN_SENT:
			break;
		case constants.TCPStates.ESTABLISHED:
			this._sender.send(data);
			break;
	}
};

Connection.prototype.receive = function (packet) {
	switch(this._currentTCPState) {
		case constants.TCPStates.LISTEN:
			switch(packet.getPacketType()) {
				case constants.PacketTypes.ACK:
					this._baseSequenceNumber = packet.getSequenceNumber();
					this._currentTCPState = constants.TCPStates.ESTABLISHED;
				case constants.PacketTypes.SYN:
					this._sender.sendSynAck(packet.getSequenceNumber());
					this._currentTCPState = constants.TCPStates.SYN_RCVD;
				default:
					break;
			}
			break;
		case constants.TCPStates.SYN_SENT:
			switch(packet.getPacketType()) {
				case constants.PacketTypes.SYN_ACK:
					this._sender.verifyAck(packet.getSequenceNumber())
					this._sender.sendAck(packet.getSequenceNumber())
					this.emit('connect')
					this._currentTCPState = constants.TCPStates.ESTABLISHED;
					break;
			}
			// if acked and got the syn go to established
			break;
		case constants.TCPStates.SYN_RCVD:
			switch(packet.getPacketType()) {
				case constants.PacketTypes.ACK:
					this._sender.verifyAck(packet.getSequenceNumber());
					this.emit('connect');
					this._currentTCPState = constants.TCPStates.ESTABLISHED;
					break;
			}
			break;
		case constants.TCPStates.ESTABLISHED:
			this._receiver.receive(packet);
			break;
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