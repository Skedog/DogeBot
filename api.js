const rp = require('request-promise');
const database = require('./database.js');
const functions = require('./functions.js');
const constants = require('./constants.js');

class API {

	async uptime(props) {
		const options = {
			uri: 'https://decapi.me/twitch/uptime?channel=' + props.channel.slice(1)
		};
		const errMsg = 'Error getting uptime, try again in a few minutes!';
		return rp(options).then(returnedBody => {
			const editedBody = returnedBody.replace('.', '');
			if (returnedBody.length < 40) {
				if (editedBody.includes('offline')) {
					return functions.buildUserString(props) + props.channel.slice(1) + ' is offline!';
				}
				return functions.buildUserString(props) + props.channel.slice(1) + ' has been live for ' + editedBody + '!';
			}
			return errMsg;
		}).catch(err => {
			console.log('Error with !uptime: ' + err);
			return errMsg;
		});
	}

	async followage(props) {
		props.ignoreMessageParamsForUserString = true;
		let userToCheck;
		if (props.messageParams[1]) {
			userToCheck = props.messageParams[1];
		} else {
			userToCheck = props.userstate.username;
		}
		if (props.channel.slice(1) === userToCheck) {
			return 'You can\'t follow your own channel!';
		}
		const options = {
			uri: 'https://beta.decapi.me/twitch/followage/' + props.channel.slice(1) + '/' + userToCheck.replace('@', '')
		};
		const errMsg = 'Error getting followage, try again in a few minutes!';
		return rp(options).then(returnedBody => {
			if (returnedBody.length < 40) {
				if (returnedBody.includes('is not following') || returnedBody.includes('cannot follow themself') || returnedBody.includes('Follow not found') || returnedBody.includes('No user with') || returnedBody.includes('does not follow')) {
					return functions.buildUserString(props) + userToCheck + ' is not following! BibleThump';
				}
				return functions.buildUserString(props) + userToCheck + ' has been following for ' + returnedBody + '!';
			}
			return errMsg;
		}).catch(err => {
			console.log('Error with !followage: ' + err);
			return errMsg;
		});
	}

	async getUserOAuthToken(props) {
		let channelToGet = '';
		channelToGet = props.channel;
		if (!channelToGet.includes('#')) {
			channelToGet = '#' + channelToGet.toLowerCase();
		}
		let propsForSelect = {
			table: 'channels',
			query: {ChannelName: channelToGet}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const twitchUserID = results[0].twitchUserID.toString();
			propsForSelect = {
				table: 'sessions',
				query: {twitchUserID},
				sortBy: {_id: -1}
			};
			const res = await database.select(propsForSelect);
			if (res) {
				return res[0].token;
			}
		}
	}

	async getUserID(props) {
		let channelToGet = props.channel;
		if (!channelToGet.includes('#')) {
			channelToGet = '#' + channelToGet.toLowerCase();
		}
		const propsForSelect = {
			table: 'channels',
			query: {ChannelName: channelToGet}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return results[0].twitchUserID;
		}
	}

	async game(props) {
		const dbConstants = await database.constants();
		let clientIDToUse = '';
		if (constants.testMode) {
			clientIDToUse = dbConstants.twitchTestClientID;
		} else {
			clientIDToUse = dbConstants.twitchClientID;
		}
		const token = await this.getUserOAuthToken(props);
		if (props.messageParams[1]) {
			props.ignoreMessageParamsForUserString = true;
			const newGame = props.messageParams.slice(1, props.messageParams.length).join(' ');
			const userID = await this.getUserID(props);
			const optForGetGameID = {
				method: 'GET',
				uri: 'https://api.twitch.tv/helix/games?name=' + newGame,
				headers: {
					'Client-ID': clientIDToUse,
					'Accept': 'application/vnd.twitchtv.v5+json',
					'Authorization': 'Bearer ' + token
				},
				json: true
			};
			return rp(optForGetGameID).then(body => {
				const gameIDtoSet = body.data[0].id;
				const options = {
					method: 'PATCH',
					uri: 'https://api.twitch.tv/helix/channels?broadcaster_id=' + userID,
					body: {game_id:gameIDtoSet},
					headers: {
						'Client-ID': clientIDToUse,
						'Accept': 'application/vnd.twitchtv.v5+json',
						'Authorization': 'Bearer ' + token
					},
					json: true
				};
				return rp(options).then(body => {
					return functions.buildUserString(props) + 'The current game has been updated to ' + newGame + '!';
				}).catch(err => {
					console.log('Error with !game: ' + err);
					return 'Error setting the game, try again in a few minutes!';
				});
			}).catch(err => {
				console.log('Error with !game: ' + err);
				return 'Error setting the game, try again in a few minutes!';
			});
		}
		const userID = await this.getUserID(props);

		const options = {
			method: 'GET',
			uri: 'https://api.twitch.tv/helix/channels?broadcaster_id=' + userID,
			headers: {
				'Client-ID': clientIDToUse,
				'Accept': 'application/vnd.twitchtv.v5+json',
				'Authorization': 'Bearer ' + token
			},
			json: true
		};
		return rp(options).then(body => {
			const currentGame = body.data[0].game_name;
			if (currentGame) {
				return functions.buildUserString(props) + 'The current game is ' + currentGame + '!';
			}
		}).catch(err => {
			console.log('Error with !game: ' + err);
			return 'Error getting the current game, try again in a few minutes!';
		});
	}

