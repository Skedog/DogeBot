var log = require('npmlog');
var runSQL = require('./runSQL.js');
var functions = require('./general-functions.js');
var commands = require('./commands.js');
var users = require('./users.js');
var list = require('./list-commands.js');
var regulars = require('./regulars-functions.js');
var api = require('./api-functions.js');
var messageHandler = require('./chat-messages.js');
var songs = require('./songs.js');
var permissions = require('./permissions.js');
const constants = require('./constants.js');
const commandDelayTimerArray = {};

var checkAndSetCommandDelayTimer = function(channel, command, seconds) {
	return new Promise((resolve, reject) => {
		var currentTime = new Date().getTime() / 1000;
		if (!commandDelayTimerArray[channel][command] || currentTime - commandDelayTimerArray[channel][command] >= seconds) {
			commandDelayTimerArray[channel][command] = currentTime;
			resolve(currentTime);
		} else {
			reject('didn\'t meet time requirement, try again in a couple of seconds')
		}
	})
}

var setDelayTimerPerChannel = function(channel) {
	return new Promise((resolve, reject) => {
		resolve(commandDelayTimerArray[channel] ? '' : commandDelayTimerArray[channel] = {});
	})
}

var callCommand = function(db,twitchClient,channel,userstate,message,sentCommand) {
	return new Promise((resolve, reject) => {
		var query = {channel:channel,trigger:sentCommand};
		var dataToUse = {};
		runSQL('select','commands',query,'',db).then(results => {
			if (results) {
				if (results[0].isAlias) {
					resolve(callCommand(db,twitchClient,channel,userstate,message,results[0].aliasFor));
				} else {
					callUserAddedCommand(db,twitchClient,channel,userstate,message,results).then(res => {
						resolve(res);
					}).catch(err => {
						reject(err);
					});
				}
			} else {
				var query = {trigger:sentCommand};
				runSQL('select','defaultCommands',query,'',db).then(results => {
					if (results) {
						if (results[0].isAlias) {
							resolve(callCommand(db,twitchClient,channel,userstate,message,results[0].aliasFor));
						} else {
							callDefaultCommand(db,twitchClient,channel,userstate,message,results).then(res => {
								resolve(res);
							}).catch(err => {
								reject(err);
							});
						}
					}
				}).catch(err => {
					reject(err)
				});
			}
		}).catch(err => {
			reject(err)
		});
	})
}

var callUserAddedCommand = function(db,twitchClient,channel,userstate,message,results) {
	return new Promise((resolve, reject) => {
		buildUserAddedCommandMessage(db,twitchClient,channel,userstate,message,results).then(res => {
			increaseCommandCounter(db,message,channel,results[0].commandcounter,res).then(res => {
				messageHandler.sendMessage(twitchClient,channel,res,false,'');
				resolve(res);
			}).catch(err => {
				reject('failed to increase counter');
			});
		}).catch(err => {
			reject('failed to build command message');
		});
	})
}

