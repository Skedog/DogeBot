const database = require('./database.js');
const twitch = require('./twitch.js');
const cache = require('./cache.js');

// Middleware
function checkIfUserIsLoggedIn(req, res, next) {
	if (req.session && req.session.userDetails) {
		if (req.path === '/login') {
			// User is already logged in and has a valid session
			// No need to run login code again
			return res.redirect('/dashboard');
		}
		next();
	} else {
		if (req.path !== '/login') {
			// Invalid session, but trying to view some other page
			setRedirectTo(req);
			return res.redirect('/login');
		}
		// Invalid session, but trying to login
		next();
	}
}

async function validatePassedUser(req, res, next) {
	const userData = await getUserData(req);
	if (userData.loggedInChannel === req.body.channel.replace('#', '')) {
		next();
	} else {
		// The user is trying to pass a user into an API that doesn't match the logged in user
		// redirect them to login
		return res.redirect('/login');
	}
}

function setRedirectTo(req) {
	if (req.path !== '/getsocketdata') {
		if (req.session) {
			req.session.redirectTo = req.originalUrl;
		}
	}
}

async function checkModStatus(req, res, next) {
	const userDetails = req.session.userDetails.split(',');
	let channelToCheckMods;
	if (req.params.channel !== undefined) {
		channelToCheckMods = req.params.channel;
	} else if (userDetails[2].includes('#')) {
		channelToCheckMods = userDetails[2].substring(1); // Has #, needs to be removed
	} else {
		channelToCheckMods = userDetails[2];
	}
	const twitchUserID = userDetails[3];
	if (twitchUserID) {
		// Select channelName from database
		const propsForSelect = {
			table: 'channels',
			query: {twitchUserID: parseInt(twitchUserID, 10)}
		};
		const results = await database.select(propsForSelect);
		const loggedInChannel = results[0].ChannelName.substring(1); // Remove #
		const modRes = await twitch.twitchClient.mods(channelToCheckMods);
		const temp = modRes.indexOf(loggedInChannel);
		if (temp > -1 || channelToCheckMods === loggedInChannel) {
			// User is a mod or the channel owner
			next();
		} else {
			// User is not a mod
			return res.redirect('/login');
		}
	}
}

async function checkPassedChannel(req, res, next) {
	if (!req.params.channel) {
		// No channel was passed, we need to check the session now
		if (req.session && req.session.userDetails) {
			// Session is valid, move on with loading the page
			return next();
		}
		// Invalid session and no page
		setRedirectTo(req);
		return res.redirect('/login');
	}
	const channelResults = await getChannelInfo(req.params.channel);
	if (channelResults) {
		return next();
	}
	// Invalid channel passed, render 500 page
	res.render('error.handlebars', {
		status: 500,
		error: {},
		layout: 'notLoggedIn'
	});
}

async function checkPassedCommand(req, res, next) {
	if (!req.params.command) {
		// No command was passed, redirect to commands page
		return res.redirect('/commands');
	}
	const propsForSelect = {
		table: 'commands',
		query: {trigger: req.params.command}
	};
	const results = await database.select(propsForSelect);
	if (results) {
		return next();
	}
	// Invalid command passed, render 500 page
	res.render('error.handlebars', {
		status: 500,
		error: {},
		layout: 'notLoggedIn'
	});
}