	async getLastPlayedGame(channel) {
		if (channel) {
			const dbConstants = await database.constants();
			const propsToPass = {
				channel
			};
			const userID = await this.getUserID(propsToPass);
			const options = {
				method: 'GET',
				uri: 'https://api.twitch.tv/helix/channels/' + userID,
				headers: {
					'Client-ID': dbConstants.twitchClientID,
					Accept: 'application/vnd.twitchtv.v5+json'
				},
				json: true
			};
			return rp(options).then(body => {
				const currentGame = body.game;
				if (currentGame) {
					return currentGame;
				}
			}).catch(err => {
				console.log('Error with getLastPlayedGame: ' + err);
			});
		}
	}

	async title(props) {
		const dbConstants = await database.constants();
		let clientIDToUse = '';
		if (constants.testMode) {
			clientIDToUse = dbConstants.twitchTestClientID;
		} else {
			clientIDToUse = dbConstants.twitchClientID;
		}
		const token = await this.getUserOAuthToken(props);
		if (props.messageParams[1]) {
			props.ignoreMessageParamsForUserString = true;
			const newTitle = props.messageParams.slice(1, props.messageParams.length).join(' ');
			const userID = await this.getUserID(props);
			const options = {
				method: 'PATCH',
				uri: 'https://api.twitch.tv/helix/channels?broadcaster_id=' + userID,
				body: {title:newTitle},
				headers: {
					'Client-ID': clientIDToUse,
					'Accept': 'application/vnd.twitchtv.v5+json',
					'Authorization': 'Bearer ' + token
				},
				json: true
			};
			return rp(options).then(() => {
				return functions.buildUserString(props) + 'The title has been updated to ' + newTitle + '!';
			}).catch(err => {
				if (err.error.message === 'invalid oauth token') {
					console.log('Error updating !title (' + props.channel + ') due to invalid oauth token.');
					return 'Error setting the title, please login to https://thedogebot.com/login to refresh your session, and then try again!';
				}
				console.log('Error updating !title (' + props.channel + ') ' + err);
				return 'Error setting the title, try again in a few minutes!';
			});
		}
		const userID = await this.getUserID(props);
		const options = {
			method: 'GET',
			uri: 'https://api.twitch.tv/helix/channels?broadcaster_id=' + userID,
			headers: {
				'Client-ID': clientIDToUse,
				'Accept': 'application/vnd.twitchtv.v5+json',
				'Authorization': 'Bearer ' + token
			},
			json: true
		};
		return rp(options).then(body => {
			const currentTitle = body.data[0].title;
			if (currentTitle) {
				return functions.buildUserString(props) + 'The title is ' + currentTitle + '!';
			}
		}).catch(err => {
			console.log('Error with !title: ' + err);
		});
	}

	async viewers(props) {
		const options = {
			uri: 'https://tmi.twitch.tv/group/user/' + props.channel.slice(1) + '/chatters',
			json: true
		};
		return rp(options).then(body => {
			const currentViewerCount = body.chatter_count;
			if (currentViewerCount >= 0) {
				return functions.buildUserString(props) + props.channel.slice(1) + ' currently has ' + currentViewerCount + ' viewers!';
			}
		}).catch(err => {
			console.log('Error with !viewers: ' + err);
			return functions.buildUserString(props) + 'Error getting the number of viewers, try again in a few minutes!';
		});
	}

