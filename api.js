const bhttp = require("bhttp");
const database = require('./database.js');
const functions = require('./functions.js');

class API {

	async uptime(props) {
		try {
			const url = 'https://decapi.me/twitch/uptime?channel=' + props.channel.slice(1);
			const twitchAPIRequest = await bhttp.get(url);
			const returnedBody = String(twitchAPIRequest.body);
			if (returnedBody) {
				const editedBody = returnedBody.replace('.', '');
				if (returnedBody.length < 40) {
					if (editedBody.includes('offline')) {
						return functions.buildUserString(props) + props.channel.slice(1) + ' is offline!';
					}
					return functions.buildUserString(props) + props.channel.slice(1) + ' has been live for ' + editedBody + '!';
				}
				return 'Error getting uptime, try again in a few minutes!';
			}
		} catch(err) {
			return 'Error getting uptime, try again in a few minutes!';
		}
	}

	async followage(props) {
		try {
			props.ignoreMessageParamsForUserString = true;
			let userToCheck;
			if (props.messageParams[1]) {
				userToCheck = props.messageParams[1];
			} else {
				userToCheck = props.userstate['display-name'];
			}
			if (props.channel.slice(1) === userToCheck) {
				return 'You can\'t follow your own channel!';
			}
			const url = 'https://beta.decapi.me/twitch/followage/' + props.channel.slice(1) + '/' + userToCheck.replace('@', '');
			const twitchAPIRequest = await bhttp.get(url);
			const returnedBody = String(twitchAPIRequest.body);
			if (returnedBody) {
				if (returnedBody.length < 40) {
					if (returnedBody.includes('is not following') || returnedBody.includes('cannot follow themself') || returnedBody.includes('Follow not found') || returnedBody.includes('No user with')) {
						return functions.buildUserString(props) + userToCheck + ' is not following! BibleThump';
					}
					return functions.buildUserString(props) + userToCheck + ' has been following for ' + returnedBody + '!';
				}
				return 'Error getting followage, try again in a few minutes!';
			}
		} catch(err) {
			return 'Error getting followage, try again in a few minutes!';
		}
	}