async function createChannel(props) {
	const dataToUse = {};
	const userToAdd = '#' + props.ChannelName.toLowerCase();
	dataToUse.ChannelName = userToAdd;
	dataToUse.ChannelEmail = props.userEmail;
	dataToUse.ChannelLogo = props.userLogo;
	dataToUse.twitchUserID = props.twitchUserID;
	dataToUse.volume = 30;
	dataToUse.musicStatus = 'pause';
	dataToUse.tempSortVal = 199999;
	dataToUse.inChannel = false; // Starts off with the bot not in this channel
	dataToUse.maxSongLength = 12; // Stored in minutes - max length per song
	dataToUse.songNumberLimit = 10; // How many songs per user
	dataToUse.duplicateSongDelay = 20; // Stored in hours - hours before allowing duplicate song
	dataToUse.isSilent = false;
	dataToUse.ChannelCountry = 'US';
	dataToUse.lastSong = 'No previous song found, try requesting some music with !sr';
	dataToUse.timedMessages = [];
	dataToUse.monitorOnly = false; // This is only used via whisper/admin commands to monitor a channel's chat
	const propsForAdd = {
		table: 'channels',
		dataToUse
	};
	await database.add(propsForAdd);
	const propsForSelect = {
		table: 'defaultCommands'
	};
	const results = await database.select(propsForSelect);
	if (results) {
		let newData = [];
		let newPointData = [];
		const addResults = [];
		for (let i = results.length - 1; i >= 0; i--) {
			switch (results[i].trigger) {
				case '!promote':
				case '!removesong':
				case '!pause':
				case '!play':
				case '!skipsong':
				case '!regular':
				case '!dj':
				case '!supermod':
				case '!shuffle':
				case '!lastseen':
				case '!firstseen':
				case '!mute':
				case '!unmute':
				case '!blacklist':
				case '!nocache':
				case '!srp':
					newData = [{channel: userToAdd, permissionLevel: 300, isEnabled: true, moderationPermissionLevel: 300}];
					newPointData = [{channel: userToAdd, pointCost: 0}];
					break;
				case '!commands':
				case '!volume':
				case '!game':
				case '!title':
					newData = [{channel: userToAdd, permissionLevel: 0, isEnabled: true, moderationPermissionLevel: 300}];
					newPointData = [{channel: userToAdd, pointCost: 0}];
					break;
				case '!giveaway':
					newData = [{channel: userToAdd, permissionLevel: 301, isEnabled: true, moderationPermissionLevel: 301}];
					newPointData = [{channel: userToAdd, pointCost: 0}];
					break;
				default:
					newData = [{channel: userToAdd, permissionLevel: 0, isEnabled: true, moderationPermissionLevel: 300}];
					newPointData = [{channel: userToAdd, pointCost: 0}];
					break;
			}
			const dataToUse = {};
			const listOfPermissionsPerChannel = results[i].permissionsPerChannel;
			const listOfPointsPerChannel = results[i].pointsPerChannel;
			if (Array.isArray(listOfPermissionsPerChannel) && Array.isArray(listOfPointsPerChannel)) {
				Array.prototype.push.apply(listOfPermissionsPerChannel, newData);
				Array.prototype.push.apply(listOfPointsPerChannel, newPointData);
				dataToUse.permissionsPerChannel = listOfPermissionsPerChannel;
				dataToUse.pointsPerChannel = listOfPointsPerChannel;
				const propsForUpdate = {
					table: 'defaultCommands',
					query: {trigger: results[i].trigger},
					dataToUse
				};
				addResults.push(database.update(propsForUpdate));
			}
		}
		await Promise.all(addResults);
	}
	return 'useradded';
}

