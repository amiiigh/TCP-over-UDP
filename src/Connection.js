const Sender = require('./Sender');
const Receiver = require('./Receiver');
const constants = require('./constants');
const helpers = require('./helpers');
const Duplex = require('stream').Duplex;
const util = require('util');

module.exports = Connection;
function Connection(packetSender) {
	this._currentTCPState = constants.TCPStates.LISTEN;
	this._sender = new Sender(packetSender);
	this._receiver = new Receiver(packetSender);
	Duplex.call(this);
	var self = this;
	this._sender.on('syn_ack_acked', () => {
		this._changeCurrentTCPState(constants.TCPStates.ESTABLISHED)
		this.emit('connect')
	});
	this._sender.on('syn_acked', () => {
		this._changeCurrentTCPState(constants.TCPStates.ESTABLISHED)
		this._sender.send()
		this.emit('connect')
	});
	this._sender.on('fin_acked', () => {
		this._changeCurrentTCPState(constants.TCPStates.FIN_WAIT_2)
	});
	this._receiver.on('data', function (data) {
		self.emit('data', data)
	});
};

util.inherits(Connection, Duplex);

Connection.prototype.send = function (data) {
	this._sender.addDataToQueue(data)
	switch(this._currentTCPState) {
		case constants.TCPStates.LISTEN:
			this._sender.sendSyn();
			this._changeCurrentTCPState(constants.TCPStates.SYN_SENT)
			break;
		case constants.TCPStates.ESTABLISHED:
			this._sender.send();
			break;
	}
};

Connection.prototype.receive = function (packet) {
	console.log('got:', helpers.getKeyByValue(constants.PacketTypes, packet.getPacketType()))
	console.log(packet.toObject())
	switch(this._currentTCPState) {
		case constants.TCPStates.LISTEN:
			if (packet.getPacketType() === constants.PacketTypes.SYN) {
				this._sender.sendSynAck(packet.getSequenceNumber());
				this._changeCurrentTCPState(constants.TCPStates.SYN_RCVD)
			}
			break;
		case constants.TCPStates.SYN_SENT:
			if (packet.getPacketType() === constants.PacketTypes.SYN_ACK) {
				console.log('here', packet.getSequenceNumber(), packet.getAcknowledgementNumber())
				this._sender.verifyAck(packet.getAcknowledgementNumber())
				this._sender.sendAck(packet.getSequenceNumber())
			}
			break;
		case constants.TCPStates.SYN_RCVD:
			if (packet.getPacketType() === constants.PacketTypes.ACK) {
				this._sender.verifyAck(packet.getAcknowledgementNumber())
			}
			break;
		case constants.TCPStates.ESTABLISHED:
			switch(packet.getPacketType()) {
				case constants.PacketTypes.ACK:
					this._sender.verifyAck(packet.getAcknowledgementNumber())
					break;
				case constants.PacketTypes.FIN:
					this._sender.sendFinAck(packet.getSequenceNumber());
					this._changeCurrentTCPState(constants.TCPStates.LAST_ACK)
					break;
				default:
					console.log('here')
					// this._receiver.receive(packet);
			}
			break;
		case constants.TCPStates.LAST_ACK:
			if (packet.getPacketType() === constants.PacketTypes.ACK) {
				this._sender.verifyAck(packet.getAcknowledgementNumber());
				this._changeCurrentTCPState(constants.TCPStates.CLOSED)
						//delete the connection here !
			}
			break;
		case constants.TCPStates.FIN_WAIT_1:
			if (packet.getPacketType() === constants.PacketTypes.ACK) {
				this._sender.verifyAck(packet.getAcknowledgementNumber());
			}
			break;
		case constants.TCPStates.FIN_WAIT_2:
			if (packet.getPacketType() === constants.PacketTypes.FIN) {
				this._sender.sendAck(packet.getSequenceNumber())
				this._changeCurrentTCPState(constants.TCPStates.TIME_WAIT)
				setTimeout(() => {
					this._changeCurrentTCPState(constants.TCPStates.CLOSED)
					this.emit('close')
				}, constants.CLOSE_WAIT_TIME);
			}
			break;
		case constants.TCPStates.TIME_WAIT:
			if (packet.getPacketType() === constants.PacketTypes.FIN) {
				this._sender.sendAck(packet.getSequenceNumber())
			}
			break;
	}
};

Connection.prototype._changeCurrentTCPState = function (newState) {
	console.log('change state:', helpers.getKeyByValue(constants.TCPStates, this._currentTCPState), '->', helpers.getKeyByValue(constants.TCPStates, newState))
	this._currentTCPState = newState;
}

Connection.prototype.close = function () {
	this._sender.sendFin()
	this._changeCurrentTCPState(constants.TCPStates.FIN_WAIT_1)
}

Connection.prototype._write = function (chunk, encoding, callback) {
	this.send(chunk)
	callback()
}

Connection.prototype._read = function (n) {

}

Connection.prototype._final = function (callback) {
	callback()
}