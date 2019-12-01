var rudp = require('./src');
var dgram = require('dgram');

var socket = dgram.createSocket('udp4');

socket.bind(8823);

console.log('UDP socket bound to port 8823');
var _connections = {};

socket.on('message', function (message, rinfo) {
	try {
		var addressKey = rinfo.address + ':' + rinfo.port;
		var connection;
		if (!_connections[addressKey]) {
			console.log('new connection:', addressKey)
			connection = new rudp.Connection(new rudp.PacketSender(socket, rinfo.address, rinfo.port));
			connection.on('data', data => {
				let replayMessage = Buffer.from(addressKey);
				console.log(addressKey);
				connection.send(replayMessage)
			});
			connection.on('close', () => {
				delete _connections[addressKey]
			})
			_connections[addressKey] = connection;
		} else {
			connection = _connections[addressKey];
		}
		var packet = new rudp.Packet(message);
		setImmediate(function () {
			connection.receive(packet);
		});
	} catch(err) {
		delete connection[addressKey]
		console.log(err)
	}
});