// Helpers
async function handleLogin(props) {
	const sessionData = {};
	sessionData.twitchUserID = props.twitchUserID;
	sessionData.token = props.token;
	const propsForAdd = {
		table: 'sessions',
		dataToUse: sessionData
	};
	await database.add(propsForAdd);
	// Handle user adding and updating
	const propsForSelect = {
		table: 'channels',
		query: {ChannelName: '#' + props.ChannelName.toLowerCase()}
	};
	const results = await database.select(propsForSelect);
	if (!results) {
		// Channel doesn't exist, add it
		return createChannel(props);
	}
	if (results[0].monitorOnly && results[0].twitchUserID === undefined) {
		// Channel does exist, but it was a monitor only channel, delete current channel record then add it fully
		const propsForDelete = {
			table: 'channels',
			query: {ChannelName: '#' + props.ChannelName.toLowerCase()}
		};
		await database.delete(propsForDelete);
		return createChannel(props);
	}
	const userToUpdate = '#' + props.ChannelName;
	let propsForUpdate;
	let dataToUse;
	if (results[0].ChannelName.toLowerCase() !== userToUpdate.toLowerCase()) {
		// This should only fire if a user has changed their username on Twitch
		// We need to update all the tables that contain the username
		dataToUse = {};
		dataToUse.channel = userToUpdate;
		propsForUpdate = {
			table: 'commands',
			dataToUse
		};
		database.updateall(propsForUpdate);
		propsForUpdate = {
			table: 'regulars',
			dataToUse
		};
		database.updateall(propsForUpdate);
		propsForUpdate = {
			table: 'chatusers',
			dataToUse
		};
		database.updateall(propsForUpdate);
		propsForUpdate = {
			table: 'songs',
			dataToUse
		};
		database.updateall(propsForUpdate);
		propsForUpdate = {
			table: 'songcache',
			dataToUse
		};
		database.updateall(propsForUpdate);
		propsForUpdate = {
			table: 'chatmessages',
			dataToUse
		};
		database.updateall(propsForUpdate);
		propsForUpdate = {
			table: 'commandmessages',
			dataToUse
		};
		database.updateall(propsForUpdate);
		propsForUpdate = {
			table: 'defaultCommands',
			query: {permissionsPerChannel: {$elemMatch: {channel: results[0].ChannelName}}},
			dataToUse: {'permissionsPerChannel.$.channel': userToUpdate}
		};
		await database.updateall(propsForUpdate);
	}
	dataToUse = {};
	dataToUse.ChannelEmail = props.userEmail;
	dataToUse.ChannelLogo = props.userLogo;
	dataToUse.ChannelName = userToUpdate;
	propsForUpdate = {
		table: 'channels',
		query: {twitchUserID: props.twitchUserID},
		dataToUse
	};
	await database.update(propsForUpdate);
	return 'userupdated';
}

// Data pulls
async function getChannelInfo(channel) {
	channel = addHashToChannel(channel);
	const propsForSelect = {
		table: 'channels',
		query: {ChannelName: channel}
	};
	return database.select(propsForSelect);
}

function getURLChannel(req, userDetails) {
	// If a channel is in the URL, use that, otherwise use the logged in channel
	let passedChannel;
	if (req.params.channel) {
		passedChannel = req.params.channel;
	} else {
		passedChannel = userDetails[2].slice(1);
	}
	return passedChannel;
}

async function getNotifications(channel) {
	channel = addHashToChannel(channel);
	const cachedNotifications = await cache.get(channel + 'notifications');
	if (cachedNotifications) {
		return buildNotificationsLayout(cachedNotifications, channel);
	}
	const propsForSelect = {
		table: 'notifications'
	};
	const results = await database.select(propsForSelect);
	if (results) {
		await cache.set(channel + 'notifications', results, 300);
		return buildNotificationsLayout(results, channel);
	}
	return buildNotificationsLayout([], channel);
}

async function getTopChatters(channel) {
	channel = addHashToChannel(channel);
	const cachedChatters = await cache.get(channel + 'chatters');
	if (cachedChatters) {
		return buildTopChattersLayout(cachedChatters);
	}
	const propsForSelect = {
		table: 'chatusers',
		query: {channel, userName: {$nin: ['skedogbot', 'dogebot']}},
		sortBy: {numberOfChatMessages: -1},
		limit: 5
	};
	const topChatters = await database.select(propsForSelect);
	await cache.set(channel + 'chatters', topChatters, 300);
	return buildTopChattersLayout(topChatters);
}

function buildTopChattersLayout(topChatters) {
	let temp = '';
	if (topChatters) {
		if (topChatters.length === 5) {
			temp = '<div class="topchatters">';
			temp += '<h3>Top Chatters</h3>';
			temp += '<p>1) ' + topChatters[0].userName + ' - ' + topChatters[0].numberOfChatMessages + ' messages</p>';
			temp += '<p>2) ' + topChatters[1].userName + ' - ' + topChatters[1].numberOfChatMessages + ' messages</p>';
			temp += '<p>3) ' + topChatters[2].userName + ' - ' + topChatters[2].numberOfChatMessages + ' messages</p>';
			temp += '<p>4) ' + topChatters[3].userName + ' - ' + topChatters[3].numberOfChatMessages + ' messages</p>';
			temp += '<p>5) ' + topChatters[4].userName + ' - ' + topChatters[4].numberOfChatMessages + ' messages</p>';
			temp += '</div>';
		}
	}
	return temp;
}

