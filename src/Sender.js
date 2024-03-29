var helpers = require('./helpers');
var constants = require('./constants');
var Packet = require('./Packet');
var Queue = require('./Queue');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

module.exports = Sender;
function Sender(connection, packetSender) {
  this._packetSender = packetSender;
  this._connection = connection;
  this._duplicateAckCount = 0;
  this._currentCongestionControlState = constants.CongestionControl.States.SLOW_START;
  this._timeoutTimer = null;
  this._samplingTimer = null;
  this._timeoutInterval = constants.Retransmission.INITIAL_RETRANSMISSION_INTERVAL;
  this._estimatedRTT = 0;
  this._devRTT = 0;
  this._slowStartThreshold = constants.CongestionControl.INITIAL_SLOW_START_THRESHOLD;
  this._retransmissionQueue = new Queue();
  this._sendingQueue = Buffer.alloc(0);
  this._maxWindowSize = constants.INITIAL_MAX_WINDOW_SIZE;
  this._delayedAckTimer = null;
  this._sample = true;
  this._startSamplingTimer();
}
util.inherits(Sender, EventEmitter);

Sender.prototype.clear = function () {
  clearInterval(this._samplingTimer);
  this._retransmissionQueue.clear();
  this._sendingQueue = Buffer.alloc(0);
}

Sender.prototype.send = function () {
  this._sending = true;
  this._sendDataLoop()
}

Sender.prototype.addDataToQueue = function (data) {
  this._sendingQueue = Buffer.concat([this._sendingQueue, data])
}

Sender.prototype._stopSamplingTimer = function () {
  clearInterval(this._samplingTimer);
  this._samplingTimer = null;
}

Sender.prototype._startSamplingTimer = function () {
  this._samplingTimer = setInterval(() => {
    this._sample = true
  }, constants.SAMPLING_INTERVAL);
}

Sender.prototype._stopTimeoutTimer = function () {
  clearTimeout(this._timeoutTimer);
  this._timeoutTimer = null;
}

Sender.prototype._startTimeoutTimer = function () {
  this._timeoutCount = 0;
  this._timeoutTimer = setTimeout(() => {
    this._timeout();
  }, this._timeoutInterval)
}

Sender.prototype.restartTimeoutTimer = function () {
  this._timeoutCount = 0;
  this._stopTimeoutTimer();
  this._startTimeoutTimer();
}

Sender.prototype._timeout = function () {
  switch(this._currentCongestionControlState) {
    case constants.CongestionControl.States.SLOW_START:
      this._slowStartThreshold = Math.floor(this._maxWindowSize / 2);
      this._maxWindowSize = constants.INITIAL_MAX_WINDOW_SIZE;
      this._duplicateAckCount = 0;
      this._retransmit();
      break;
    case constants.CongestionControl.States.CONGESTION_AVOIDANCE:
    case constants.CongestionControl.States.FAST_RECOVERY:
      this._slowStartThreshold = Math.floor(this._maxWindowSize / 2);
      this._maxWindowSize = constants.INITIAL_MAX_WINDOW_SIZE;
      this._duplicateAckCount = 0;
      this._retransmit();
      this._changeCurrentCongestionControlState(constants.CongestionControl.States.SLOW_START);
      break;
  }
  if (this._retransmissionQueue.size) {
    this._timeoutCount += 1;
  }
  this._timeoutTimer = setTimeout(() => {
    this._timeout();
  }, this._timeoutInterval)
}

Sender.prototype._retransmit = function () {
  let packetsCount = Math.min(this._retransmissionQueue.size, Math.floor(this._maxWindowSize));
  let iterator = this._retransmissionQueue.getIterator();
  for (let i = 0; i < packetsCount; i++) {
    let packetObject = iterator.value;
    this._packetSender.send(packetObject.packet);
    packetObject.retransmitted = true;
    iterator = iterator.next
  }
};

Sender.prototype._pushToRetransmissionQueue = async function (packet) {
  let packetObject = {
    packet: packet,
    retransmitted: false,
    sampling: this._sample
  }
  if (this._sample) {
    packetObject.sentTime = process.hrtime();
    this._sample = false;
  }
  await this._retransmissionQueue.enqueue(packet.sequenceNumber, packetObject)
  if (this._timeoutTimer === null) {
    this._startTimeoutTimer();
  }
};

Sender.prototype.sendSyn = async function () {
  let synPacket = new Packet(this._connection.initialSequenceNumber, this._connection.nextExpectedSequenceNumber, constants.PacketTypes.SYN, Buffer.alloc(0))
  synPacket.on('acknowledge', () => {
    this.emit('syn_acked');
  });
  this._packetSender.send(synPacket);
  this._retransmissionQueue = new Queue();
  await this._pushToRetransmissionQueue(synPacket)
};

Sender.prototype.sendSynAck = async function () {
  let synAckPacket = new Packet(this._connection.initialSequenceNumber, this._connection.nextExpectedSequenceNumber, constants.PacketTypes.SYN_ACK, Buffer.alloc(0))
  synAckPacket.on('acknowledge', () => {
    this.emit('syn_ack_acked');
  });
  this._packetSender.send(synAckPacket)
  await this._pushToRetransmissionQueue(synAckPacket)
};

Sender.prototype.sendAck = function (immediate = true) {
  if (immediate === true) {
    this._packetSender.send(new Packet(this._connection.nextSequenceNumber, this._connection.nextExpectedSequenceNumber, constants.PacketTypes.ACK, Buffer.alloc(0)))
  } else if (immediate === false && this._delayedAckTimer === null) {
    this._delayedAckTimer = setTimeout(()=> {
      this.sendAck();
      this._delayedAckTimer = null;
    }, constants.DELAYED_ACK_TIME)
  }
};

