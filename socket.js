const log = require('npmlog');

async function start(server) {
	const io = require('socket.io')(server);
	module.exports.io = io;
	log.info('Socket server started');

	io.on('connection', client => {
		client.on('room', room => {
			client.join(room);
		});
	});
}

function emit(connection, message) {
	module.exports.io.emit(connection, message);
}

module.exports = {
	start,
	emit
};
