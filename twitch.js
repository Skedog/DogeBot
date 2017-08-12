const database = require('./database.js');
const constants = require('./constants.js');
const permissions = require('./permissions.js');
const stats = require('./stats.js');
const chat = require('./chat-commands.js');
const messages = require('./chat-messages.js');
const maintenance = require('./maintenance.js');
const functions = require('./functions.js');
const log = require('npmlog');
const tmi = require('tmi.js');
const request = require('async-request');
let twitchClient;

async function getListOfJoinedChannels() {
	const props = {
		table:'channels',
		query: {inChannel:true}
	};
	if (!constants.testMode) {
		const channels = await database.select(props);
		let channelArray = [];
		for (let channel of channels) {
			if (channel['ChannelName'] != '#ygtskedogtest') {
				channelArray.push(channel['ChannelName']);
			}
		}
		return channelArray;
	} else {
		return ['#ygtskedogtest'];
	}
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
			cluster: "aws",
			reconnect: true
		},
		identity: {
			username: "SkedogBot",
			password: dbConstants.twitchOauthPass
		},
		channels:channelsToJoin
	};
	//turn this on if you want debug messages from twitchClient
	// if (constants.testMode) {twitchClientOptions.options.debug = true}
	twitchClient = new tmi.client(twitchClientOptions);
	module.exports.twitchClient = twitchClient;
	try {
		await twitchClient.connect();
		log.info('Connected to Twitch chat servers');
	} catch(err) {
		log.error(err);
	};
	return twitchClient;
}

async function joinSingleChannel(channelToJoin) {
	try {
		await twitchClient.join(channelToJoin);
		const propsForsetDelayTimerForSingleChannel = {
			channel:channelToJoin
		}
		chat.setDelayTimerForSingleChannel(propsForsetDelayTimerForSingleChannel);
		let dataToUse = {};
		dataToUse["inChannel"] = true;
		const propsForUpdate = {
			table:'channels',
			query:{ChannelName:channelToJoin},
			dataToUse: dataToUse
		}
		const res = await database.update(propsForUpdate);
		if (res == 'updated') {
			log.info('Joined channel: ' + channelToJoin);
			getCurrentChatUsers(channelToJoin.substring(1));
		}
	} catch(err) {
		log.info(err);
	}
}

function monitorChat() {
	twitchClient.on("chat", function(channel, userstate, message, self) {
		if (!self && message.startsWith("!")) {
			const props = {
				channel:channel,
				messageParams:message.split(' '),
				userstate: userstate,
				twitchClient:twitchClient,
				statTableToUpdate:'commandmessages',
				statFieldToUpdate:'numberOfCommandMessages'
			};
			callCommandFromChat(props);
		} else if (!self) {
			const props = {
				channel:channel,
				userstate: userstate,
				statTableToUpdate:'chatmessages',
				statFieldToUpdate:'numberOfChatMessages'
			};
			stats.addCounterStat(props);
			stats.updateUserCounter(props);
		};
	});
}

function monitorWhispers() {
	twitchClient.on("whisper", function(from, userstate, message, self) {
		if (from.toLowerCase() == '#ygtskedogtest' && message.startsWith("!")) {
			log.info('got a whisper from ' + from + ' that says: ' + message + '.');
			const props = {
				from: from,
				messageParams: message.split(' '),
				userstate: userstate,
				twitchClient: twitchClient
			}
			callCommandFromWhisper(props);
		}
	});
}

async function callCommandFromChat(props) {
	try {
		props.permissionLevelNeeded = await permissions.CommandPermissionLevel(props);
		await permissions.canUserCallCommand(props);
		await chat.checkAndSetCommandDelayTimer(props);
		stats.addCounterStat(props);
		stats.updateUserCounter(props);
		props.messageToSend = await chat.callCommand(props);
		if (props.messageToSend) {
			messages.send(props);
		}
	} catch(err) {
		log.error('Command was called and produced an error: ' + err);
	}
}

