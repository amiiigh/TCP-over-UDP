var rudp = require('./src');
var dgram = require('dgram');
var fs = require('fs');
var args = process.argv.slice(2);
var serverPort = args[0]
var serverSocket = dgram.createSocket('udp4');
serverSocket.bind(serverPort);
console.log('server is running on ', serverPort)
_connections = {};
timerIsRunning = false;
var totalSize = 0
serverSocket.on('message', function (message, rinfo) {
	var addressKey = rinfo.address + rinfo.port;
	var connection;
	if (!_connections[addressKey]) {
		connection = new rudp.Connection(new rudp.PacketSender(serverSocket, rinfo.address, rinfo.port));
		_connections[addressKey] = connection;
	} else {
		connection = _connections[addressKey];
	}
	var packet = new rudp.Packet(message);
	setImmediate(function () {
		connection.receive(packet);
	});
});
