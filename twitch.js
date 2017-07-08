var log = require('npmlog');
var tmi = require('tmi.js');
var runSQL = require('./runSQL.js');
var chat = require('./chat-commands.js');
var permissions = require('./permissions.js');
var maintenance = require('./maintenance-functions.js');
var functions = require('./general-functions.js');
const constants = require('./constants.js');

var connect = function(db,dbConstants) {
	return new Promise((resolve, reject) => {
		var twitchClientOptions = {
			options: {
				debug: false
			},
			connection: {
				cluster: "aws",
				reconnect: true
			},
			identity: {
				username: "SkedogBot",
				password: dbConstants.twitchOauthPass
			}
		};
		//turn this on if you want debug messages from twitchClient
		// if (constants.testMode) {twitchClientOptions.options.debug = true}
		twitchClient = new tmi.client(twitchClientOptions);
		twitchClient.connect().then(returnFromConnection => {
			resolve('Connected to Twitch chat servers');
		}).catch(err => {
			reject('Error connecting to Twitch chat servers: ' + err);
		})
	})
}

var joinStartupChannels = function(db,dbConstants) {
	return new Promise((resolve, reject) => {
		runSQL('select','channels',{inChannel:true},'',db).then(results => {
			if (results && !constants.testMode) {
				for (i = 0; i < results.length; i++) {
					var channelName = results[i]['ChannelName'];
					if (channelName != '#ygtskedog' && channelName != '#ygtskedogtest') {
						joinSingleChannel(channelName).then(res => {
							//log.info(res);
						}).catch(err => {
							log.info(err);
						})
					}
				}
			}
		});
		var defaultChannelToJoin = constants.testMode ? '#ygtskedogtest' : '#ygtskedog';
		joinSingleChannel(defaultChannelToJoin).then(res => {
			resolve('Joined all startup channels');
		}).catch(err => {
			reject('Failed to join startup channels');
		})
	})
}

var joinSingleChannel = function(channelToJoin) {
	return new Promise((resolve, reject) => {
		twitchClient.join(channelToJoin).then(function(data) {
			chat.setDelayTimerPerChannel(channelToJoin).then(res => {
				var dataToUse = {};
				dataToUse["inChannel"] = true;
				runSQL('update','channels',{ChannelName:channelToJoin},dataToUse,db);
				// getCurrentChatUsers(channelToJoin);
				resolve('Joined channel: ' + channelToJoin);
			}).catch(function(err) {
				reject(err);
			});
		}).catch(function(err) {
			reject(err);
		});
	})
}

var monitorChat = function(db,dbConstants) {
	twitchClient.on("chat", function(channel, userstate, message, self) {
		if (!self && message.startsWith("!")) {
			var messageParams = message.split(' '), sentCommand = messageParams[0];
			permissions.getCommandPermissionLevel(db,sentCommand,messageParams,channel).then(res => {
				Promise.all([
					permissions.canUserCallCommand(db,userstate,res,channel),
					chat.checkAndSetCommandDelayTimer(channel, sentCommand, 3)
				]).then(res => {
					chat.callCommand(db,twitchClient,channel,userstate,message,sentCommand).then(res => {
						log.info(channel + ': ' + res);
					}).catch(function(err) {
						log.info(err);
					});
				}).catch(function(err) {
					log.info(err);
				});
			}).catch(function(err) {
				log.info(err);
			});
		}
	});
}

var monitorWhispers = function(db,dbConstants) {
	twitchClient.on("whisper", function(from, userstate, message, self) {
		var messageParams = message.split(' ');
		var sentCommand = messageParams[0];
		if ((!self && message.startsWith("!")) && (from.toLowerCase() == '#ygtskedog')) {
			log.info('got a whisper from ' + from + ' that says: ' + message + ' .');
			if (sentCommand == '!clearsongcache') {
				if (messageParams[1]) {
					maintenance.clearSongCache(db,'#' + messageParams[1]).then(res => {
						log.info('Song cache cleared for ' + messageParams[1] + ' via whisper');
						twitchClient.whisper(from, "Song cache cleared for " + messageParams[1]);
					}).catch(err => {
						log.error(err);
						twitchClient.whisper(from, "Error clearing song cache for " + messageParams[1]);
					})
				}
			} else if (sentCommand == '!resetdatabase') {
				maintenance.resetDatabase(db).then(res => {
					log.info('Database reset done via whisper');
					twitchClient.whisper(from, "Database reset!");
				}).catch(err => {
					log.error(err);
					twitchClient.whisper(from, "Error resetting database: " + err);
				})
			} else if (sentCommand == '!getids') {
				maintenance.getAndUpdateTwitchUserIDsForAllUsers(db,twitchClient).then(res => {
					log.info('Got and reset all channel twitchIDs');
					twitchClient.whisper(from, "Got and reset all channel twitchIDs");
				}).catch(err => {
					log.error(err);
					twitchClient.whisper(from, "Error getting channel twitchIDs: " + err);
				})
			} else if (sentCommand == '!deletechannel') {
				if (messageParams[1]) {
					maintenance.deleteChannel(db,'#' + messageParams[1]).then(res => {
						log.info('Deleted channel: ' + messageParams[1]);
						twitchClient.whisper(from, 'Deleted channel: ' + messageParams[1]);
					}).catch(err => {
						log.error(err);
						twitchClient.whisper(from, 'Error deleting channel ' + messageParams[1] + ': ' + err);
					})
				}
			}
		}
	});
}

