// "use strict";
const log = require('npmlog');
const database = require('./database.js');
const twitch = require('./twitch.js');
const express = require('./express.js');
const socket = require('./socket.js');
const cache = require('./cache.js');
const discord = require('./discord.js');

async function init() {
	try {
		await database.connect();
		await express.start();
		await socket.start(express.server);
		await cache.start();
		twitch.start();
		discord.start();
	} catch (err) {
		log.error(err);
	}
}
init();