Sender.prototype._updateRTT = function (sampleRTT) {
  sampleRTT = sampleRTT[0] * 1000 + sampleRTT[1] / 1000000;
  this._estimatedRTT = (1 - constants.Retransmission.ALPHA) * this._estimatedRTT + constants.Retransmission.ALPHA * sampleRTT
  this._devRTT = (1 - constants.Retransmission.BETA) * this._devRTT + constants.Retransmission.BETA * Math.abs(sampleRTT - this._estimatedRTT);
  this._timeoutInterval = Math.floor(this._estimatedRTT + 4 * this._devRTT);
}

Sender.prototype.sendFin = async function () {
  let finPacket = new Packet(this._connection.nextSequenceNumber, this._connection.nextExpectedSequenceNumber, constants.PacketTypes.FIN, Buffer.alloc(0))
  finPacket.on('acknowledge', () => {
    this.emit('fin_acked');
  });
  this._packetSender.send(finPacket)
  await this._pushToRetransmissionQueue(finPacket)
}

Sender.prototype._sendDataLoop = async function () {
  while (this._sendingQueue.length && this._retransmissionQueue.size < Math.floor(this._maxWindowSize)) {
    let payload = this._sendingQueue.slice(0, constants.UDP_SAFE_SEGMENT_SIZE)
    this._sendingQueue = this._sendingQueue.slice(constants.UDP_SAFE_SEGMENT_SIZE);
    let packet = new Packet(this._connection.nextSequenceNumber, this._connection.nextExpectedSequenceNumber, constants.PacketTypes.DATA, payload);
    this._connection.incrementNextSequenceNumber();
    this._packetSender.send(packet);
    await this._pushToRetransmissionQueue(packet);
  }
};

Sender.prototype._printCongestionControlInfo = function () {
  // this function is for debug
  console.log('current state:',helpers.getKeyByValue(constants.CongestionControl.States, this._currentCongestionControlState))
  console.log('_maxWindowSize:', this._maxWindowSize)
  console.log('_duplicateAckCount:', this._duplicateAckCount)
  console.log('_slowStartThreshold:', this._slowStartThreshold)
  console.log('_timeoutCount:', this._timeoutCount)
  console.log('_retransmissionQueue.size:', this._retransmissionQueue.size)
}

Sender.prototype._changeCurrentCongestionControlState = function (newState) {
  // console.log(helpers.getKeyByValue(constants.CongestionControl.States, this._currentCongestionControlState), '->', helpers.getKeyByValue(constants.CongestionControl.States, newState))
  this._currentCongestionControlState = newState;
}

Sender.prototype.verifyAck = async function (sequenceNumber) {
  if (this._retransmissionQueue.size) {
    let retransmissionQueueHeadSequenceNumber = this._retransmissionQueue.currentValue().packet.sequenceNumber;
    if (retransmissionQueueHeadSequenceNumber < sequenceNumber) {
      let diff = sequenceNumber - retransmissionQueueHeadSequenceNumber
      switch(this._currentCongestionControlState) {
        case constants.CongestionControl.States.SLOW_START:
          this._maxWindowSize = this._maxWindowSize + diff;
          this._duplicateAckCount = 0;
          if (this._maxWindowSize >= this._slowStartThreshold) {
            this._changeCurrentCongestionControlState(constants.CongestionControl.States.CONGESTION_AVOIDANCE);
          }
          break;
        case constants.CongestionControl.States.CONGESTION_AVOIDANCE:
          this._duplicateAckCount = 0;
          this._maxWindowSize = this._maxWindowSize + diff/ Math.floor(this._maxWindowSize);
          break;
        case constants.CongestionControl.States.FAST_RECOVERY:
          this._maxWindowSize = this._slowStartThreshold;
          this._duplicateAckCount = 0;
          this._changeCurrentCongestionControlState(constants.CongestionControl.States.CONGESTION_AVOIDANCE);
          break;
      }
      this.restartTimeoutTimer();
      while (!!this._retransmissionQueue.currentValue() && this._retransmissionQueue.currentValue().packet.sequenceNumber < sequenceNumber) {
        let packetObject = await this._retransmissionQueue.dequeue();
        packetObject = packetObject.value;
        packetObject.packet.acknowledge();
        if (packetObject.sampling && packetObject.retransmitted === false) {
          let sampleRTT = process.hrtime(packetObject.sentTime)
          this._updateRTT(sampleRTT);
        }
        if (this._retransmissionQueue.size === 0 && this._sendingQueue.length === 0) {
        	this.emit('done')
        }
        if (this._retransmissionQueue.size === 0) {
          this._stopTimeoutTimer();
        }
      }
      this._sendDataLoop()
    } else if (retransmissionQueueHeadSequenceNumber === sequenceNumber) {
      switch(this._currentCongestionControlState) {
        case constants.CongestionControl.States.SLOW_START:
        case constants.CongestionControl.States.CONGESTION_AVOIDANCE:
          this._duplicateAckCount += 1;
          break;
        case constants.CongestionControl.States.FAST_RECOVERY:
          this._maxWindowSize = this._maxWindowSize + 1;
          this._sendDataLoop();
          break;
      }
      if (this._duplicateAckCount === 3) {
        switch(this._currentCongestionControlState) {
          case constants.CongestionControl.States.SLOW_START:
          case constants.CongestionControl.States.CONGESTION_AVOIDANCE:
            this._slowStartThreshold = Math.floor(this._maxWindowSize / 2)
            this._maxWindowSize = this._slowStartThreshold + 3;
            this._retransmit();
            this._changeCurrentCongestionControlState(constants.CongestionControl.States.FAST_RECOVERY);
            break;
        }
      }
    }
  }
}
