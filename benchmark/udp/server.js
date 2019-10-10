var rudp = require('../../../lib');
var dgram = require('dgram');
var fs = require('fs');
var args = process.argv.slice(2);
var serverPort = args[0]

var serverSocket = dgram.createSocket('udp4');
serverSocket.bind(serverPort);
console.log('server is running on ', serverPort)
_connections = {};
var timerIsRunning = false
var startTime = 0
var endTime = 0
var totalSize = 0
const stats = fs.statSync(args[1]);
var fileSize = stats.size
serverSocket.on('message', function (message, rinfo) {
	if (!timerIsRunning) {
        timerIsRunning = true
        startTime = process.hrtime();
    }
	totalSize += message.length
	endTime = process.hrtime(startTime);
  	console.log(totalSize,fileSize, endTime[0] + endTime[1]/1000000000)
});