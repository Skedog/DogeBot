// "use strict";
const log = require('npmlog');
const database = require('./database.js');
const twitch = require('./twitch.js');
const express = require('./express.js');
const socket = require('./socket.js');
const discord = require('./discord.js');

async function init() {
	try {
		await database.connect();
		await express.start();
		await socket.start(express.server);
		twitch.start();
		discord.start();
	} catch (err) {
		log.error(err);
	}
}
init();