var monitorUsersInChat = function(db,dbConstants) {
	twitchClient.on("join", function (channel, username, self) {
		runSQL('select','chatusers',{channel:channel,userName:username},'',db).then(results => {
			if (results) {
				var dataToUse = {};
				dataToUse["lastSeen"] = new Date();
				runSQL('update','chatusers',{channel:channel,userName:username},dataToUse,db);
			} else {
				var dataToUse = {};
				dataToUse["userName"] = username;
				dataToUse["channel"] = channel;
				dataToUse["lastSeen"] = new Date();
				dataToUse["firstSeen"] = new Date();
				runSQL('add','chatusers',{},dataToUse,db);
			}
		});
	});
}

var startTimedMessages = function(db,dbConstants) {
	var intervalStarted = false; //save in database per user to determine of the timer is currently running for user[x]
	var channelToUse = 'ygtskedog';
	var checkIfLive = setInterval(function() {
		checkIfChannelIsLive(channelToUse,dbConstants).then(results => {
			if (results) {
				if (intervalStarted === false) {
					this[channelToUse+'_interval'] = setInterval(function() {
						var messages = ["Enjoying the stream? Be sure to follow so you don't miss the next one! <3","Be a part of this community all the time, join us on Discord! http://ske.dog/discord","Wanna chat? Twitter is the best way to get in touch with me! http://ske.dog/twitter","Wanna give me free money? Bookmark my Amazon affiliate link, and use it when you make a purchase! http://ske.dog/amazon","Did you know Skedog has a sub button now?! Click on subscribe above! !prime","We now have a Chrome extension for the stream! It shows you when Skedog is live AND it auto applies the Amazon affiliate code! Check it out! http://ske.dog/ext"];
						functions.getRandomItemFromArray(messages).then(msgToSend => {
							twitchClient.say(channelToUse,msgToSend[1]);
							var currentdate = new Date();
							log.info('LOG CUSTOM: Timed message sent - ' + (currentdate.getMonth()+1)  + "/" + currentdate.getDate() + "/" + currentdate.getFullYear() + " @ "  + currentdate.getHours() + ":"  + currentdate.getMinutes() + ":" + currentdate.getSeconds())
							intervalStarted = true;
						});
					}, 900000);
					// }, 3000);
				}
			} else {
				clearInterval(this[channelToUse+'_interval']);
			}
		});
	}, 1200000);
	// }, 6000);
}

var checkIfChannelIsLive = function(channel,dbConstants) {
	return new Promise((resolve, reject) => {
		var URLtoUse = '';
		if (constants.testMode) {
			URLtoUse = "https://api.twitch.tv/kraken/streams/" + channel + "?client_id=" + dbConstants.twitchTestClientID;
		} else {
			URLtoUse = "https://api.twitch.tv/kraken/streams/" + channel + "?client_id=" + dbConstants.twitchClientID;
		}
		twitchClient.api({
			url: URLtoUse
		}, function(err, res, body) {
			if (body['stream'] !== null) {
				resolve(true);
			} else {
				resolve(false);
			}
		});
	});
}

var getCurrentChatUsers = function(channel) {
	var channel = channel.substring(1);
	console.log('http://tmi.twitch.tv/group/user/' + channel + '/chatters');
	twitchClient.api({
		url: 'http://tmi.twitch.tv/group/user/' + channel + '/chatters'
	}, function(err, res, body) {
		console.log('Viewer stats for ' + channel);
		console.log('Viewer Count: ' + body.chatter_count);
		console.log('Mods: ' + body.chatters.moderators);
		console.log('Staff: ' + body.chatters.staff);
		console.log('Admins: ' + body.chatters.admins);
		console.log('Global Mods: ' + body.chatters.global_mods);
		console.log('Viewers: ' + body.chatters.viewers);
	});
}

var start = function(dbAndConstants) {
	return new Promise((resolve, reject) => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		connect(db,dbConstants).then(res => {
			log.info(res);
			joinStartupChannels(db,dbConstants).then(res => {
				log.info(res);
				monitorChat(db,dbConstants);
				monitorWhispers(db,dbConstants);
				monitorUsersInChat(db,dbConstants);
				startTimedMessages(db,dbConstants);
				resolve('Now monitoring Twitch chat, whispers, and users');
			}).catch(err => {
				log.error(err);
			})
		}).catch(err => {
			log.error(err);
		});
	});
}

module.exports = {
	connect: connect,
	joinStartupChannels: joinStartupChannels,
	joinSingleChannel: joinSingleChannel,
	monitorChat: monitorChat,
	start: start
};