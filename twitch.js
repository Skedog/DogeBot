const log = require('npmlog');
const request = require('async-request');
const tmi = require('tmi.js');
const database = require('./database.js');
const constants = require('./constants.js');
const permissions = require('./permissions.js');
const stats = require('./stats.js');
const chat = require('./chat-commands.js');
const messages = require('./chat-messages.js');
const maintenance = require('./maintenance.js');
const functions = require('./functions.js');

let twitchClient;

async function getListOfJoinedChannels() {
	const props = {
		table: 'channels',
		query: {inChannel: true}
	};
	if (constants.testMode) {
		startTimedMessages('ygtskedogtest');
		return ['#ygtskedogtest'];
	}
	const channels = await database.select(props);
	const channelArray = [];
	for (const channel of channels) {
		if (channel.ChannelName != '#ygtskedogtest') {
			startTimedMessages(channel.ChannelName.substr(1));
			channelArray.push(channel.ChannelName);
		}
	}
	return channelArray;
}

async function connectToTwitch() {
	const dbConstants = await database.constants();
	const channelsToJoin = await getListOfJoinedChannels();
	chat.setDelayTimerForMultipleChannels(channelsToJoin);
	const twitchClientOptions = {
		options: {
			debug: false
		},
		connection: {
			cluster: 'aws',
			reconnect: true
		},
		identity: {
			username: 'SkedogBot',
			password: dbConstants.twitchOauthPass
		},
		channels: channelsToJoin
	};
	// Turn this on if you want debug messages from twitchClient
	// If (constants.testMode) {twitchClientOptions.options.debug = true}
	twitchClient = new tmi.Client(twitchClientOptions);
	module.exports.twitchClient = twitchClient;
	try {
		await twitchClient.connect();
		log.info('Connected to Twitch chat servers');
	} catch (err) {
		log.error(err);
	}
	return twitchClient;
}

async function joinSingleChannel(channelToJoin) {
	try {
		await twitchClient.join(channelToJoin);
		const propsForsetDelayTimerForSingleChannel = {
			channel: channelToJoin
		};
		chat.setDelayTimerForSingleChannel(propsForsetDelayTimerForSingleChannel);
		const dataToUse = {};
		dataToUse.inChannel = true;
		const propsForUpdate = {
			table: 'channels',
			query: {ChannelName: channelToJoin},
			dataToUse
		};
		const res = await database.update(propsForUpdate);
		if (res == 'updated') {
			log.info('Joined channel: ' + channelToJoin);
			getCurrentChatUsers(channelToJoin.substring(1));
		}
	} catch (err) {
		log.info(err);
	}
}

function monitorChat() {
	twitchClient.on('chat', (channel, userstate, message, self) => {
		if (!self && message.startsWith('!')) {
			const props = {
				channel,
				messageParams: message.split(' '),
				userstate,
				twitchClient,
				statTableToUpdate: 'commandmessages',
				statFieldToUpdate: 'numberOfCommandMessages'
			};
			callCommandFromChat(props);
		} else if (!self) {
			const props = {
				channel,
				userstate,
				statTableToUpdate: 'chatmessages',
				statFieldToUpdate: 'numberOfChatMessages'
			};
			stats.addCounterStat(props);
			stats.updateUserCounter(props);
		}
	});
}

function monitorWhispers() {
	twitchClient.on('whisper', (from, userstate, message) => {
		if (from.toLowerCase() == '#ygtskedogtest' && message.startsWith('!')) {
			log.info('got a whisper from ' + from + ' that says: ' + message + '.');
			const props = {
				from,
				messageParams: message.split(' '),
				userstate,
				twitchClient
			};
			callCommandFromWhisper(props);
		}
	});
}

async function callCommandFromChat(props) {
	try {
		props.permissionLevelNeeded = await permissions.commandPermissionLevel(props);
		await permissions.canUserCallCommand(props);
		await chat.checkAndSetCommandDelayTimer(props);
		stats.addCounterStat(props);
		stats.updateUserCounter(props);
		props.messageToSend = await chat.callCommand(props);
		if (props.messageToSend) {
			messages.send(props);
		}
	} catch (err) {
		log.error('Command was called and produced an error: ' + err);
	}
}

