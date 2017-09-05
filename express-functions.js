const database = require('./database.js');
const constants = require('./constants.js');
const twitch = require('./twitch.js');

function wwwRedirect(req, res, next) {
	if (req.headers.host.slice(0, 4) === 'www.') {
		const newHost = req.headers.host.slice(4);
		return res.redirect(301, req.protocol + '://' + newHost + req.originalUrl);
	}
	next();
}

async function checkUserLoginStatus(req, res, next) {
	const token = req.cookies.token;
	if (req.cookies.userDetails) {
		const userDetails = req.cookies.userDetails.split(',');
		let twitchUserID = userDetails[3];
		if (token) {
			twitchUserID = parseInt(twitchUserID, 10);
			const propsForSelect = {
				table: 'sessions',
				query: {token, twitchUserID}
			};
			const results = await database.select(propsForSelect);
			if (results) {
				const pageToRender = req.originalUrl.slice(1).split('?');
				if (req.originalUrl.substr(req.originalUrl.length - 1) === '/') {
					return res.redirect(req.originalUrl.slice(0, -1));
				}
				if (pageToRender[0]) {
					res.render(pageToRender[0] + '.html');
				} else {
					// On homepage, but logged in, redirect to dashboard
					res.redirect('/dashboard');
				}
			} else {
				next();
			}
		} else {
			next();
		}
	} else {
		next();
	}
}

async function getChannelInfo(req) {
	const propsForSelect = {
		table: 'channels',
		query: {ChannelName: req.body.channel}
	};
	return database.select(propsForSelect);
}

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
		query: {twitchUserID: props.twitchUserID}
	};
	const results = await database.select(propsForSelect);
	if (!results) {
		// Channel doesn't exist, add it
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
		dataToUse.timedMessages = [];
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
			const addResults = [];
			for (let i = results.length - 1; i >= 0; i--) {
				switch (results[i].trigger) {
					case '!promote':
					case '!removesong':
					case '!pause':
					case '!play':
					case '!skipsong':
					case '!regular':
					case '!commands':
					case '!volume':
					case '!shuffle':
					case '!lastseen':
					case '!firstseen':
					case '!mute':
					case '!unmute':
					case '!blacklist':
						newData = [{channel: userToAdd, permissionLevel: 3}];
						break;
					default:
						newData = [{channel: userToAdd, permissionLevel: 0}];
						break;
				}
				const dataToUse = {};
				const currentList = results[i].permissionsPerChannel;
				if (Array.isArray(currentList)) {
					Array.prototype.push.apply(currentList, newData);
					dataToUse.permissionsPerChannel = currentList;
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

function renderPageWithChannel(req, res, next) {
	if (req.params.channel) {
		const templateData = {passedUser: req.params.channel};
		const pageToRender = req.originalUrl.split('/');
		res.render(pageToRender[1].replace('/','') + '.html', templateData);
	} else {
		next();
	}
}

async function checkModStatus(req) {
	if (req.cookies.userDetails) {
		const userDetails = req.cookies.userDetails.split(',');
		let channelToCheckMods;
		if (req.params.channel !== undefined) {
			channelToCheckMods = req.params.channel; // From URL, never has #
		} else if (req.body.channel !== undefined) {
			if (req.body.channel.includes('#')) {
				channelToCheckMods = req.body.channel.substring(1); // Has #, needs to be removed
			} else {
				channelToCheckMods = req.body.channel;
			}
		} else if (userDetails[2].includes('#')) {
			channelToCheckMods = userDetails[2].substring(1); // Has #, needs to be removed
		} else {
			channelToCheckMods = userDetails[2];
		}
		const twitchUserID = userDetails[3];
		if (twitchUserID) {
			const propsForSelect = {
				table: 'channels',
				query: {twitchUserID: parseInt(twitchUserID, 10)}
			};
			const results = await database.select(propsForSelect);
			const loggedInChannel = results[0].ChannelName.substring(1);
			const modRes = await twitch.twitchClient.mods(channelToCheckMods);
			const a = modRes.indexOf(loggedInChannel);
			if (a > -1) {
				// User is a mod
				return true;
			}
			if (channelToCheckMods === loggedInChannel) {
				// User is the channel owner
				return true;
			}
			// Username isn't in the mod list, they are not a mod
			return false;
		}
	} else {
		return false;
	}
}

function allowCrossDomain(req, res, next) {
	if (constants.testMode) {
		res.header('Access-Control-Allow-Origin', constants.testPostURL);
	} else {
		res.header('Access-Control-Allow-Origin', constants.postURL);
	}
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	next();
}

module.exports = {
	wwwRedirect,
	checkUserLoginStatus,
	getChannelInfo,
	handleLogin,
	renderPageWithChannel,
	checkModStatus,
	allowCrossDomain
};
