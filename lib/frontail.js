var program  = require('commander')
  , http     = require('http')
  , fs       = require('fs')
  , socketio = require('socket.io')
  , spawn    = require('child_process').spawn;

/**
 * Parse arg
 */

program
    .version('0.1.0')
    .usage('[options] [file ...]')
    .option('-p, --port <port>', 'server port, default 9001', Number, 9001)
    .option('-n, --number <number>', 'starting lines number, default 10', Number, 10)
    .parse(process.argv);

if (program.args.length === 0) {
    process.exit();
} else {
    var files = program.args.join(" ");
}

/**
 * Server setup
 */

var server = http.createServer(function (req, res) {
    fs.readFile(__dirname + '/index.html', function (err, data) {
        if (err) {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Interal error');
        } else {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(data.toString('utf-8').replace(/__TITLE__/g, 'tail -F ' + files), 'utf-8');
        }
    });
});
server.listen(program.port);

/**
 * socket.io setup
 */

var io = socketio.listen(server);
io.set("log level", 2);

/**
 * Connect to socket and send starting data
 */

io.sockets.on('connection', function (socket) {
    var tail = spawn('tail', ['-n', program.number, files]);
    tail.stdout.on('data', function (data) {
        socket.emit('lines', data.toString('utf-8').split('\n'));
    });
});

/**
 * Send incoming data
 */

var tail = spawn('tail', ['-F', files]);
tail.stdout.on('data', function (data) {
    io.sockets.emit('lines', data.toString('utf-8').split('\n'));
});