async function getTopChattersForStatsPage(channel) {
	if (!channel) {
		return '<p>Enter a channel in the box above to view the top chatters!</p>';
	}
	const origChannel = channel;
	channel = addHashToChannel(channel);
	const cachedChatters = await cache.get(channel + 'topchatters');
	if (cachedChatters) {
		return buildStatsPageTopChatters(cachedChatters);
	}
	const propsForSelect = {
		table: 'chatusers',
		query: {channel, userName: {$nin: ['skedogbot', 'dogebot', origChannel]}},
		sortBy: {numberOfChatMessages: -1},
		limit: 50
	};
	const topChatters = await database.select(propsForSelect);
	await cache.set(channel + 'topchatters', topChatters, 300);
	return buildStatsPageTopChatters(topChatters);
}

function buildStatsPageTopChatters(topChatters) {
	let temp = '';
	if (topChatters) {
		temp = '<div class="topchatters statspage">';
		for (const chatter in topChatters) {
			if (Object.prototype.hasOwnProperty.call(topChatters, chatter)) {
				const chatterCounter = parseInt(chatter, 10) + 1;
				temp += '<p>' + chatterCounter + ') ' + topChatters[chatter].userName + ' - ' + topChatters[chatter].numberOfChatMessages + ' messages</p>';
			}
		}
		temp += '</div>';
	} else {
		temp += '<div class="topchatters statspage"><p>No chatters seen yet!</p></div>';
	}
	return temp;
}

async function getDashboardStats(channel) {
	channel = addHashToChannel(channel);
	const cachedStats = await cache.get(channel + 'stats');
	if (cachedStats) {
		return buildDashboardStatsLayout(cachedStats);
	}
	try {
		let propsForCount;
		propsForCount = {
			table: 'songs',
			query: {channel}
		};
		const numberOfSongs = await database.count(propsForCount);

		const propsForSelect = {
			table: 'chatmessages',
			query: {channel}
		};
		const numberOfChatMessages = await database.select(propsForSelect);

		propsForCount = {
			table: 'commands',
			query: {channel}
		};
		const numberOfCommands = await database.count(propsForCount);

		propsForCount = {
			table: 'chatusers',
			query: {channel}
		};
		const numberOfChatUsers = await database.count(propsForCount);
		await cache.set(channel + 'stats', [numberOfSongs, numberOfChatMessages[0].counter, numberOfCommands, numberOfChatUsers], 300);
		return buildDashboardStatsLayout([numberOfSongs, numberOfChatMessages[0].counter, numberOfCommands, numberOfChatUsers]);
	} catch (err) {
		return '';
	}
}

function buildDashboardStatsLayout(data) {
	let temp = '';
	if (data) {
		temp = '<div class="statbox-container">';
		temp += '<div class="statbox">';
		temp += '<h3>' + data[0].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
		temp += '<p># of <a href="/songs">Songs in Queue</a></p>';
		temp += '</div>';
		temp += '<div class="statbox">';
		temp += '<h3>' + data[2].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
		temp += '<p># of <a href="/commands">Commands</a></p>';
		temp += '</div>';
		temp += '<div class="statbox">';
		temp += '<h3>' + data[3].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
		temp += '<p># of Users Seen</p>';
		temp += '</div>';
		temp += '<div class="statbox">';
		temp += '<h3>' + data[1].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
		temp += '<p># of <a href="/chatlog">Chat Messages</a> Seen</p>';
		temp += '</div>';
		temp += '</div>';
	}
	return temp;
}