async function callCommandFromWhisper(props) {
	switch(props.messageParams[0]) {
		case '!clearsongcache':
			if (props.messageParams[1]) {
				const propsForSongCache = {
					channel:'#' + props.messageParams[1]
				}
				try {
					await maintenance.clearSongCache(propsForSongCache);
					log.info('Song cache cleared for ' + props.messageParams[1] + ' via whisper');
					props.twitchClient.whisper(props.from, "Song cache cleared for " + props.messageParams[1]);
				} catch (err) {
					log.error(err);
					props.twitchClient.whisper(props.from, "Error clearing song cache for " + props.messageParams[1]);
				}
			}
			break;
		case '!deletechannel':
			if (props.messageParams[1]) {
				const propsFordeleteChannel = {
					channel:'#' + props.messageParams[1]
				}
				maintenance.deleteChannel(propsFordeleteChannel).then(res => {
					log.info('Deleted channel: ' + props.messageParams[1]);
					props.twitchClient.whisper(props.from, 'Deleted channel: ' + props.messageParams[1]);
				}).catch(err => {
					log.error(err);
					props.twitchClient.whisper(props.from, 'Error deleting channel ' + props.messageParams[1] + ': ' + err);
				})
			}
			break;
		case 'getids':
			const propsForIDupdate = {
				twitchClient:props.twitchClient
			}
			maintenance.getAndUpdateTwitchUserIDsForAllUsers(propsForIDupdate).then(res => {
				log.info('Got and reset all channel twitchIDs');
				props.twitchClient.whisper(props.from, "Got and reset all channel twitchIDs");
			}).catch(err => {
				log.error(err);
				props.twitchClient.whisper(props.from, "Error getting channel twitchIDs: " + err);
			})
			break;
		case '!mute':
			if (props.messageParams[1]) {
				const propsForMute = {
					channel:'#' + props.messageParams[1],
					twitchClient:props.twitchClient,
					userstate:props.userstate
				}
				propsForMute.messageToSend = await messages.mute(propsForMute);
				messages.send(propsForMute);
			}
			break;
		case '!unmute':
			if (props.messageParams[1]) {
				const propsForUnmute = {
					channel:'#' + props.messageParams[1],
					twitchClient:props.twitchClient,
					userstate:props.userstate
				}
				propsForUnmute.messageToSend = await messages.unmute(propsForUnmute);
				messages.send(propsForUnmute);
			}
			break;
	}
}

function monitorUsersInChat() {
	twitchClient.on("join", function (channel, username, self) {
		const propsForAddTrackedUser = {
			channel:channel,
			username:username
		}
		stats.addTrackedUser(propsForAddTrackedUser);
	});
}

function sendTimedMessage(channelToUse,passedMessages) {
	let msgToSend = functions.getRandomItemFromArray(passedMessages);
	let props = {
		channel:'#' + channelToUse,
		twitchClient:twitchClient,
		messageToSend:msgToSend[1]
	}
	messages.send(props);
	log.info('LOG CUSTOM: Timed message sent - ' + new Date().toLocaleString());
}

function startLiveCheckTimer(channelToUse) {
	let checkIfLive = setInterval(async function() {
		let results = await checkIfChannelIsLive(channelToUse);
		if (results) {
			//channel is live, stop this timer, and start timer for messages
			clearInterval(checkIfLive);
			startTimedMessages();
		}
	}, 1200000);
	// }, 3000);
}

async function startTimedMessages() {
	let channelToUse = 'ygtskedog';
	let listOfMessages = ["Enjoying the stream? Be sure to follow so you don't miss the next one! <3","Be a part of this community all the time, join us on Discord! http://ske.dog/discord","Wanna chat? Twitter is the best way to get in touch with me! http://ske.dog/twitter","Wanna give me free money? Bookmark my Amazon affiliate link, and use it when you make a purchase! http://ske.dog/amazon","Did you know Skedog has a sub button now?! Click on subscribe above! !prime","We now have a Chrome extension for the stream! It shows you when Skedog is live AND it auto applies the Amazon affiliate code! Check it out! http://ske.dog/ext","Don't forget to renew your Amazon/Twitch Prime Subscription, they don't auto-renew like normal subs!"];
	let numberOfTimesRan = 0;
	let firstRun = true;
	const _this = this;
	this[channelToUse+'_interval'] = setInterval(async function() {
		numberOfTimesRan++;
		//check every x number of times if channel is still live and check startup run to see if the channel is live
		if (numberOfTimesRan == 4 || firstRun) {
			firstRun = false;
			numberOfTimesRan = 0;
			let results = await checkIfChannelIsLive(channelToUse);
			if (results) {
				//channel is live, send a message
				sendTimedMessage(channelToUse,listOfMessages);
			} else {
				//channel isn't live, stop timer for messages and start live check timer
				clearInterval(_this[channelToUse+'_interval']);
				startLiveCheckTimer(channelToUse);
			}
		} else {
		 	//channel is live, send a message like normal
			sendTimedMessage(channelToUse,listOfMessages);
		}
	}, 900000);
	// }, 1500);
}

async function checkIfChannelIsLive(channel) {
	const dbConstants = await database.constants();
	let URLtoUse;
	if (constants.testMode) {
		URLtoUse = "https://api.twitch.tv/kraken/streams/" + channel + "?client_id=" + dbConstants.twitchTestClientID;
	} else {
		URLtoUse = "https://api.twitch.tv/kraken/streams/" + channel + "?client_id=" + dbConstants.twitchClientID;
	}
	const twitchAPIRequest = await request(URLtoUse);
	if (JSON.parse(twitchAPIRequest.body)['stream'] !== null) {
		return true;
	} else {
		return false;
	}
}

function getCurrentChatUsers(channel) {
	twitchClient.api({
		url: 'http://tmi.twitch.tv/group/user/' + channel + '/chatters'
	}, function(err, res, body) {
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
		startTimedMessages();
		log.info('Now monitoring Twitch chat, whispers, and users');
	} catch (err) {
		throw err;
	}
}

module.exports.start = start;
module.exports.connectToTwitch = connectToTwitch;
module.exports.joinSingleChannel = joinSingleChannel;