var callDefaultCommand = function(db,twitchClient,channel,userstate,message,results) {
	return new Promise((resolve, reject) => {
		var messageParams = message.split(' ');
		switch(messageParams[0].toLowerCase()) {
			case '!commands':
			case '!command':
				callCommandsCommand(db,twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err)
				});
				break;
			case '!regular':
			case '!regulars':
				if (messageParams[1] == 'add') {
					regulars.add(db,twitchClient,channel,userstate,messageParams).then(res => {
						resolve(res);
					}).catch(err => {
						reject(err);
					});
				} else if (messageParams[1] == 'remove' || messageParams[1] == 'delete') {
					regulars.remove(db,twitchClient,channel,userstate,messageParams).then(res => {
						resolve(res);
					}).catch(err => {
						reject(err);
					});
				} else {
					resolve();
				}
				break;
			case '!uptime':
				api.uptime(twitchClient,channel,userstate).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!followage':
				api.followage(twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!game':
				api.game(twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!viewers':
				api.viewerCount(twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!winner':
				api.randomViewer(twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!qotd':
				api.quoteOfTheDay(twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!bf4stats':
				api.bf4stats(twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!8ball':
				api.eightBall(twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!lastseen':
				users.lastSeen(db,twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!firstseen':
				users.firstSeen(db,twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!songlist':
			case '!songs':
			case '!sl':
				songs.songlist(twitchClient,channel,userstate).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!songcache':
			case '!cache':
				songs.songcache(twitchClient,channel,userstate).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!currentsong':
			case '!song':
			case '!cs':
				songs.currentSong(db,twitchClient,channel,userstate).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!volume':
				if (functions.isNumber(messageParams[1])) {
					songs.updateVolume(db,twitchClient,channel,userstate,messageParams).then(res => {
						resolve(res);
					}).catch(err => {
						reject(err);
					});
				} else {
					songs.volume(db,twitchClient,channel,userstate,messageParams).then(res => {
						resolve(res);
					}).catch(err => {
						reject(err);
					});
				}
				break;
			case '!play':
				songs.play(db,twitchClient,channel,userstate).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!pause':
				songs.pause(db,twitchClient,channel,userstate).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!skipsong':
				songs.skip(db,twitchClient,channel,userstate).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!wrongsong':
				songs.wrongSong(db,twitchClient,channel,userstate).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!removesong':
			case '!removesongs':
				songs.remove(db,twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!promote':
				songs.promote(db,twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!shuffle':
				songs.shuffle(db,twitchClient,channel,userstate).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!songrequest':
			case '!sr':
				songs.requestSongs(db,twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!playlistrequest':
			case '!pr':
				songs.requestPlaylist(db,twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!mute':
				messageHandler.muteMessages(twitchClient,channel,false,'').then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case '!unmute':
				messageHandler.unmuteMessages(twitchClient,channel,false,'').then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			default:
				log.error('missing a break; inside switch for callDefaultCommand!');
				break;
		}
	})
}

var buildUserAddedCommandMessage = function(db,twitchClient,channel,userstate,message,results) {
	return new Promise((resolve, reject) => {
		var messageParams = message.split(' '), arrayOfMessages = results[0].listArray, commandMessage = results[0].chatmessage;
		if (commandMessage.includes('$(list)')) {
			permissions.getCommandPermissionLevel(db,'!commands',['!commands','add'],channel).then(addCommandPermissionLevel => {
				permissions.getUserPermissionLevel(db,channel,userstate).then(currentUserPermissionLevel => {
					switch(messageParams[1]) {
						case 'add':
							if (currentUserPermissionLevel >= addCommandPermissionLevel) {
								list.add(db,twitchClient,channel,userstate,messageParams,results).then(res => {
									resolve(res);
								}).catch(err => {
									reject(err);
								});
							} else {
								reject();
							};
							break;
						case 'edit':
							if (currentUserPermissionLevel >= addCommandPermissionLevel) {
								list.edit(db,twitchClient,channel,userstate,messageParams,results).then(res => {
									resolve(res);
								}).catch(err => {
									reject(err);
								});
							} else {
								reject();
							};
							break;
						case 'delete':
						case 'remove':
							if (currentUserPermissionLevel >= addCommandPermissionLevel) {
								list.remove(db,twitchClient,channel,userstate,messageParams,results).then(res => {
									resolve(res);
								}).catch(err => {
									reject(err);
								});
							} else {
								reject();
							};
							break;
						default:
							list.getListCommandItem(db,twitchClient,channel,userstate,messageParams,results).then(res => {
								resolve(res);
							}).catch(err => {
								reject(err);
							});
							break;
					};
				});
			});
		} else {
			var messageToSend = commandMessage.replace('&apos;',"'");
			messageToSend = messageParams[1] ?
				messageToSend.replace('$(touser)',messageParams[1]).replace('$(user)',messageParams[1]) :
				messageToSend.replace('$(touser)',userstate['display-name']).replace('$(user)',userstate['display-name'])
			resolve(messageToSend);
		}
	})
}

var increaseCommandCounter = function(db,message,channel,currentCount,messageToChange) {
	return new Promise((resolve, reject) => {
		var messageParams = message.split(' ');
		var increasedCommandCounter = parseInt(currentCount,10) + 1;
		var query = {channel:channel,trigger:messageParams[0]};
		var dataToUse = {};
		dataToUse["commandcounter"] = increasedCommandCounter;
		runSQL('update','commands',query,dataToUse,db).then(res => {
			resolve(messageToChange.replace('$(counter)',increasedCommandCounter))
		}).catch(err => {
			reject(err)
		});
	})
}

var callCommandsCommand = function(db,twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		switch(messageParams[1]) {
			case 'add':
				commands.add(db,twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case 'edit':
				commands.edit(db,twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case 'delete':
			case 'remove':
				commands.remove(db,twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			case 'permissions':
			case 'permission':
			case 'perms':
				commands.permission(db,twitchClient,channel,userstate,messageParams).then(res => {
					resolve(res);
				}).catch(err => {
					reject(err);
				});
				break;
			default:
				var toUser = messageParams[1] ? messageParams[1] + ' -> ' : userstate['display-name'] + ' -> '
				var msgChannel = channel.slice(1);
				var msgStr = 'The commands for this channel are available here: ';
				if (constants.testMode) {
					var msgURL = constants.testPostURL + '/commands/' + msgChannel;
					messageHandler.sendMessage(twitchClient,channel,toUser + msgStr + msgURL,false,'');
				} else {
					var msgURL = constants.postURL + '/commands/' + msgChannel;
					messageHandler.sendMessage(twitchClient,channel,toUser + msgStr + msgURL,false,'');
				}
				resolve(msgStr + msgURL);
				break;
		}
	})
}

module.exports = {
	checkAndSetCommandDelayTimer: checkAndSetCommandDelayTimer,
	setDelayTimerPerChannel: setDelayTimerPerChannel,
	buildUserAddedCommandMessage: buildUserAddedCommandMessage,
	increaseCommandCounter: increaseCommandCounter,
	callCommandsCommand: callCommandsCommand,
	callDefaultCommand: callDefaultCommand,
	callUserAddedCommand: callUserAddedCommand,
	callCommand: callCommand
};