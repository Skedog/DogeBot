const database = require('./database.js');
const constants = require('./constants.js');
const twitch = require('./twitch.js');

function wwwRedirect(req, res, next) {
	if (req.headers.host.slice(0, 4) === 'www.') {
		const newHost = req.headers.host.slice(4);
		return res.redirect(301, req.protocol + '://' + newHost + req.originalUrl);
	}
	next();
};

async function checkUserLoginStatus(req, res, next) {
	const token = req.cookies.token;
	if (req.cookies.userDetails) {
		const userDetails = req.cookies.userDetails.split(',');
		const currentChannel = userDetails[2];
		let twitchUserID = userDetails[3];
		if (token) {
			twitchUserID = parseInt(twitchUserID, 10);
			const propsForSelect = {
				table: 'sessions',
				query: {token:token,twitchUserID:twitchUserID}
			}
			const results = await database.select(propsForSelect);
			if (results) {
				templateData = {};
				const pageToRender = req.originalUrl.slice(1).split('?');
				if (pageToRender[0]) {
					res.render(pageToRender[0] + '.html', templateData);
				} else {
					//on homepage, but logged in, redirect to dashboard
					res.redirect('/dashboard');
				}
			} else {
				next();
			}
		} else {
			next();
		}
	} else {
		const currentChannel = '';
		next();
	}
}

async function getChannelInfo(req) {
	const propsForSelect = {
		table: 'channels',
		query: {ChannelName:req.body.channel}
	}
	return await database.select(propsForSelect);
}

async function handleLogin(props) {
	const sessionData = {};
	sessionData["twitchUserID"] = props.twitchUserID;
	sessionData["token"] = props.token;
	const propsForAdd = {
		table: 'sessions',
		dataToUse: sessionData
	}
	await database.add(propsForAdd);
	//handle user adding and updating
	const propsForSelect = {
		table: 'channels',
		query: {twitchUserID:props.twitchUserID}
	}
	let results = await database.select(propsForSelect);
	if (!results) {
		//channel doesn't exist, add it
		let dataToUse = {};
		const userToAdd = '#' + props.ChannelName.toLowerCase();
		dataToUse["ChannelName"] = props.userToAdd;
		dataToUse["ChannelEmail"] = props.userEmail;
		dataToUse["ChannelLogo"] = props.userLogo;
		dataToUse["twitchUserID"] = props.twitchUserID;
		dataToUse["volume"] = 30;
		dataToUse["musicStatus"] = 'pause';
		dataToUse["tempSortVal"] = 199999;
		dataToUse["inChannel"] = false; //starts off with the bot not in this channel
		dataToUse["maxSongLength"] = 12; //stored in minutes - max length per song
		dataToUse["songNumberLimit"] = 10; //how many songs per user
		dataToUse["duplicateSongDelay"] = 20; //stored in hours - hours before allowing duplicate song
		dataToUse["isSilent"] = false;
		const propsForAdd = {
			table: 'channels',
			dataToUse: dataToUse
		}
		await database.add(propsForAdd);
		const propsForSelect = {
			table: 'defaultCommands'
		}
		let results = await database.select(propsForSelect);
		if (results) {
			let newData = [];
			for (let i = results.length - 1; i >= 0; i--) {
				switch(results[i]['trigger']) {
					case "!promote":
					case "!removesong":
					case "!pause":
					case "!play":
					case "!skipsong":
					case "!regular":
					case "!commands":
					case "!volume":
					case "!shuffle":
					case "!lastseen":
					case "!firstseen":
					case "!mute":
					case "!unmute":
						newData = [{"channel": userToAdd,"permissionLevel": 3}];
						break;
					default:
						newData = [{"channel": userToAdd,"permissionLevel": 0}];
						break;
				}
				let dataToUse = {};
				const currentList = results[i].permissionsPerChannel;
				if (currentList instanceof Array) {
					Array.prototype.push.apply(currentList, newData);
					dataToUse["permissionsPerChannel"] = currentList;
					let propsForUpdate = {
						table: 'defaultCommands',
						query: {trigger:results[i].trigger},
						dataToUse: dataToUse
					}
					await database.update(propsForUpdate);
				}
			}
		}
		return 'useradded';
	} else {
		const userToUpdate = '#' + props.ChannelName;
		let propsForUpdate,dataToUse;
		if (results[0].ChannelName.toLowerCase() != userToUpdate.toLowerCase()) {
			//this should only fire if a user has changed their username on Twitch
			//we need to update all the tables that contain the username
			dataToUse = {};
			dataToUse["channel"] = userToUpdate;
			propsForUpdate = {
				table: 'commands',
				dataToUse: dataToUse
			}
			database.updateall(propsForUpdate);
			propsForUpdate = {
				table: 'regulars',
				dataToUse: dataToUse
			}
			database.updateall(propsForUpdate);
			propsForUpdate = {
				table: 'chatusers',
				dataToUse: dataToUse
			}
			database.updateall(propsForUpdate);
			propsForUpdate = {
				table: 'songs',
				dataToUse: dataToUse
			}
			database.updateall(propsForUpdate);
			propsForUpdate = {
				table: 'songcache',
				dataToUse: dataToUse
			}
			database.updateall(propsForUpdate);
			propsForUpdate = {
				table: 'chatmessages',
				dataToUse: dataToUse
			}
			database.updateall(propsForUpdate);
			propsForUpdate = {
				table: 'commandmessages',
				dataToUse: dataToUse
			}
			database.updateall(propsForUpdate);
			propsForUpdate = {
				table: 'defaultCommands',
				query: {permissionsPerChannel: { $elemMatch: { channel: results[0].ChannelName}}},
				dataToUse: {"permissionsPerChannel.$.channel" : userToUpdate}
			}
			await database.updateall(propsForUpdate);
		}
		dataToUse = {};
		dataToUse["ChannelEmail"] = props.userEmail;
		dataToUse["ChannelLogo"] = props.userLogo;
		dataToUse["ChannelName"] = userToUpdate;
		propsForUpdate = {
			table: 'channels',
			query: {twitchUserID:props.twitchUserID},
			dataToUse: dataToUse
		}
		await database.update(propsForUpdate);
		return 'userupdated';
	}
}

