const log = require('npmlog');
async function start(server) {
	const io = require('socket.io')(server);
	module.exports.io = io;
	log.info('Socket server started');

	io.on('connection', function(client) {
		client.on('room', function(room) {
			client.join(room);
		});
	});
};

function emit(connection,message) {
	module.exports.io.emit(connection,message);
}

module.exports = {
	start: start,
	emit: emit
};