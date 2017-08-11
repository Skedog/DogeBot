const log = require('npmlog');
async function start(server) {
	const io = require('socket.io')(server);
	module.exports.io = io;
	log.info('Socket server started');


	io.on('connection', function(client) {
		// client.emit('messages', 'Hello from server');
		// client.on('add user', function (username) {
		// 	console.log(username);
		// })
		// example for when a callback is needed
		// client.on('getnav', async function(data, fn) {
		// 	let testrequest = await request('/nav');
		// 	fn(testrequest.body);
		// });
	});
};

function emit(connection,message) {
	module.exports.io.emit(connection,message);
}

module.exports = {
	start: start,
	emit: emit
};