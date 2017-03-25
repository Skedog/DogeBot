var log = require('npmlog');
var database = require('./database.js');
var twitch = require('./twitch.js');
var express = require('./express.js');
var discord = require('./discord.js');

database.start().then(dbAndConstants => {
	Promise.all([
		twitch.start(dbAndConstants),
		discord.start(dbAndConstants),
		express.start(dbAndConstants)
	]).then(res => {
		log.info(res[0]); //twitch
		log.info(res[1]); //discord
		log.info(res[2]); //express
	}).catch(function(err) {
		log.error(err);
	});
}).catch(err => {
	log.error(err);
});