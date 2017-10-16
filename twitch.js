const log = require('npmlog');
const request = require('async-request');
const tmi = require('tmi.js');
const database = require('./database.js');
const constants = require('./constants.js');
const permissions = require('./permissions.js');
const stats = require('./stats.js');
const chat = require('./chat-commands.js');
const messages = require('./chat-messages.js');
const functions = require('./functions.js');

let twitchClient;
let dbConstants;

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
		if (channel.ChannelName !== '#ygtskedogtest') {
			startTimedMessages(channel.ChannelName.substr(1));
			channelArray.push(channel.ChannelName);
		}
	}
	return channelArray;
}

async function connectToTwitch() {
	dbConstants = await database.constants();
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
		if (res === 'updated') {
			log.info('Joined channel: ' + channelToJoin);
			getCurrentChatUsers(channelToJoin.substring(1));
		}
	} catch (err) {
		log.info(err);
	}
}

async function leaveSingleChannel(channelToLeave) {
	try {
		await twitchClient.part(channelToLeave);
		const dataToUse = {};
		dataToUse.inChannel = false;
		const propsForUpdate = {
			table: 'channels',
			query: {ChannelName: channelToLeave},
			dataToUse
		};
		const res = await database.update(propsForUpdate);
		if (res === 'updated') {
			log.info('Left channel: ' + channelToLeave);
		}
	} catch (err) {
		log.info(err);
	}
}

function monitorChat() {
	twitchClient.on('chat', (channel, userstate, message, self) => {
		stats.addChatMessage(channel, userstate, message);
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
		if (from.toLowerCase() === '#ygtskedog' && message.startsWith('!')) {
			log.info('got a whisper from ' + from + ' that says: ' + message + '.');
			const props = {
				from,
				messageParams: message.split(' '),
				userstate,
				twitchClient
			};
			chat.callWhisperCommand(props);
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
			}
		}, 1200000);
	}
}

async function checkIfChannelIsLive(channel) {
	let URLtoUse;
	if (constants.testMode) {
		URLtoUse = 'https://api.twitch.tv/kraken/streams/' + channel + '?client_id=' + dbConstants.twitchTestClientID;
	} else {
		URLtoUse = 'https://api.twitch.tv/kraken/streams/' + channel + '?client_id=' + dbConstants.twitchClientID;
	}
	const twitchAPIRequest = await request(URLtoUse);
	if (JSON.parse(twitchAPIRequest.body).stream === null) {
		return false;
	}
	return true;
}

function getCurrentChatUsers(channel) {
	twitchClient.api({
		url: 'https://tmi.twitch.tv/group/user/' + channel + '/chatters'
	}, (err, res, body) => {
		if (err) {
			return;
		}
		console.log('https://tmi.twitch.tv/group/user/' + channel + '/chatters');
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
		if (constants.testMode) {
			log.info('*********************');
			log.info('Starting in test mode');
			log.info('*********************');
		}
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
module.exports.leaveSingleChannel = leaveSingleChannel;
