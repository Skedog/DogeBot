const database = require('./database.js');
const request = require('async-request');
const functions = require('./functions.js');

class api {

	async uptime(props) {
		const url = 'https://decapi.me/twitch/uptime?channel=' + props.channel.slice(1);
		const twitchAPIRequest = await request(url);
		if (twitchAPIRequest.body) {
			const editedBody = twitchAPIRequest.body.replace('.','');
			if (twitchAPIRequest.body.length < 40) {
				if (editedBody.includes('offline')) {
					return functions.buildUserString(props) + props.channel.slice(1) + ' is offline!';
				} else {
					return functions.buildUserString(props) + props.channel.slice(1) + ' has been live for ' + editedBody + '!';
				}
			} else {
				return 'Error getting uptime, try again in a few minutes!';
			}
		};
	}

	async followage(props) {
		props.ignoreMessageParamsForUserString = true;
		let userToCheck;
		if (props.messageParams[1]) {
			userToCheck = props.messageParams[1];
		} else {
			userToCheck = props.userstate['display-name'];
		}
		if (props.channel.slice(1) == userToCheck) {
			return 'You can\'t follow your own channel!';
		}
		const url = 'https://beta.decapi.me/twitch/followage/' + props.channel.slice(1) + '/' + userToCheck;
		const twitchAPIRequest = await request(url);
		if (twitchAPIRequest.body) {
			if (twitchAPIRequest.body.length < 40) {
				if (twitchAPIRequest.body.includes('is not following') || twitchAPIRequest.body.includes('cannot follow themself')) {
					return functions.buildUserString(props) + userToCheck + ' is not following! BibleThump';
				} else {
					return functions.buildUserString(props) + userToCheck + ' has been following for ' + twitchAPIRequest.body + '!';
				}
			} else {
				return 'Error getting followage, try again in a few minutes!';
			}
		}
	}

	async game(props) {
		const dbConstants = await database.constants();
		const URLtoUse = "https://api.twitch.tv/kraken/channels/" + props.channel.slice(1) + "?client_id=" + dbConstants.twitchTestClientID;
		const twitchAPIRequest = await request(URLtoUse);
		const currentGame = JSON.parse(twitchAPIRequest.body)['game'];
		if (currentGame) {
			return functions.buildUserString(props) + 'The current game is ' + currentGame + '!';
		}
	}

	async viewers(props) {
		const URLtoUse = 'http://tmi.twitch.tv/group/user/' + props.channel.slice(1) + '/chatters'
		const twitchAPIRequest = await request(URLtoUse);
		const currentViewerCount = JSON.parse(twitchAPIRequest.body)['chatter_count'];
		if (currentViewerCount) {
			return functions.buildUserString(props) + props.channel.slice(1) + ' currently has ' + currentViewerCount + ' viewers!';
		}
	}

	async randomViewer(props) {
		const url = 'https://2g.be/twitch/randomviewer.php?channel=' + props.channel.slice(1);
		const twitchAPIRequest = await request(url);
		if (twitchAPIRequest.body.includes('skedogbot') || twitchAPIRequest.body.includes(props.channel.slice(1))) {
			return this.randomViewer(props);
		} else {
			if (twitchAPIRequest.body.trim().length <= 25) {
				return functions.buildUserString(props) + 'The winner is ' + twitchAPIRequest.body.trim() + '!';
			} else {
				return 'Error getting winner, try again in a few minutes!';
			}
		}
	}

	async bf4stats(props) {
		props.ignoreMessageParamsForUserString = true;
		const plat = props.messageParams[2] ? props.messageParams[2] : 'pc'
		const userToCheck = props.messageParams[1] ? props.messageParams[1] : props.userstate['username']
		const url = 'https://api.bf4stats.com/api/playerInfo?plat=' + plat + '&name=' + userToCheck + '&output=json&opt=urls,stats'
		const twitchAPIRequest = await request(url);
		if (twitchAPIRequest.body) {
			const json = JSON.parse(twitchAPIRequest.body);
			if (!json.error) {
				const playerName = json.player.name;
				const kills = json.stats.kills;
				const deaths = json.stats.deaths;
				const timePlayed = Math.round(json.player.timePlayed/3600);
				const kd = Math.round(((kills / deaths) + 0.00001) * 100) / 100;
				const statsLink = 'https://bf4stats.com/pc/' + playerName;
				const rank = json.stats.rank;
				const msgToSend = playerName + ' has played ~' + timePlayed + ' hours, has a ' + kd + ' k/d, and is rank ' + rank + '! More stats here: ' + statsLink;
				return functions.buildUserString(props) + msgToSend;
			} else {
				return functions.buildUserString(props) + 'User not found, the syntax is "!bf4stats username platform"!';
			}
		}
	}

	async eightBall(props) {
		props.ignoreMessageParamsForUserString = true;
		const outcomes = ['Signs point to yes.', 'Yes.', 'Reply hazy, try again.', 'My sources say no.', 'You may rely on it.', 'Concentrate and ask again.', 'Outlook not so good.', 'It is decidedly so.', 'Better not tell you now.', 'Very doubtful.', 'Yes - definitely.', 'It is certain.', 'Cannot predict now.', 'Most likely.', 'Ask again later.', 'My reply is no.', 'Outlook good.', 'Don\'t count on it.'];
		const randomOutcome = await functions.getRandomItemFromArray(outcomes);
		return functions.buildUserString(props) + randomOutcome[1];
	}
}

module.exports = new api();