function buildNotificationsLayout(notifications, channel) {
	// If no notifications, show default message
	let temp = '';
	let numberOfShownNotifications = 0;
	for (const notification of notifications) {
		// If channel hasn't dismissed this notification, show it
		if (!notification.exclusionList.includes(channel)) {
			numberOfShownNotifications++;
			temp += '<li><a href="#"><span class="close" id="' + notification._id + '"><i class="fa fa-times"></i></span>' + notification.message + '</a></li>';
		}
	}
	// If there are notifications to show, return them
	if (temp !== '') {
		return [temp, numberOfShownNotifications];
	}
	// There are no notifications to show, show the default message
	return ['<p>Currently no notifications</p>', 0];
}

async function getSonglist(channel) {
	channel = addHashToChannel(channel);
	const cachedSonglist = await cache.get(channel + 'songlist');
	if (cachedSonglist) {
		return cachedSonglist;
	}
	const propsForSelect = {
		table: 'songs',
		query: {channel}
	};
	const results = await database.select(propsForSelect);
	await cache.set(channel + 'songlist', results);
	return results;
}

async function getFormattedSonglist(channel, page) {
	channel = addHashToChannel(channel);
	const songlist = await getSonglist(channel);
	let builtSonglist = '';
	for (const song in songlist) {
		if (Object.prototype.hasOwnProperty.call(songlist, song)) {
			const songCounter = parseInt(song, 10) + 1;
			const songID = songlist[song].songID;
			const songTitle = songlist[song].songTitle;
			const whoRequested = songlist[song].whoRequested;
			if (page === 'moderation') {
				if (parseInt(song, 10) === 0 || parseInt(song, 10) === 1) {
					builtSonglist += '<tr><td>' + songCounter + '</td><td><a href="https://youtu.be/' + songID + '" target="_blank">' + songTitle + '</a></td><td>' + whoRequested + '</td><td><div class="moderationBtns"><input type="button" value="X" id="' + songCounter + '" class="removeButton blue-styled-button mini" /></div></td></tr>';
				} else {
					builtSonglist += '<tr><td>' + songCounter + '</td><td><a href="https://youtu.be/' + songID + '" target="_blank">' + songTitle + '</a></td><td>' + whoRequested + '</td><td><div class="moderationBtns"><input type="button" value="&uarr;" id="' + songID + '" class="promoteButton blue-styled-button mini" /><input type="button" value="X" id="' + songCounter + '" class="removeButton blue-styled-button mini" /></div></td></tr>';
				}
			} else if (page === 'player') {
				builtSonglist += '<tr><td>' + songCounter + '</td><td><a href="https://youtu.be/' + songID + '" target="_blank">' + songTitle + '</a></td><td>' + whoRequested + '</td></tr>';
			} else {
				builtSonglist += '<tr><td>' + songCounter + '</td><td>' + songTitle + '</td><td><a href="https://youtu.be/' + songID + '" target="_blank">' + songID + '</a></td><td>' + whoRequested + '</td></tr>';
			}
		}
	}
	return builtSonglist;
}

async function getFirstSongFromSonglist(channel) {
	channel = addHashToChannel(channel);
	const songlist = await getSonglist(channel);
	if (songlist) {
		return songlist[0];
	}
}

async function getFormattedFirstSongFromSonglist(channel) {
	channel = addHashToChannel(channel);
	const songlist = await getSonglist(channel);
	if (songlist) {
		return '<strong>Song Title:</strong> ' + songlist[0].songTitle + '<br><strong>Requested:</strong> ' + songlist[0].whoRequested;
	}
	return 'Currently no songs in the queue!';
}

async function getBlacklist(channel) {
	channel = addHashToChannel(channel);
	const cachedBlacklist = await cache.get(channel + 'blacklist');
	if (cachedBlacklist) {
		return cachedBlacklist;
	}
	const propsForSelect = {
		table: 'songblacklist',
		query: {channel}
	};
	const results = await database.select(propsForSelect);
	await cache.set(channel + 'blacklist', results);
	return results;
}

