const log = require('npmlog');
const database = require('./database.js');
const permissions = require('./permissions.js');
const lists = require('./lists.js');
const messages = require('./chat-messages.js');
const commands = require('./commands.js');
const blacklist = require('./blacklist.js');
const regulars = require('./regulars.js');
const superMods = require('./super-mods.js');
const djs = require('./djs.js');
const giveaway = require('./giveaway.js');
const points = require('./points.js');
const api = require('./api.js');
const users = require('./users.js');
const songs = require('./songs.js');
const maintenance = require('./maintenance.js');
const socket = require('./socket.js');

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

	async callWhisperCommand(props) {
		switch (props.messageParams[0]) {
			case '!clearsongcache':
				if (props.messageParams[1]) {
					const propsForSongCache = {
						channel: '#' + props.messageParams[1]
					};
					try {
						await maintenance.clearSongCache(propsForSongCache);
						log.info('Song cache cleared for ' + props.messageParams[1] + ' via whisper');
						props.twitchClient.whisper(props.from, 'Song cache cleared for ' + props.messageParams[1]);
					} catch (err) {
						log.error(err);
						props.twitchClient.whisper(props.from, 'Error clearing song cache for ' + props.messageParams[1]);
					}
				}
				break;
			case '!deletechannel':
				if (props.messageParams[1]) {
					const propsFordeleteChannel = {
						channel: '#' + props.messageParams[1]
					};
					try {
						await maintenance.deleteChannel(propsFordeleteChannel);
						log.info('Deleted channel: ' + props.messageParams[1]);
						props.twitchClient.whisper(props.from, 'Deleted channel: ' + props.messageParams[1]);
					} catch (err) {
						log.error(err);
						props.twitchClient.whisper(props.from, 'Error deleting channel ' + props.messageParams[1] + ': ' + err);
					}
				}
				break;
			case 'getids': {
				const propsForIDupdate = {
					twitchClient: props.twitchClient
				};
				try {
					await maintenance.getAndUpdateTwitchUserIDsForAllUsers(propsForIDupdate);
					log.info('Got and reset all channel twitchIDs');
					props.twitchClient.whisper(props.from, 'Got and reset all channel twitchIDs');
				} catch (err) {
					log.error(err);
					props.twitchClient.whisper(props.from, 'Error getting channel twitchIDs: ' + err);
				}
				break;
			}
			case '!mute':
				if (props.messageParams[1]) {
					const propsForMute = {
						channel: '#' + props.messageParams[1],
						twitchClient: props.twitchClient,
						userstate: props.userstate
					};
					propsForMute.messageToSend = await messages.mute(propsForMute);
					messages.send(propsForMute);
				}
				break;
			case '!unmute':
				if (props.messageParams[1]) {
					const propsForUnmute = {
						channel: '#' + props.messageParams[1],
						twitchClient: props.twitchClient,
						userstate: props.userstate
					};
					propsForUnmute.messageToSend = await messages.unmute(propsForUnmute);
					messages.send(propsForUnmute);
				}
				break;
			case '!notify':
				if (props.messageParams[1]) {
					const dataToUse = {};
					dataToUse.message = props.messageParams.slice(1, props.messageParams.length).join(' ');
					dataToUse.exclusionList = [];
					dataToUse.dateSent = new Date();
					const propsForAdd = {
						table: 'notifications',
						dataToUse
					};
					const propsForSelect = {
						table: 'notifications',
						query: {message: dataToUse.message}
					};
					await database.add(propsForAdd);
					const results = await database.select(propsForSelect);
					socket.emit('notification', [dataToUse.message, results[0]._id]);
					props.twitchClient.whisper(props.from, 'Notification sent!');
				}
				break;
			case '!startmonitor':
				if (props.messageParams[1]) {
					const propsForSelect = {
						table: 'channels',
						query: {ChannelName: '#' + props.messageParams[1]}
					};
					const results = await database.select(propsForSelect);
					if (results) {
						// Channel exists, turn monitoring on
						const dataToUse = {};
						dataToUse.monitorOnly = true;
						const propsForUpdate = {
							table: 'channels',
							query: {ChannelName: '#' + props.messageParams[1]},
							dataToUse
						};
						database.update(propsForUpdate);
						props.twitchClient.whisper(props.from, 'Monitoring enabled. This channel has been logged into before, and has a full account, keep in mind this means the bot will NOT function in their channel. Use !stopmonitor ' + props.messageParams[1] + ' to turn this off.');
					} else {
						// Channel doesn't exist, create it and set monitorOnly = true
						props.twitchClient.join('#' + props.messageParams[1]);
						const dataToUse = {};
						dataToUse.ChannelName = '#' + props.messageParams[1];
						dataToUse.inChannel = true;
						dataToUse.isSilent = true;
						dataToUse.monitorOnly = true;
						dataToUse.timedMessages = [];
						const propsForAdd = {
							table: 'channels',
							dataToUse
						};
						await database.add(propsForAdd);
						props.twitchClient.whisper(props.from, 'Now monitoring #' + props.messageParams[1]);
					}
				}
				break;
			case '!stopmonitor':
				if (props.messageParams[1]) {
					const propsForSelect = {
						table: 'channels',
						query: {ChannelName: '#' + props.messageParams[1]}
					};
					const results = await database.select(propsForSelect);
					if (results) {
						// Channel exists, turn monitoring off
						const dataToUse = {};
						dataToUse.monitorOnly = false;
						const propsForUpdate = {
							table: 'channels',
							query: {ChannelName: '#' + props.messageParams[1]},
							dataToUse
						};
						database.update(propsForUpdate);
						props.twitchClient.whisper(props.from, 'Monitoring disabled for #' + props.messageParams[1]);
					} else {
						props.twitchClient.whisper(props.from, 'Channel ' + props.messageParams[1] + ' was not found!');
					}
				}
				break;
			default:
				log.error('Whisper command not found!');
				props.twitchClient.whisper(props.from, 'Whisper command not found!');
		}
	}

	async callDefaultCommand(props) {
		try {
			switch (props.resultsToPass[0].trigger) {
				case '!commands':
				case '!command':
					return await commands.call(props);
				case '!addcom':
					return await commands.addcom(props);
				case '!editcom':
					return await commands.editcom(props);
				case '!deletecom':
				case '!delcom':
					return await commands.deletecom(props);
				case '!addalias':
					return await commands.addalias(props);
				case '!enablecom':
					return await commands.enablecom(props);
				case '!disablecom':
					return await commands.disablecom(props);
				case '!blacklist':
					return await blacklist.call(props);
				case '!regular':
				case '!regulars':
					return await regulars.call(props);
				case '!supermod':
				case '!supermods':
					return await superMods.call(props);
				case '!dj':
				case '!djs':
					return await djs.call(props);
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
				case '!shoutout':
					return await api.shoutout(props);
				case '!songrequest':
				case '!sr':
					return await songs.requestSongs(props);
				case '!srp':
					return await songs.requestSongAndPromote(props);
				case '!srr':
					return await songs.requestRelatedSongs(props);
				case '!nocache':
				case '!skipcache':
					return await songs.requestSongWithNoCache(props);
				case '!playlistrequest':
				case '!pr':
					return await songs.requestPlaylist(props);
				case '!mute':
					return await messages.mute(props);
				case '!unmute':
					return await messages.unmute(props);
				case '!giveaway':
					return await giveaway.call(props);
				case '!enter':
					return await giveaway.call(props);
				case '!points':
					return await points.call(props);
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
				const modifier = props.messageParams[1];
				if ((modifier === 'add' || modifier === 'edit' || modifier === 'delete' || modifier === 'remove') && currentUserPermissionLevel >= addCommandPermissionLevel) {
					switch (modifier) {
						case 'add':
							return await lists.add(propsForListCommands);
						case 'edit':
							return await lists.edit(propsForListCommands);
						case 'delete':
						case 'remove':
							return await lists.remove(propsForListCommands);
						default:
							throw new Error('Failed permission check for list commands');
					}
				} else {
					// Not trying to add, edit, or delete a list item, fallback to showing a list item
					return await lists.getListCommandItem(propsForListCommands);
				}
			} else if (commandMessage.includes('$(bfserver')) {
				return api.bfServer(props);
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

	async isChannelMonitorOnly(props) {
		const propsForSelect = {
			table: 'channels',
			query: {ChannelName: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			if (results[0].monitorOnly) {
				throw new Error('channel is in monitor only mode, do not call any commands');
			}
		}
	}

	async isCommandEnabled(props) {
		const channelToCheck = props.channel;
		const propsForSelect = {
			table: 'defaultCommands',
			query: {trigger: props.messageParams[0]}
		};
		const results = await database.select(propsForSelect);
		let isEnabled = false;
		if (results) {
			const arrayOfPermissions = results[0].permissionsPerChannel;
			for (let x = 0; x < arrayOfPermissions.length; x++) {
				if (arrayOfPermissions[x].channel === channelToCheck) {
					isEnabled = arrayOfPermissions[x].isEnabled;
					break;
				}
			}
		} else {
			// Command not found in defaultCommands, check userAdded commands next
			const propsForUserSelect = {
				table: 'commands',
				query: {trigger: props.messageParams[0], channel: channelToCheck, isEnabled: true}
			};
			const userResults = await database.select(propsForUserSelect);
			if (userResults) {
				isEnabled = true;
			}
		}
		if (!isEnabled) {
			throw new Error('Command not enabled');
		}
	}

	checkAndSetCommandDelayTimer(props) {
		const currentTime = new Date().getTime() / 1000;
		// Setting this to 0 basically disables all of this code, but leaving it for now
		// I am doing this to fix the !enter command for giveaways being delayed
		// This can cause problems if multiple mods try to do some action, such as !skipsong
		// multiple songs will be skipped
		if (!commandDelayTimerArray[props.channel][props.messageParams[0]] || currentTime - commandDelayTimerArray[props.channel][props.messageParams[0]] >= 0) {
			commandDelayTimerArray[props.channel][props.messageParams[0]] = currentTime;
			return currentTime;
		}
		throw new Error('didn\'t meet time requirement, try again in a couple of seconds');
	}

	async setDelayTimerForArrayOfChannels(channelArray) {
		for (const channel of channelArray) {
			commandDelayTimerArray[channel] = {};
		}
	}
}

module.exports = new Chat();
