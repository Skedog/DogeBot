const log = require('npmlog');
const bhttp = require("bhttp");
const tmi = require('tmi.js');
const database = require('./database.js');
const constants = require('./constants.js');
const permissions = require('./permissions.js');
const points = require('./points.js');
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
		startChatUserTracking('ygtskedogtest');
		return ['#ygtskedogtest'];
	}
	const channels = await database.select(props);
	const channelArray = [];
	for (const channel of channels) {
		if (channel.ChannelName !== '#ygtskedogtest') {
			startTimedMessages(channel.ChannelName.substr(1));
			startChatUserTracking(channel.ChannelName.substr(1));
			channelArray.push(channel.ChannelName);
		}
	}
	return channelArray;
}

async function connectToTwitch() {
	dbConstants = await database.constants();
	const channelsToJoin = await getListOfJoinedChannels();
	chat.setDelayTimerForArrayOfChannels(channelsToJoin);
	const twitchClientOptions = {
		options: {
			debug: false
		},
		connection: {
			cluster: 'aws',
			reconnect: true
		},
		identity: {
			username: 'DogeBot',
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
		const arrayOfChannelsToJoin = [channelToJoin];
		chat.setDelayTimerForArrayOfChannels(arrayOfChannelsToJoin);
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
		await chat.isChannelMonitorOnly(props);
		props.permissionLevelNeeded = await permissions.commandPermissionLevel(props);
		await permissions.canUserCallCommand(props);
		await chat.checkAndSetCommandDelayTimer(props);
		props.pointsToRemove = await points.commandPointCost(props);
		await points.canUserCallCommand(props);
		await points.removePoints(props);
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
		const propsForUser = {
			channel,
			username
		};
		stats.addTrackedUser(propsForUser);
		stats.markUserAsActive(propsForUser);
	});
	twitchClient.on('part', (channel, username) => {
		const propsForUser = {
			channel,
			username
		};
		stats.markUserAsInActive(propsForUser);
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
		}, 1200000); // 20 minutes
	}
}

async function startChatUserTracking(channel) {
	this[channel + '_interval_chatusers'] = setInterval(async () => {
		const results = await checkIfChannelIsLive(channel);
		if (results) {
			// Channel is live, get currently active users, increase points, etc
			handleLoyalty(channel);
		}
	}, 60000); // 1 minute
	// }, 600000); // 10 minutes
}

async function handleLoyalty(channel) {
	const currentUsers = await getCurrentChatUsers(channel);
	let dataToUse = {};
	let propsForUpdate = {};
	if (currentUsers) {
		if (currentUsers.length > 0) {
			const arrayOfUsers = currentUsers.split(',');
			// Mark all users in the chatters list as "active" and increase loyalty points by 1
			dataToUse = {
				isActive: true
			};
			propsForUpdate = {
				table: 'chatusers',
				query: {channel: '#' + channel, userName: {$in: arrayOfUsers}},
				dataToUse,
				inc: {loyaltyPoints: 0.1, minutesInChat: 1}
			};
			await database.updateall(propsForUpdate);
			// Mark all users NOT in the chatters list as "inactive"
			dataToUse = {
				isActive: false
			};
			propsForUpdate = {
				table: 'chatusers',
				query: {channel: '#' + channel, userName: {$nin: arrayOfUsers}},
				dataToUse
			};
			await database.updateall(propsForUpdate);
		}
	}
}

async function checkIfChannelIsLive(channel) {
	let URLtoUse;
	if (constants.testMode) {
		URLtoUse = 'https://api.twitch.tv/kraken/streams/' + channel + '?client_id=' + dbConstants.twitchTestClientID;
	} else {
		URLtoUse = 'https://api.twitch.tv/kraken/streams/' + channel + '?client_id=' + dbConstants.twitchClientID;
	}
	try {
		const twitchAPIRequest = await bhttp.get(URLtoUse);
		if (twitchAPIRequest.body.stream !== null) {
			return true;
		}
		return false;
	} catch (err) {
		log.error('checkIfChannelIsLive(' + channel + ') produced an error: ' + err);
		return false;
	}
}

async function getCurrentChatUsers(channel) {
	try {
		const twitchAPIRequest = await bhttp.get('https://tmi.twitch.tv/group/user/' + channel + '/chatters');
		if (twitchAPIRequest.body) {
			const body = twitchAPIRequest.body;
			if (body.chatters) {
				return body.chatters.moderators + ',' + body.chatters.staff + ',' + body.chatters.admins + ',' + body.chatters.global_mods + ',' + body.chatters.viewers;
			}
			throw new Error('body from getCurrentChatUsers request was empty');
		}
	} catch (err) {
		log.error('getCurrentChatUsers(' + channel + ') produced an error: ' + err);
		return null;
	}
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
