var constants = require('./constants');
module.exports = Packet;
function Packet(packetType, sequenceNumber, payload) {
	this._packetType = packetType
	this._sequenceNumber = sequenceNumber
	this._payload = payload
};

Packet.fromBuffer(buffer) {
	var packetType;
    var flags = buffer.readUInt8(0);
    //should be able to detect bad packets
    switch(flags) {
    	case 0x10:
    		packetType = constants.PacketTypes.DATA;
    		break;
    	case 0x20:
    		packetType = constants.PacketTypes.ACK;
    		break;
    	case 0x40;
    		packetType = constants.PacketTypes.NACK;
    		break;
    	default:
    		//this is error
    		break
    }
    var sequenceNumber = buffer.readUInt32BE(1);
    var payload = Buffer.alloc(buffer.length - 5);
    buffer.copy(this._payload, 0, 5);
    return new Packet(packetType, sequenceNumber, payload)
};

Packet.prototype.getSequenceNumber = function () {
  return this._sequenceNumber;
};

Packet.prototype.getPayload = function () {
  return this._payload;
};

Packet.prototype.getPacketType = function () {
	return this._packetType;
}

Packet.prototype.IsAck = function () {
  return this._packetType === constants.PacketTypes.ACK
};

Packet.prototype.IsData = function () {
  return this._packetType === constants.PacketTypes.DATA
};

Packet.prototype.toBuffer = function () {
  var retval = Buffer.alloc(5 + this._payload.length);
  switch(this._packetType) {
  	case constants.PacketTypes.DATA:
  		retval.writeUInt8(0x10)
	  	break;
  	case constants.PacketTypes.ACK:
  		retval.writeUInt8(0x20)
  		break;
  	case constants.PacketTypes.NACK:
  		retval.writeUInt8(0x40)
  		break;
  	default:
  		break;
  }

  retval.writeUInt32BE(this._sequenceNumber, 1);
  //header size should be a constant 5 !
  this._payload.copy(retval, 5, 0);
  return retval;
}

Packet.prototype.toObject = function () {
  return {
    acknowledgement: this.getIsAcknowledgement(),
    synchronize: this.getIsSynchronize(),
    finish: this.getIsFinish(),
    reset: this.getIsReset(),
    sequenceNumber: this.getSequenceNumber(),
    payload: this.getPayload().toString('base64')
  }
};