function renderPageWithChannel(req, res, next) {
	const templateData = {passedUser: req.params.channel};
	const pageToRender = req.originalUrl.split('/');
	res.render(pageToRender[1] + '.html', templateData);
}

async function checkModStatus(req) {
	if (req.cookies.userDetails) {
		const userDetails = req.cookies.userDetails.split(',');
		let channelToCheckMods;
		if (req.channel != undefined) {
			channelToCheckMods = req.channel; //from URL, never has #
		} else if (req.body.channel != undefined) {
			if (req.body.channel.includes('#')) {
				channelToCheckMods = req.body.channel.substring(1); //has #, needs to be removed
			} else {
				channelToCheckMods = req.body.channel;
			}
		} else {
			if (userDetails[2].includes('#')) {
				channelToCheckMods = userDetails[2].substring(1); //has #, needs to be removed
			} else {
				channelToCheckMods = userDetails[2];
			}
		}
		const twitchUserID = userDetails[3];
		if (twitchUserID) {
			let propsForSelect = {
				table: 'channels',
				query: {twitchUserID:parseInt(twitchUserID)}
			}
			const results = await database.select(propsForSelect);
			loggedInChannel = results[0]['ChannelName'].substring(1);
			const modRes = await twitch.twitchClient.mods(channelToCheckMods);
			const a = modRes.indexOf(loggedInChannel);
			if (a > -1) {
				//user is a mod
				return true;
			} else {
				if (channelToCheckMods == loggedInChannel) {
					//user is the channel owner
					return true;
				} else {
					//username isn't in the mod list, they are not a mod
					return false;
				}
			};
		}
	} else {
		return false;
	};
}

var allowCrossDomain = function(req, res, next) {
	if (constants.testMode) {
		res.header('Access-Control-Allow-Origin', constants.testPostURL);
	} else {
		res.header('Access-Control-Allow-Origin', constants.postURL);
	}
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	next();
};

module.exports = {
	wwwRedirect: wwwRedirect,
	checkUserLoginStatus: checkUserLoginStatus,
	getChannelInfo: getChannelInfo,
	handleLogin: handleLogin,
	renderPageWithChannel: renderPageWithChannel,
	checkModStatus: checkModStatus,
	allowCrossDomain: allowCrossDomain
};