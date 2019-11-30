var rudp = require('./src');
var dgram = require('dgram');
var fs = require('fs');
var path = require('path');
var args = process.argv.slice(2);
var filePath = args[2]
var serverPort = args[1]
var serverAddress = args[0]

var clientSocket = dgram.createSocket('udp4')
var readStream = fs.createReadStream(filePath)
var totalDataSize = 0

packetSender = new rudp.PacketSender(clientSocket, serverAddress, serverPort);
connection = new rudp.Connection(packetSender);

readStream.on('data', function(chunk) {
	totalDataSize += chunk.length
	connection.write(chunk)
});

clientSocket.on('message', function (message, rinfo) {
    var packet = new rudp.Packet(message);
    connection.receive(packet);
});

setTimeout(() => {
	connection.close()
}, 1000)

connection.on('close', () => {
	clientSocket.close(() => {
		console.log('closing the socket')
	})
})

connection.on('data', (data) => {
	console.log(data.toString())
})
// setTimeout(() => {connection.close()}, 5000);
// readStream.on('end', function() {
// 	console.log(totalDataSize)
// // 	var endTime = process.hrtime(startTime);
// // 	console.log(chalk.bold.green('File',totalDataSize,  'has been sent', endTime[1]/1000000, ' ms'))
// // 	// client.close()
// // 	// clientSocket.close()
// });