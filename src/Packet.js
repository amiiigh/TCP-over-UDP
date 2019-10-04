var constants = require('./constants');
//  0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |                        Sequence Number                        |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |                    Acknowledgment Number                      |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |                                                       |A|R|S|F|
// |                           Reserved                    |C|S|Y|I|
// |                                                       |K|T|N|N|
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |                             data                              |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

module.exports = Packet;

function Packet(sequenceNumber, acknowledgementNumber, packetType, payload) {
    this._sequenceNumber = sequenceNumber;
    this._acknowledgeNumber = acknowledgementNumber;
    this._packetType = packetType;
    this._isAcked = false;
    this._payload = payload;
};

Packet.fromBuffer(buffer) {
    let sequenceNumber = buffer.readUInt32BE(0);
    let acknowledgementNumber = buffer.readUInt32BE(1);
    let options = buffer.readUInt32BE(2).slice(-1);
    let packetType;
    switch (options) {
        case 1:
            packetType = constants.PacketTypes.FIN;
            break;
        case 2:
            packetType = constants.PacketTypes.SYN;
            break;
        case 4:
            packetType = constants.PacketTypes.RST;
            break;
        case 8:
            packetType = constants.PacketTypes.ACK;
            break;
        case 10:
            packetType = constants.PacketTypes.SYN_ACK;
            break;
        default:
            packetType = constants.PacketTypes.DATA;
    }
    let payload = Buffer.alloc(buffer.length - 12);//header size = 12 byte
    buffer.copy(payload, 0, 12);
    return new Packet(sequenceNumber, acknowledgementNumber, packetType, payload)
};

Packet.prototype.getSequenceNumber = function() {
    return this._sequenceNumber;
};

Packet.prototype.getAcknowledgementNumber = function () {
    return this._acknowledgeNumber;
}

Packet.prototype.getPayload = function() {
    return this._payload;
};

Packet.prototype.getPacketType = function() {
    return this._packetType;
}

// check if you need this or not
Packet.prototype.IsAck = function() {
    return this._packetType === constants.PacketTypes.ACK
};

Packet.prototype.toBuffer = function() {
    var retval = Buffer.alloc(12 + this._payload.length);
    retval.writeUInt32BE(this._sequenceNumber);
    retval.writeUInt32BE(this._acknowledgeNumber, 1);
    switch (this._packetType) {
        case constants.PacketTypes.FIN:
            retval.writeUInt32BE(1, 2)
            break;            
        case constants.PacketTypes.SYN:
            retval.writeUInt32BE(2, 2)
            break;
        case constants.PacketTypes.RST:
            retval.writeUInt32BE(4, 2)
            break;
        case constants.PacketTypes.ACK:
            retval.writeUInt32BE(8, 2)
            break;
        case constants.PacketTypes.SYN_ACK:
            retval.writeUInt32BE(10, 2)
            break;
        default:
            break;
    }
    //header size should be a constant 5 !
    this._payload.copy(retval, 12, 0);
    return retval;
}