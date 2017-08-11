const database = require('./database.js');
const permissions = require('./permissions.js');
const lists = require('./lists.js');
const messages = require('./chat-messages.js');
const commands = require('./commands.js');
const regulars = require('./regulars.js');
const api = require('./api.js');
const users = require('./users.js');
const songs = require('./songs.js');
const commandDelayTimerArray = {};

class chat {

	async callCommand(props) {
		//select from user added commands
		const propsForSelect = {
			table:'commands',
			query:{channel:props.channel,trigger:props.messageParams[0]}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			if (results[0].isAlias) {
				props.messageParams[0] = results[0].aliasFor;
				const propsForcallCommand = {
					userstate:props.userstate,
					channel:props.channel,
					messageParams:props.messageParams
				}
				return this.callCommand(propsForcallCommand);
			} else {
				props.resultsToPass = results;
				return await this.callUserAddedCommand(props);
			}
		} else {
			//select from default commands
			const propsForSelect = {
				table:'defaultCommands',
				query:{trigger:props.messageParams[0]}
			}
			const results = await database.select(propsForSelect);
			if (results) {
				if (results[0].isAlias) {
					props.messageParams[0] = results[0].aliasFor;
					const propsForcallCommand = {
						userstate:props.userstate,
						channel:props.channel,
						messageParams:props.messageParams
					}
					return this.callCommand(propsForcallCommand);
				} else {
					props.resultsToPass = results;
					return await this.callDefaultCommand(props);
				}
			}
		}
	}

	async callDefaultCommand(props) {
		try {
			switch(props.resultsToPass[0]['trigger']) {
				case '!commands':
				case '!command':
					return await commands.call(props);
					break;
				case '!regular':
				case '!regulars':
					return await regulars.call(props);
					break;
				case '!uptime':
					return await api.uptime(props);
					break;
				case '!followage':
					return await api.followage(props);
					break;
				case '!game':
					return await api.game(props);
					break;
				case '!viewers':
					return await api.viewers(props);
					break;
				case '!winner':
					return await api.randomViewer(props);
					break;
				case '!bf4stats':
					return await api.bf4stats(props);
					break;
				case '!8ball':
					return await api.eightBall(props);
					break;
				case '!lastseen':
					return await users.lastSeen(props);
					break;
				case '!firstseen':
					return await users.firstSeen(props);
					break;
				case '!songlist':
				case '!songs':
				case '!sl':
					return await songs.songlist(props);
					break;
				case '!songcache':
				case '!cache':
					return await songs.songcache(props);
					break;
				case '!currentsong':
				case '!song':
				case '!cs':
					return await songs.currentSong(props);
					break;
				case '!volume':
					return await songs.callVolume(props);
					break;
				case '!play':
					return await songs.play(props);
					break;
				case '!pause':
					return await songs.pause(props);
					break;
				case '!skipsong':
					return await songs.skip(props);
					break;
				case '!wrongsong':
					return await songs.wrongSong(props);
					break;
				case '!removesong':
				case '!removesongs':
					return await songs.remove(props);
					break;
				case '!promote':
					return await songs.promote(props);
					break;
				case '!shuffle':
					return await songs.shuffle(props);
					break;
				case '!songrequest':
				case '!sr':
					return await songs.requestSongs(props);
					break;
				case '!playlistrequest':
				case '!pr':
					return await songs.requestPlaylist(props);
					break;
				case '!mute':
					return await messages.mute(props);
					break;
				case '!unmute':
					return await messages.unmute(props);
					break;
				default:
					log.error('missing a break; inside switch for callDefaultCommand!');
					break;
			}
		} catch (err) {
			throw err;
		}
	}

	async callUserAddedCommand(props) {
		const res = await this.buildUserAddedCommandMessage(props);
		props.messageToSend = res;
		await this.increaseCommandCounter(props);
		return props.messageToSend;
	}

	async buildUserAddedCommandMessage(props) {
		const commandMessage = props.resultsToPass[0].chatmessage;
		if (commandMessage.includes('$(list)')) {
			//get permissions level for adding commands, and use this to determine if a user can add a list item
			const propsForCommandPermissionLevel = {
				userstate:props.userstate,
				channel:props.channel,
				messageParams:['!commands','add']
			}
			const addCommandPermissionLevel = await permissions.CommandPermissionLevel(propsForCommandPermissionLevel);
			const currentUserPermissionLevel = await permissions.getUserPermissionLevel(propsForCommandPermissionLevel);
			const propsForListCommands = {
				channel:props.channel,
				messageParams:props.messageParams,
				results:props.resultsToPass
			}
			if (currentUserPermissionLevel >= addCommandPermissionLevel) {
				try {
					switch(props.messageParams[1]) {
						case 'add':
							return await lists.add(propsForListCommands);
							break;
						case 'edit':
							return await lists.edit(propsForListCommands);
							break;
						case 'delete':
						case 'remove':
							return await lists.remove(propsForListCommands);
							break;
						default:
							return await lists.getListCommandItem(propsForListCommands);
							break;
					};
				} catch (err) {
					throw err;
				}
			} else {
				throw 'Failed permission check for list commands';
			};
		} else {
			let messageToSend = commandMessage.replace('&apos;',"'");
			messageToSend = props.messageParams[1] ?
				messageToSend.replace('$(touser)',props.messageParams[1]).replace('$(user)',props.messageParams[1]) :
				messageToSend.replace('$(touser)',props.userstate['display-name']).replace('$(user)',props.userstate['display-name'])
			return messageToSend;
		}
	}

	increaseCommandCounter(props) {
		const increasedCommandCounter = parseInt(props.resultsToPass[0].commandcounter,10) + 1;
		let dataToUse = {};
		dataToUse["commandcounter"] = increasedCommandCounter;
		const propsForUpdate = {
			table:'commands',
			query:{channel:props.channel,trigger:props.messageParams[0]},
			dataToUse:dataToUse
		}
		database.update(propsForUpdate);
		props.messageToSend = props.messageToSend.replace('$(counter)',increasedCommandCounter);
		return 'increased';
	}

	checkAndSetCommandDelayTimer(props) {
		const currentTime = new Date().getTime() / 1000;
		if (!commandDelayTimerArray[props.channel][props.messageParams[0]] || currentTime - commandDelayTimerArray[props.channel][props.messageParams[0]] >= 2) {
			commandDelayTimerArray[props.channel][props.messageParams[0]] = currentTime;
			return currentTime;
		} else {
			throw 'didn\'t meet time requirement, try again in a couple of seconds';
		}
	}

	setDelayTimerForSingleChannel(props) {
		return commandDelayTimerArray[props.channel] ? '' : commandDelayTimerArray[props.channel] = {};
	}

	async setDelayTimerForMultipleChannels(channelArray) {
		for (let channel of channelArray) {
			commandDelayTimerArray[channel] ? '' : commandDelayTimerArray[channel] = {};
		}
		return;
	}
}

module.exports = new chat();