	async getUserOAuthToken(props) {
		let propsForSelect = {
			table: 'channels',
			query: {ChannelName: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const twitchUserID = results[0].twitchUserID;
			propsForSelect = {
				table: 'sessions',
				query: {twitchUserID}
			};
			const res = await database.select(propsForSelect);
			if (res) {
				return res[0].token;
			}
		}
	}

	async getUserID(props) {
		const propsForSelect = {
			table: 'channels',
			query: {ChannelName: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return results[0].twitchUserID;
		}
	}

	async game(props) {
		const dbConstants = await database.constants();
		if (props.messageParams[1]) {
			props.ignoreMessageParamsForUserString = true;
			const newGame = props.messageParams.slice(1, props.messageParams.length).join(' ');
			const token = await this.getUserOAuthToken(props);
			const userID = await this.getUserID(props);
			const putSettings = {
				headers: {
					Authorization: 'OAuth ' + token,
					'Client-ID': dbConstants.twitchClientID,
					Accept: 'application/vnd.twitchtv.v5+json'
				}
			};
			const dataToSend = {'channel[game]': newGame};
			const URLtoUse = 'https://api.twitch.tv/kraken/channels/' + userID;
			try {
				const twitchAPIRequest = await bhttp.put(URLtoUse, dataToSend, putSettings);
				const updatedGame = twitchAPIRequest.body.game;
				if (updatedGame) {
					return functions.buildUserString(props) + 'The current game has been updated to ' + newGame + '!';
				}
			} catch(err) {
				return 'Error setting the game, try again in a few minutes!';
			}
		} else {
			try {
				const URLtoUse = 'https://api.twitch.tv/kraken/channels/' + props.channel.slice(1) + '?client_id=' + dbConstants.twitchClientID;
				const twitchAPIRequest = await bhttp.get(URLtoUse);
				const currentGame = twitchAPIRequest.body.game;
				if (currentGame) {
					return functions.buildUserString(props) + 'The current game is ' + currentGame + '!';
				}
			} catch(err) {
				return 'Error getting the current game, try again in a few minutes!';
			}
		}
	}

	async getLastPlayedGame(channel) {
		if (channel) {
			const dbConstants = await database.constants();
			const URLtoUse = 'https://api.twitch.tv/kraken/channels/' + channel + '?client_id=' + dbConstants.twitchClientID;
			try {
				const twitchAPIRequest = await bhttp.get(URLtoUse);
				const currentGame = twitchAPIRequest.body.game;
				if (currentGame) {
					return currentGame;
				}
			} catch(err) {
				return;
			}
		}
	}

	async title(props) {
		const dbConstants = await database.constants();
		if (props.messageParams[1]) {
			props.ignoreMessageParamsForUserString = true;
			const newTitle = props.messageParams.slice(1, props.messageParams.length).join(' ');
			const token = await this.getUserOAuthToken(props);
			const userID = await this.getUserID(props);
			const putSettings = {
				headers: {
					Authorization: 'OAuth ' + token,
					'Client-ID': dbConstants.twitchClientID,
					Accept: 'application/vnd.twitchtv.v5+json'
				}
			};
			const dataToSend = {'channel[status]': newTitle};
			const URLtoUse = 'https://api.twitch.tv/kraken/channels/' + userID;
			const twitchAPIRequest = await bhttp.put(URLtoUse, dataToSend, putSettings);
			return functions.buildUserString(props) + 'The title has been updated to ' + newTitle + '!';
		} else {
			const URLtoUse = 'https://api.twitch.tv/kraken/channels/' + props.channel.slice(1) + '?client_id=' + dbConstants.twitchClientID;
			const twitchAPIRequest = await bhttp.get(URLtoUse);
			const currentTitle = twitchAPIRequest.body.status;
			if (currentTitle) {
				return functions.buildUserString(props) + 'The title is ' + currentTitle + '!';
			}
		}
	}

	async viewers(props) {
		const URLtoUse = 'https://tmi.twitch.tv/group/user/' + props.channel.slice(1) + '/chatters';
		try {
			const twitchAPIRequest = await bhttp.get(URLtoUse);
			const currentViewerCount = twitchAPIRequest.body.chatter_count;
			if (currentViewerCount >= 0) {
				return functions.buildUserString(props) + props.channel.slice(1) + ' currently has ' + currentViewerCount + ' viewers!';
			}
		} catch(err) {
			return functions.buildUserString(props) + 'Error getting the number of viewers, try again in a few minutes!';
		}
	}

	async randomViewer(props) {
		const url = 'https://2g.be/twitch/randomviewer.php?channel=' + props.channel.slice(1);
		const twitchAPIRequest = await bhttp.get(url);
		const returnedBody = String(twitchAPIRequest.body);
		if (returnedBody.includes('dogebot') || returnedBody.includes(props.channel.slice(1))) {
			if (props.attempts === undefined) {
				props.attempts = 1;
			} else {
				props.attempts += 1;
			}
			if (props.attempts === 5) {
				return 'Error getting winner, try again in a few minutes!';
			}
			return this.randomViewer(props);
		}
		if (returnedBody.trim().length <= 25) {
			return functions.buildUserString(props) + 'The winner is ' + returnedBody.trim() + '!';
		}
		return 'Error getting winner, try again in a few minutes!';
	}

	async bf4stats(props) {
		props.ignoreMessageParamsForUserString = true;
		const plat = props.messageParams[2] ? props.messageParams[2] : 'pc';
		const userToCheck = props.messageParams[1] ? props.messageParams[1] : props.userstate.username;
		const url = 'https://api.bf4stats.com/api/playerInfo?plat=' + plat + '&name=' + userToCheck + '&output=json&opt=urls,stats';
		const httpRequest = await bhttp.get(url);
		if (httpRequest.body) {
			const json = httpRequest.body;
			if (!json.error) {
				const playerName = json.player.name;
				const kills = json.stats.kills;
				const deaths = json.stats.deaths;
				const timePlayed = Math.round(json.player.timePlayed / 3600);
				const kd = Math.round(((kills / deaths) + 0.00001) * 100) / 100;
				const statsLink = 'https://bf4stats.com/pc/' + playerName;
				const rank = json.stats.rank;
				const msgToSend = playerName + ' has played ~' + timePlayed + ' hours, has a ' + kd + ' k/d, and is rank ' + rank + '! More stats here: ' + statsLink;
				return functions.buildUserString(props) + msgToSend;
			}
			return functions.buildUserString(props) + 'User not found, the syntax is "!bf4stats username platform"!';
		}
	}

	async bfServer(props) {
		props.ignoreMessageParamsForUserString = true;
		const commandMessage = props.resultsToPass[0].chatmessage;
		// Check if the command was set-up correctly - which is $(bfserver:username)
		if (!commandMessage.includes(':')) {
			return functions.buildUserString(props) + ' this command isn\'t set up correctly - the syntax is "$(bfserver:username)"!';
		}
		const commandSplit = commandMessage.split(':');
		const userToCheck = commandSplit[1].replace(')', '').trim();
		const url = 'https://api.dinu.tv/battlelogText/?op=server&username=' + userToCheck;
		const httpRequest = await bhttp.get(url);
		if (httpRequest.body) {
			return functions.buildUserString(props) + httpRequest.body;
		} else {
			return functions.buildUserString(props) + 'Error getting server information, please try again in a few minutes!';
		}
	}

	async eightBall(props) {
		props.ignoreMessageParamsForUserString = true;
		const outcomes = ['Signs point to yes.', 'Yes.', 'Reply hazy, try again.', 'My sources say no.', 'You may rely on it.', 'Concentrate and ask again.', 'Outlook not so good.', 'It is decidedly so.', 'Better not tell you now.', 'Very doubtful.', 'Yes - definitely.', 'It is certain.', 'Cannot predict now.', 'Most likely.', 'Ask again later.', 'My reply is no.', 'Outlook good.', 'Don\'t count on it.'];
		const randomOutcome = await functions.getRandomItemFromArray(outcomes);
		return functions.buildUserString(props) + randomOutcome[1];
	}

	async shoutout(props) {
		try {
			props.ignoreMessageParamsForUserString = true;
			const streamerToShoutout = props.messageParams[1];
			const lastPlayedGame = await this.getLastPlayedGame(streamerToShoutout);
			if (streamerToShoutout) {
				if (lastPlayedGame) {
					return 'Make sure to give ' + streamerToShoutout + ' a follow! ' + streamerToShoutout + ' was last seen playing ' + lastPlayedGame + '. You can follow ' + streamerToShoutout + ' at https://twitch.tv/' + streamerToShoutout;
				} else {
					return 'Make sure to give ' + streamerToShoutout + ' a follow! You can follow ' + streamerToShoutout + ' at https://twitch.tv/' + streamerToShoutout;
				}
			}
		} catch(err) {
			return 'Make sure to give ' + streamerToShoutout + ' a follow! You can follow ' + streamerToShoutout + ' at https://twitch.tv/' + streamerToShoutout;
		}
	}
}

module.exports = new API();
