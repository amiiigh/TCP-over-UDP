var rudp = require('./src');
var dgram = require('dgram');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var args = process.argv.slice(2);
var filePath = args[2]
var serverPort = args[1]
var serverAddress = args[0]

var clientSocket = dgram.createSocket('udp4')
var readStream = fs.createReadStream(filePath)
var totalDataSize = 0
var startTime = 0 
var timerIsRunning = false

packetSender = new rudp.PacketSender(clientSocket, serverAddress, serverPort);
connection = new rudp.Connection(packetSender);

readStream.on('data', function(chunk) {
	totalDataSize += chunk.length
	if (!timerIsRunning) {
		startTime = process.hrtime();
		timerIsRunning = true;
	}
	connection.write(chunk)
});

clientSocket.on('message', function (message, rinfo) {
    var packet = new rudp.Packet(message);
    connection.receive(packet);
});

// clientSocket.send(Buffer.alloc(0), serverPort, serverAddress)
// connection.send(Buffer.from('hey'))
// clientSocket.send(Buffer.alloc(0), serverPort, serverAddress)
// setTimeout(() => {
// 	connection.end()
// }, 1000)

connection.on('close', () => {
	clientSocket.close(() => {
		console.log('closing the socket')
	})
})

connection.on('data', (data) => {
	console.log(data.toString())
})

connection.on('done', () => {
	console.log(totalDataSize)
	var endTime = process.hrtime(startTime);
	console.log(chalk.bold.green('File',totalDataSize,  'has been sent', endTime[1]/1000000, ' ms'))
	connection.close()
})
// setTimeout(() => {connection.close()}, 5000);
// readStream.on('end', function() {
// 	console.log(totalDataSize)
// // 	var endTime = process.hrtime(startTime);
// // 	console.log(chalk.bold.green('File',totalDataSize,  'has been sent', endTime[1]/1000000, ' ms'))
// // 	// client.close()
// // 	// clientSocket.close()
// });