async function callCommandFromWhisper(props) {
	switch (props.messageParams[0]) {
		case '!clearsongcache':
			if (props.messageParams[1]) {
				const propsForSongCache = {
					channel: '#' + props.messageParams[1]
				};
				try {
					await maintenance.clearSongCache(propsForSongCache);
					log.info('Song cache cleared for ' + props.messageParams[1] + ' via whisper');
					props.twitchClient.whisper(props.from, 'Song cache cleared for ' + props.messageParams[1]);
				} catch (err) {
					log.error(err);
					props.twitchClient.whisper(props.from, 'Error clearing song cache for ' + props.messageParams[1]);
				}
			}
			break;
		case '!deletechannel':
			if (props.messageParams[1]) {
				const propsFordeleteChannel = {
					channel: '#' + props.messageParams[1]
				};
				try {
					await maintenance.deleteChannel(propsFordeleteChannel);
					log.info('Deleted channel: ' + props.messageParams[1]);
					props.twitchClient.whisper(props.from, 'Deleted channel: ' + props.messageParams[1]);
				} catch (err) {
					log.error(err);
					props.twitchClient.whisper(props.from, 'Error deleting channel ' + props.messageParams[1] + ': ' + err);
				}
			}
			break;
		case 'getids': {
			const propsForIDupdate = {
				twitchClient: props.twitchClient
			};
			try {
				await maintenance.getAndUpdateTwitchUserIDsForAllUsers(propsForIDupdate);
				log.info('Got and reset all channel twitchIDs');
				props.twitchClient.whisper(props.from, 'Got and reset all channel twitchIDs');
			} catch (err) {
				log.error(err);
				props.twitchClient.whisper(props.from, 'Error getting channel twitchIDs: ' + err);
			}
			break;
		}
		case '!mute':
			if (props.messageParams[1]) {
				const propsForMute = {
					channel: '#' + props.messageParams[1],
					twitchClient: props.twitchClient,
					userstate: props.userstate
				};
				propsForMute.messageToSend = await messages.mute(propsForMute);
				messages.send(propsForMute);
			}
			break;
		case '!unmute':
			if (props.messageParams[1]) {
				const propsForUnmute = {
					channel: '#' + props.messageParams[1],
					twitchClient: props.twitchClient,
					userstate: props.userstate
				};
				propsForUnmute.messageToSend = await messages.unmute(propsForUnmute);
				messages.send(propsForUnmute);
			}
			break;
		default:
			log.error('Whisper command not found!');
			props.twitchClient.whisper(props.from, 'Whisper command not found!');
	}
}

function monitorUsersInChat() {
	twitchClient.on('join', (channel, username) => {
		const propsForAddTrackedUser = {
			channel,
			username
		};
		stats.addTrackedUser(propsForAddTrackedUser);
	});
}

function sendTimedMessage(channelToUse, passedMessages) {
	const msgToSend = functions.getRandomItemFromArray(passedMessages);
	const props = {
		channel: '#' + channelToUse,
		twitchClient,
		messageToSend: msgToSend[1]
	};
	messages.send(props);
	log.info('LOG CUSTOM: Timed message sent - ' + new Date().toLocaleString());
}

async function getTimedMessages(channel) {
	const propsForSelect = {
		table: 'channels',
		query: {ChannelName: '#' + channel}
	};
	const results = await database.select(propsForSelect);
	if (results) {
		return results[0].timedMessages;
	}
}

async function startTimedMessages(channel) {
	const listOfMessages = await getTimedMessages(channel);
	if (listOfMessages.length > 0) {
		this[channel + '_interval'] = setInterval(async () => {
			const results = await checkIfChannelIsLive(channel);
			if (results) {
				// Channel is live, send a message
				sendTimedMessage(channel, listOfMessages);
			} else {
				// Channel isn't live, stop timer for messages and start live check timer
				// Console.log(channel + ' is not live');
			}
		}, 1200000);
		// }, 3000);
	}
}

async function checkIfChannelIsLive(channel) {
	const dbConstants = await database.constants();
	let URLtoUse;
	if (constants.testMode) {
		URLtoUse = 'https://api.twitch.tv/kraken/streams/' + channel + '?client_id=' + dbConstants.twitchTestClientID;
	} else {
		URLtoUse = 'https://api.twitch.tv/kraken/streams/' + channel + '?client_id=' + dbConstants.twitchClientID;
	}
	const twitchAPIRequest = await request(URLtoUse);
	if (JSON.parse(twitchAPIRequest.body).stream == null) {
		return false;
	}
	return true;
}

function getCurrentChatUsers(channel) {
	twitchClient.api({
		url: 'http://tmi.twitch.tv/group/user/' + channel + '/chatters'
	}, (err, res, body) => {
		if (err) {
			return;
		}
		console.log('http://tmi.twitch.tv/group/user/' + channel + '/chatters');
		console.log('Viewer stats for ' + channel);
		console.log('Viewer Count: ' + body.chatter_count);
		console.log('Mods: ' + body.chatters.moderators);
		console.log('Staff: ' + body.chatters.staff);
		console.log('Admins: ' + body.chatters.admins);
		console.log('Global Mods: ' + body.chatters.global_mods);
		console.log('Viewers: ' + body.chatters.viewers);
	});
}

async function start() {
	try {
		await connectToTwitch();
		monitorChat();
		monitorWhispers();
		monitorUsersInChat();
		log.info('Now monitoring Twitch chat, whispers, and users');
	} catch (err) {
		throw err;
	}
}

module.exports.start = start;
module.exports.connectToTwitch = connectToTwitch;
module.exports.joinSingleChannel = joinSingleChannel;
