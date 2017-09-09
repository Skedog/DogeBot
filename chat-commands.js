const database = require('./database.js');
const permissions = require('./permissions.js');
const lists = require('./lists.js');
const messages = require('./chat-messages.js');
const commands = require('./commands.js');
const blacklist = require('./blacklist.js');
const regulars = require('./regulars.js');
const api = require('./api.js');
const users = require('./users.js');
const songs = require('./songs.js');

const commandDelayTimerArray = {};
class Chat {

	async callCommand(props) {
		// Select from user added commands
		const commandCalled = props.messageParams[0].toLowerCase();
		let propsForSelect = {
			table: 'commands',
			query: {channel: props.channel, trigger: commandCalled}
		};
		let results = await database.select(propsForSelect);
		if (results) {
			props.resultsToPass = results;
			return this.callUserAddedCommand(props);
		}
		// Select from default commands
		propsForSelect = {
			table: 'defaultCommands',
			query: {trigger: commandCalled}
		};
		results = await database.select(propsForSelect);
		if (results) {
			props.resultsToPass = results;
			return this.callDefaultCommand(props);
		}
	}

	async callDefaultCommand(props) {
		try {
			switch (props.resultsToPass[0].trigger) {
				case '!commands':
				case '!command':
					return await commands.call(props);
				case '!blacklist':
					return await blacklist.call(props);
				case '!regular':
				case '!regulars':
					return await regulars.call(props);
				case '!uptime':
					return await api.uptime(props);
				case '!followage':
					return await api.followage(props);
				case '!game':
					return await api.game(props);
				case '!title':
					return await api.title(props);
				case '!viewers':
					return await api.viewers(props);
				case '!winner':
					return await api.randomViewer(props);
				case '!bf4stats':
					return await api.bf4stats(props);
				case '!8ball':
					return await api.eightBall(props);
				case '!lastseen':
					return await users.lastSeen(props);
				case '!firstseen':
					return await users.firstSeen(props);
				case '!songlist':
				case '!songs':
				case '!sl':
					return await songs.songlist(props);
				case '!songcache':
				case '!cache':
					return await songs.songcache(props);
				case '!currentsong':
				case '!song':
				case '!cs':
					return await songs.currentSong(props);
				case '!lastsong':
				case '!previoussong':
					return await songs.lastSong(props);
				case '!volume':
					return await songs.callVolume(props);
				case '!play':
					return await songs.play(props);
				case '!pause':
					return await songs.pause(props);
				case '!skipsong':
					return await songs.skip(props);
				case '!wrongsong':
					return await songs.wrongSong(props);
				case '!removesong':
				case '!removesongs':
					return await songs.remove(props);
				case '!promote':
					return await songs.promote(props);
				case '!shuffle':
					return await songs.shuffle(props);
				case '!songrequest':
				case '!sr':
					return await songs.requestSongs(props);
				case '!playlistrequest':
				case '!pr':
					return await songs.requestPlaylist(props);
				case '!mute':
					return await messages.mute(props);
				case '!unmute':
					return await messages.unmute(props);
				default:
					throw new Error('missing a break; inside switch for callDefaultCommand!');
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
		try {
			const commandMessage = props.resultsToPass[0].chatmessage;
			if (commandMessage.includes('$(list)')) {
				// Get permissions level for adding commands, and use this to determine if a user can add a list item
				const propsForCommandPermissionLevel = {
					userstate: props.userstate,
					channel: props.channel,
					messageParams: ['!commands', 'add']
				};
				const addCommandPermissionLevel = await permissions.commandPermissionLevel(propsForCommandPermissionLevel);
				const currentUserPermissionLevel = await permissions.getUserPermissionLevel(propsForCommandPermissionLevel);
				const propsForListCommands = {
					channel: props.channel,
					messageParams: props.messageParams,
					results: props.resultsToPass,
					userstate: props.userstate
				};
				if (currentUserPermissionLevel >= addCommandPermissionLevel) {
					switch (props.messageParams[1]) {
						case 'add':
							return await lists.add(propsForListCommands);
						case 'edit':
							return await lists.edit(propsForListCommands);
						case 'delete':
						case 'remove':
							return await lists.remove(propsForListCommands);
						default:
							return await lists.getListCommandItem(propsForListCommands);
					}
				} else {
					throw new Error('Failed permission check for list commands');
				}
			} else {
				let messageToSend = commandMessage.replace('&apos;', '\'');
				messageToSend = props.messageParams[1] ?
					messageToSend.replace('$(touser)', props.messageParams[1]).replace('$(user)', props.messageParams[1]) :
					messageToSend.replace('$(touser)', props.userstate['display-name']).replace('$(user)', props.userstate['display-name']);
				return messageToSend;
			}
		} catch (err) {
			throw err;
		}
	}

	increaseCommandCounter(props) {
		const increasedCommandCounter = parseInt(props.resultsToPass[0].commandcounter, 10) + 1;
		const dataToUse = {};
		dataToUse.commandcounter = increasedCommandCounter;
		const propsForUpdate = {
			table: 'commands',
			query: {channel: props.channel, trigger: props.messageParams[0]},
			dataToUse
		};
		database.update(propsForUpdate);
		props.messageToSend = props.messageToSend.replace('$(counter)', increasedCommandCounter);
		return 'increased';
	}

	checkAndSetCommandDelayTimer(props) {
		const currentTime = new Date().getTime() / 1000;
		if (!commandDelayTimerArray[props.channel][props.messageParams[0]] || currentTime - commandDelayTimerArray[props.channel][props.messageParams[0]] >= 2) {
			commandDelayTimerArray[props.channel][props.messageParams[0]] = currentTime;
			return currentTime;
		}
		throw new Error('didn\'t meet time requirement, try again in a couple of seconds');
	}

	setDelayTimerForSingleChannel(props) {
		commandDelayTimerArray[props.channel] = commandDelayTimerArray[props.channel] ? '' : commandDelayTimerArray[props.channel] = {};
	}

	async setDelayTimerForMultipleChannels(channelArray) {
		for (const channel of channelArray) {
			commandDelayTimerArray[channel] = commandDelayTimerArray[channel] ? '' : commandDelayTimerArray[channel] = {};
		}
	}
}

module.exports = new Chat();
