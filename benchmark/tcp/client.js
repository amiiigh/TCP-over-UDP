const net = require('net');
const fs = require('fs');
const path = require('path');
var chalk    = require('chalk');
var args = process.argv.slice(2);
var filePath = args[2]
var serverPort = args[1]
var serverAddress = args[0]
var readStream = fs.createReadStream(filePath)
var client = new net.Socket()
client.connect(serverPort, serverAddress);
readStream.on('error', function(e) {
	console.error(e);
});

readStream.on('data', function(chunk) {
	client.write(chunk)
});

client.on('end', () => {
  console.log(chalk.bold.yellow('Disconnected from server'))
});