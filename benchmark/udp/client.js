var rudp = require('../../../lib');
var helpers = require('../../../lib/helpers');
var dgram = require('dgram');
var fs = require('fs');
var path = require('path');
var args = process.argv.slice(2);
var filePath = args[2]
var serverPort = args[1]
var serverAddress = args[0]

var clientSocket = dgram.createSocket('udp4')
var data = fs.readFileSync(filePath)
var chunks = helpers.splitArrayLike(data, 500);

for (var i=0; i<chunks.length; i++) {
	clientSocket.send(chunks[i], 0, chunks[i].length, serverPort, serverAddress);
}