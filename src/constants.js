module.exports.PacketTypes = {
	'ACK': 1,
	'SYN': 2,
	'FIN': 3,
	'SYN_ACK': 4,
	'DATA': 5
};
module.exports.TCPStates = {
	'CLOSED': 0,
	'LISTEN': 1,
	'SYN_SENT': 2,
	'SYN_RCVD': 3,
	'ESTABLISHED': 4,
	'FIN_WAIT_1': 5,
	'FIN_WAIT_2': 6,
	'TIME_WAIT': 7,
	'LAST_ACK': 8,
};
module.exports.CongestionControlStates = {
	'SLOW_START': 0,
	'CONGESTION_AVOIDANCE': 1,
	'FAST_RECOVERY': 2
}
module.exports.INITIAL_RETRANSMISSION_INTERVAL = 3000;
module.exports.CLOSE_WAIT_TIME = 30000;
module.exports.SYNC_INTERVAL = 100;
module.exports.INITIAL_SEND_INTERVAL = 50;
module.exports.ACK_ITNERVAL = 100;
module.exports.INITIAL_MAX_WINDOW_SIZE = 16
module.exports.MAX_SEQUENCE_NUMBER = 4294967295;
module.exports.TIMEOUT = 100;
module.exports.UDP_SAFE_SEGMENT_SIZE = 1400;