	async randomViewer(props) {
		const options = {
			uri: 'https://2g.be/twitch/randomviewer.php?channel=' + props.channel.slice(1)
		};
		return rp(options).then(body => {
			if (body.includes('dogebot') || body.includes(props.channel.slice(1))) {
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
			if (body.trim().length <= 25) {
				return functions.buildUserString(props) + 'The winner is ' + body.trim() + '!';
			}
		}).catch(err => {
			console.log('Error with randomViewer: ' + err);
			return 'Error getting winner, try again in a few minutes!';
		});
	}

	async bf4stats(props) {
		return 'This API is no longer supported, as the stats website has been shut down. See this: https://endof.p-stats.com/';
		props.ignoreMessageParamsForUserString = true;
		const plat = props.messageParams[2] ? props.messageParams[2] : 'pc';
		const userToCheck = props.messageParams[1] ? props.messageParams[1] : props.userstate.username;

		const options = {
			uri: 'https://api.bf4stats.com/api/playerInfo?plat=' + plat + '&name=' + userToCheck + '&output=json&opt=urls,stats',
			json: true
		};
		return rp(options).then(body => {
			const playerName = body.player.name;
			const kills = body.stats.kills;
			const deaths = body.stats.deaths;
			const timePlayed = Math.round(body.player.timePlayed / 3600);
			const kd = Math.round(((kills / deaths) + 0.00001) * 100) / 100;
			const statsLink = 'https://bf4stats.com/pc/' + playerName;
			const rank = body.stats.rank;
			const msgToSend = playerName + ' has played ~' + timePlayed + ' hours, has a ' + kd + ' k/d, and is rank ' + rank + '! More stats here: ' + statsLink;
			return functions.buildUserString(props) + msgToSend;
		}).catch(err => {
			console.log('Error with bf4stats: ' + err);
			return functions.buildUserString(props) + 'User not found, the syntax is "!bf4stats username platform"!';
		});
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
		const options = {
			uri: 'https://api.dinu.tv/battlelogText/?op=server&username=' + userToCheck
		};
		return rp(options).then(body => {
			return functions.buildUserString(props) + body;
		}).catch(err => {
			console.log('Error with bfServer: ' + err);
			return functions.buildUserString(props) + 'Error getting server information, please try again in a few minutes!';
		});
	}

	async eightBall(props) {
		props.ignoreMessageParamsForUserString = true;
		const outcomes = ['Signs point to yes.', 'Yes.', 'Reply hazy, try again.', 'My sources say no.', 'You may rely on it.', 'Concentrate and ask again.', 'Outlook not so good.', 'It is decidedly so.', 'Better not tell you now.', 'Very doubtful.', 'Yes - definitely.', 'It is certain.', 'Cannot predict now.', 'Most likely.', 'Ask again later.', 'My reply is no.', 'Outlook good.', 'Don\'t count on it.'];
		const randomOutcome = await functions.getRandomItemFromArray(outcomes);
		return functions.buildUserString(props) + randomOutcome[1];
	}

	async shoutout(props) {
		let streamerToShoutout = props.messageParams[1];
		try {
			if (streamerToShoutout !== '') {
				streamerToShoutout = streamerToShoutout.replace('@', '');
			}
			props.ignoreMessageParamsForUserString = true;
			const lastPlayedGame = await this.getLastPlayedGame(streamerToShoutout);
			if (streamerToShoutout) {
				if (lastPlayedGame) {
					return 'Make sure to give ' + streamerToShoutout + ' a follow! ' + streamerToShoutout + ' was last seen playing ' + lastPlayedGame + '. You can follow ' + streamerToShoutout + ' at https://twitch.tv/' + streamerToShoutout;
				}
				return 'Make sure to give ' + streamerToShoutout + ' a follow! You can follow ' + streamerToShoutout + ' at https://twitch.tv/' + streamerToShoutout;
			}
		} catch (err) {
			console.log('Error with shoutout: ' + err);
			return 'Make sure to give ' + streamerToShoutout + ' a follow! You can follow ' + streamerToShoutout + ' at https://twitch.tv/' + streamerToShoutout;
		}
	}
}

module.exports = new API();