async function getFormattedBlacklist(channel) {
	channel = addHashToChannel(channel);
	const blacklist = await getBlacklist(channel);
	let builtBlacklist = '';
	for (const song in blacklist) {
		if (Object.prototype.hasOwnProperty.call(blacklist, song)) {
			const songCounter = parseInt(song, 10) + 1;
			builtBlacklist += '<tr><td>' + songCounter + '</td><td>' + blacklist[song].songTitle + '</td><td><a href="https://youtu.be/' + blacklist[song].songID + '" target="_blank">' + blacklist[song].songID + '</a></td><td>' + blacklist[song].whoRequested + '</td></tr>';
		}
	}
	return builtBlacklist;
}

async function getSongCache(channel) {
	channel = addHashToChannel(channel);
	const cachedSongCache = await cache.get(channel + 'songcache');
	if (cachedSongCache) {
		return cachedSongCache;
	}
	const propsForSelect = {
		table: 'songcache',
		query: {channel}
	};
	const results = await database.select(propsForSelect);
	await cache.set(channel + 'songcache', results);
	return results;
}

async function getFormattedSongCache(channel) {
	channel = addHashToChannel(channel);
	const songcache = await getSongCache(channel);
	let builtSongCache = '';
	for (const song in songcache) {
		if (Object.prototype.hasOwnProperty.call(songcache, song)) {
			const songCounter = parseInt(song, 10) + 1;
			builtSongCache += '<tr><td>' + songCounter + '</td><td>' + songcache[song].songTitle + '</td><td><a href="https://youtu.be/' + songcache[song].songID + '" target="_blank">' + songcache[song].songID + '</a></td></tr>';
		}
	}
	return builtSongCache;
}

async function getCommands(channel) {
	channel = addHashToChannel(channel);
	const cachedCommandList = await cache.get(channel + 'commands');
	if (cachedCommandList) {
		return cachedCommandList;
	}
	const propsForSelect = {
		table: 'commands',
		query: {channel}
	};
	const results = await database.select(propsForSelect);
	await cache.set(channel + 'commands', results);
	return results;
}

async function getFormattedCommandlist(channel) {
	channel = addHashToChannel(channel);
	const commands = await getCommands(channel);
	let builtCommandList = '';
	for (const command in commands) {
		if (Object.prototype.hasOwnProperty.call(commands, command)) {
			if (commands[command].chatmessage === '$(list)') {
				builtCommandList += '<tr id="' + commands[command].trigger + '"><td>' + commands[command].trigger + '</td><td><a href="#" class="view-list">View List</a></td><td>' + commands[command].commandcounter + '</td><td>' + commands[command].permissionsLevel + '</td></tr>';
			} else {
				builtCommandList += '<tr id="' + commands[command].trigger + '"><td>' + commands[command].trigger + '</td><td>' + commands[command].chatmessage + '</td><td>' + commands[command].commandcounter + '</td><td>' + commands[command].permissionsLevel + '</td></tr>';
			}
		}
	}
	return builtCommandList;
}

async function formatListItems(listItems) {
	if (listItems.length !== 0) {
		let formattedListItems = '<ol>';
		for (const listItem in listItems) {
			if (Object.prototype.hasOwnProperty.call(listItems, listItem)) {
				formattedListItems += '<li>' + listItems[listItem] + '</li>';
			}
		}
		formattedListItems += '</ol>';
		return formattedListItems;
	}
	return '<p>There are currently no items in this list</p>';
}

async function getListCommandItems(channel, passedCommand) {
	channel = addHashToChannel(channel);
	const commands = await getCommands(channel);
	for (const command in commands) {
		if (Object.prototype.hasOwnProperty.call(commands, command)) {
			if (commands[command].trigger === passedCommand) {
				return formatListItems(commands[command].listArray);
			}
		}
	}
	return '';
}

function getChannelName(req, userDetails) {
	let channel;
	if (req.params.channel) {
		channel = req.params.channel;
	} else if (userDetails) {
		channel = userDetails[2].slice(1);
	}
	return channel;
}

