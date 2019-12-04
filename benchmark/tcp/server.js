const net = require('net');
const fs = require('fs');
var args = process.argv.slice(2);
var serverPort = args[0]
var timerIsRunning = false
var startTime = 0
var endTime = 0
var totalSize = 0
const stats = fs.statSync(args[1]);
var fileSize = stats.size
var dest = fs.createWriteStream('received');
const server = net.createServer((socket) => {
  socket.name = socket.remoteAddress + ":" + socket.remotePort
  console.log('new client connected ', socket.name);
  socket.on('end', () => {
    console.log('client disconnected');
  });
  socket.on('data', (data) => {
    if (!timerIsRunning) {
        timerIsRunning = true
        startTime = process.hrtime();
      }
      totalSize += data.length
      if (totalSize === fileSize) {
        endTime = process.hrtime(startTime);
        console.log('File',totalSize,  'has been received',endTime[0] + endTime[1]/1000000000)
      }
    // dest.write(data);
  })
});

server.on('error', (err) => {
  throw err;
});

server.listen(serverPort, '0.0.0.0', () => {
  console.log('server has started');
});
