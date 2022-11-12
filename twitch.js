const log = require('npmlog');
const rp = require('request-promise');
const tmi = require('tmi.js');
const database = require('./database.js');
const constants = require('./constants.js');
const permissions = require('./permissions.js');
const points = require('./points.js');
const stats = require('./stats.js');
const chat = require('./chat-commands.js');
const messages = require('./chat-messages.js');
const functions = require('./functions.js');
const commands = require('./commands.js');

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

async function getListOfJoinedChannelIDs() {
	const props = {
		table: 'channels',
		query: {inChannel: true}
	};
	const channels = await database.select(props);
	const channelArray = [];
	for (const channel of channels) {
		if (channel.ChannelName !== '#ygtskedogtest') {
			channelArray.push('user_id=' + channel.twitchUserID);
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
	if (constants.testMode) {
		twitchClientOptions.identity = {
			username: 'ygtskedogtest',
			password: dbConstants.twitchOauthPassTest
		};
	}
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
			startTimedMessages(channelToJoin.substring(1));
			startChatUserTracking(channelToJoin.substring(1));
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
			stopTimedMessages(channelToLeave.substring(1));
			stopChatUserTracking(channelToLeave.substring(1));
		}
	} catch (err) {
		log.info(err);
	}
}

function monitorChat() {
	twitchClient.on('chat', async (channel, userstate, message, self) => {
		stats.addChatMessage(channel, userstate, message);
		if (!self && userstate.username !== 'dogebot') {
			const props = {
				channel,
				messageParams: message.split(' '),
				userstate,
				twitchClient,
				statTableToUpdate: 'commandmessages',
				statFieldToUpdate: 'numberOfCommandMessages'
			};
			const doesCommandExist = await commands.doesCommandExist(props);
			if (doesCommandExist) {
				callCommandFromChat(props);
			} else {
				// If a command doesn't exist, we only update stats tables
				const props = {
					channel,
					userstate,
					statTableToUpdate: 'chatmessages',
					statFieldToUpdate: 'numberOfChatMessages'
				};
				stats.addCounterStat(props);
				stats.updateUserCounter(props);
			}
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
		await chat.isUserIgnored(props);
		// This checks permission level as well as command existence
		props.permissionLevelNeeded = await permissions.commandPermissionLevel(props);
		await chat.isCommandEnabled(props);
		await permissions.canUserCallCommand(props);
		await chat.checkAndSetCommandDelayTimer(props);
		props.pointsToRemove = await points.commandPointCost(props);
		await points.canUserCallCommand(props);
		await points.removePoints(props);
		// We only track stats on 'successful' command calls
		stats.addCounterStat(props);
		stats.updateUserCounter(props);
		props.messageToSend = await chat.callCommand(props);
		if (props.messageToSend) {
			messages.send(props);
		}
	} catch (err) {
		// Hide errors around 'ignored' users and errors around channels in "monitor only mode"
		// Note: We do not track number of failed command calls in stats
		// Also: this should never be hit by non-existing commands, only things such as failed permissions or not enough points
		if (!String(err).includes('has been ignored') && !String(err).includes('monitor only mode')) {
			log.error('Command (' + props.messageParams + ') was called in ' + props.channel + ' by "' + props.userstate.username + '" and produced an error: ' + err);
			console.log(err);
		}
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

async function stopTimedMessages(channel) {
	clearInterval(this[channel + '_interval']);
}

async function stopChatUserTracking(channel) {
	clearInterval(this[channel + '_interval_chatusers']);
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
	const propsForSelect = {
		table: 'channels',
		query: {ChannelName: '#' + channel}
	};
	const results = await database.select(propsForSelect);
	if (results) {
		return results[0].currentlyLive;
	}
}

async function getAllLiveChannels() {
	const liveChannels = [];
	if (!constants.testMode) {
		const joinedChannels = await getListOfJoinedChannelIDs();
		// Chunk the channels into limited arrays because the Twitch API has a limit of 100 per request
		const chunkedChannels = functions.chunkArray(joinedChannels, 99);
		const options = {
			headers: {
				Authorization: 'Bearer ' + dbConstants.twitchOauthScoped,
				'Client-ID': dbConstants.twitchClientID
			}
		};
		for (let i = chunkedChannels.length - 1; i >= 0; i--) {
			const channeList = chunkedChannels[i].join('&');
			options.uri = 'https://api.twitch.tv/helix/streams?' + channeList;
			await rp(options).then(returnedBody => {
				const currentLiveChannels = JSON.parse(returnedBody);
				if (currentLiveChannels.data.length > 0) {
					for (let x = currentLiveChannels.data.length - 1; x >= 0; x--) {
						liveChannels.push(parseInt(currentLiveChannels.data[x].user_id, 10));
					}
				}
			}).catch(err => {
				console.log('Error with getting live channels: ' + err);
			});
		}
	}
	return liveChannels;
}

async function setLiveChannels(liveChannels) {
	let dataToUse = {};
	let propsForUpdate = {};
	if (liveChannels.length > 0) {
		dataToUse = {
			currentlyLive: true
		};
		propsForUpdate = {
			table: 'channels',
			query: {twitchUserID: {$in: liveChannels}},
			dataToUse
		};
		await database.updateall(propsForUpdate);
		// Mark all channels not LIVE that are not in liveChannels array
		dataToUse = {
			currentlyLive: false
		};
		propsForUpdate = {
			table: 'channels',
			query: {twitchUserID: {$nin: liveChannels}},
			dataToUse
		};
		await database.updateall(propsForUpdate);
	} else if (!constants.testMode) {
		// No live channels, set all channels to currentlyLive: false
		dataToUse = {
			currentlyLive: false
		};
		propsForUpdate = {
			table: 'channels',
			query: {},
			dataToUse
		};
		await database.updateall(propsForUpdate);
	}
}

async function getCurrentChatUsers(channel) {
	const options = {
		uri: 'https://tmi.twitch.tv/group/user/' + channel + '/chatters',
		json: true
	};
	return rp(options).then(body => {
		if (body.chatters) {
			return body.chatters.broadcaster + ',' + body.chatters.moderators + ',' + body.chatters.staff + ',' + body.chatters.admins + ',' + body.chatters.global_mods + ',' + body.chatters.viewers;
		}
		throw new Error('body from getCurrentChatUsers request was empty');
	}).catch(err => {
		log.error('getCurrentChatUsers(' + channel + ') produced an error: ' + err);
		return null;
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
		// Setup timer for checking which channels are live
		this.checkLiveChannelsInterval = setInterval(async () => {
			const liveChannels = await getAllLiveChannels();
			await setLiveChannels(liveChannels);
		}, 60000); // 1 minute
		log.info('Now monitoring Twitch chat, whispers, and users');
	} catch (err) {
		throw err;
	}
}

module.exports.start = start;
module.exports.connectToTwitch = connectToTwitch;
module.exports.joinSingleChannel = joinSingleChannel;
module.exports.leaveSingleChannel = leaveSingleChannel;