async function getUserData(req) {
	let userDetails = 'null';
	let layout = 'notLoggedIn';
	if (req.session.userDetails) {
		userDetails = req.session.userDetails.split(',');
		layout = 'main';
	}
	const channel = getChannelName(req, userDetails);
	const channelInfo = await getChannelInfo(channel);
	const isBotInChannel = channelInfo[0].inChannel;
	const notifications = await getNotifications(channel);
	return {
		channel,
		urlChannel: getURLChannel(req, userDetails),
		loggedInChannel: userDetails === 'null' ? userDetails : userDetails[2].slice(1),
		channelInfo,
		isBotInChannel,
		notifications: notifications[0],
		notificationCounter: notifications[1],
		userDetails,
		channelLogo: userDetails[1] === 'null' ? '/img/default-user-logo.png' : userDetails[1],
		layout
	};
}

function getMusicStatus(userData) {
	const musicStatus = userData.channelInfo[0].musicStatus;
	let isMusicPlaying = false;
	if (musicStatus === 'play') {
		isMusicPlaying = true;
	}
	return isMusicPlaying;
}

async function getChatlog(channel, start, end, offset) {
	channel = addHashToChannel(channel);
	const cacheName = channel + 'chatlog' + start + end + offset;
	const cachedChatlog = await cache.get(cacheName);
	if (cachedChatlog) {
		return cachedChatlog;
	}
	const propsForSelect = {
		table: 'chatlog',
		query: {
			channel,
			timestamp: {
				$gte: start,
				$lte: end
			}
		}
	};
	const results = await database.select(propsForSelect);
	if (results) {
		await cache.set(cacheName, results);
	}
	return results;
}

function parseBadgesFromMessage(message) {
	let parsedBadges = '';
	if (message) {
		if (message.broadcaster) {
			parsedBadges += '<img src="https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1" alt="Broadcaster" title="Broadcaster" />';
		}
		if (message.moderator) {
			parsedBadges += '<img src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1" alt="Moderator" title="Moderator" />';
		}
		if (message.subscriber === '0') {
			parsedBadges += '<img src="https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1" alt="Subscriber" title="Subscriber" />';
		}
	}
	return parsedBadges;
}

async function getFormattedChatlog(channel, start, end, offset) {
	channel = addHashToChannel(channel);
	const chatlog = await getChatlog(channel, start, end, offset);
	if (chatlog) {
		let builtChatlog = '<div class="chatlogs">';
		for (const log in chatlog) {
			if (Object.prototype.hasOwnProperty.call(chatlog, log)) {
				const d = chatlog[log].timestamp;
				const displayName = chatlog[log].userstate['display-name'];
				const username = chatlog[log].userstate.username;
				let color = chatlog[log].userstate.color;
				const parsedBadges = parseBadgesFromMessage(chatlog[log].userstate.badges);
				if (!color) {
					color = '#428bca';
				}
				const message = chatlog[log].message;
				builtChatlog += '<div class="chat-message">';
				builtChatlog += '<span class="date">' + d + '</span>';
				if (displayName) {
					builtChatlog += '<span class="displayName">';
					builtChatlog += '<span class="badges">' + parsedBadges + '</span>';
					builtChatlog += '<a href="https://twitch.tv/' + displayName + '" style="color:' + color + '" target="_blank">' + displayName + ':</a>';
					builtChatlog += '</span>';
				} else {
					builtChatlog += '<span class="displayName">';
					builtChatlog += '<span class="badges">' + parsedBadges + '</span>';
					builtChatlog += '<a href="https://twitch.tv/' + username + '" style="color:' + color + '" target="_blank">' + username + ':</a>';
					builtChatlog += '</span>';
				}
				builtChatlog += '<span class="message">' + message + '</span>';
				builtChatlog += '</div>';
			}
		}
		builtChatlog += '</div>';
		return builtChatlog;
	}
	return '<div class="chatlogs">Sorry, there are no logs for the selected day!</div>';
}

function addHashToChannel(channel) {
	if (!channel.includes('#')) {
		channel = '#' + channel;
	}
	return channel;
}

async function getStatsForStatsPage(channel) {
	if (channel) {
		channel = addHashToChannel(channel);
	}
	const cachedStats = await cache.get('statspage' + channel);
	if (cachedStats) {
		return buildStatsLayout(cachedStats);
	}
	try {
		let propsForCount = {};
		if (channel) {
			propsForCount.query = {channel};
		}
		propsForCount.table = 'songs';
		const numberOfSongs = await database.count(propsForCount);

		propsForCount.table = 'chatmessages';
		const chatMessages = await database.select(propsForCount);
		let numberOfChatMessages = 0;
		if (chatMessages) {
			for (const channel in chatMessages) {
				if (Object.prototype.hasOwnProperty.call(chatMessages, channel)) {
					numberOfChatMessages += chatMessages[channel].counter;
				}
			}
		}

		propsForCount.table = 'commands';
		const numberOfCommands = await database.count(propsForCount);

		propsForCount.table = 'songcache';
		const numberOfCachedSongs = await database.count(propsForCount);

		propsForCount = {
			table: 'channels',
			query: {}
		};
		const numberOfChannels = await database.count(propsForCount);

		await cache.set('statspage' + channel, [numberOfSongs, numberOfChatMessages, numberOfCommands, numberOfChannels, numberOfCachedSongs, channel], 300);
		return buildStatsLayout([numberOfSongs, numberOfChatMessages, numberOfCommands, numberOfChannels, numberOfCachedSongs, channel]);
	} catch (err) {
		return '';
	}
}

function buildStatsLayout(data) {
	let temp = '';
	if (data) {
		const channelName = data[5];
		if (channelName) {
			temp = '<div class="statbox-container statspage">';
			temp += '<div class="statbox">';
			temp += '<h3>' + data[0].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
			temp += '<p># of Songs in Queue</p>';
			temp += '</div>';
			temp += '<div class="statbox">';
			temp += '<h3>' + data[4].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
			temp += '<p># of Songs Seen in Channel</p>';
			temp += '</div>';
			temp += '<div class="statbox">';
			temp += '<h3>' + data[2].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
			temp += '<p># of Commands in Channel</p>';
			temp += '</div>';
			temp += '<div class="statbox">';
			temp += '<h3>' + data[1].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
			temp += '<p># of Chat Messages Seen in Channel</p>';
			temp += '</div>';
			temp += '</div>';
		} else {
			temp = '<div class="statbox-container statspage">';
			temp += '<div class="statbox">';
			temp += '<h3>' + data[0].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
			temp += '<p># of Songs in All Queues</p>';
			temp += '</div>';
			temp += '<div class="statbox">';
			temp += '<h3>' + data[4].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
			temp += '<p># of Songs Ever Seen</p>';
			temp += '</div>';
			temp += '<div class="statbox">';
			temp += '<h3>' + data[2].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
			temp += '<p># of Commands in All Channels</p>';
			temp += '</div>';
			temp += '<div class="statbox">';
			temp += '<h3>' + data[1].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
			temp += '<p># of Chat Messages Seen in All Channels</p>';
			temp += '</div>';
			temp += '<div class="statbox">';
			temp += '<h3>' + data[3].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '</h3>';
			temp += '<p># of Channels Registered</p>';
			temp += '</div>';
			temp += '</div>';
		}
	}
	return temp;
}

module.exports = {
	getChannelInfo,
	handleLogin,
	checkModStatus,
	getURLChannel,
	getTopChatters,
	getDashboardStats,
	getNotifications,
	checkIfUserIsLoggedIn,
	validatePassedUser,
	getSonglist,
	getFormattedSonglist,
	getFirstSongFromSonglist,
	getFormattedFirstSongFromSonglist,
	getChannelName,
	getUserData,
	getMusicStatus,
	getCommands,
	getFormattedCommandlist,
	getListCommandItems,
	getBlacklist,
	getFormattedBlacklist,
	getSongCache,
	getFormattedSongCache,
	getChatlog,
	getFormattedChatlog,
	checkPassedChannel,
	checkPassedCommand,
	addHashToChannel,
	getStatsForStatsPage,
	getTopChattersForStatsPage
};
