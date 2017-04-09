var runSQL = require('./runSQL.js');
var regulars = require('./regulars-functions.js');
var functions = require('./general-functions.js');

var getCommandPermissionLevel = function(db,sentCommand,messageParams,channel) {
	return new Promise((resolve, reject) => {
		var query = {trigger:sentCommand};
		runSQL('select','defaultCommands',query,'',db).then(results => {
			if (results) {
				if (results[0].isAlias) { //command passed in was an alias - recursively callback with aliased command
					resolve(getCommandPermissionLevel(db,results[0].aliasFor,messageParams,channel));
				} else {
					for (var x = results[0].permissionsPerChannel.length - 1; x >= 0; x--) {
						if (results[0].permissionsPerChannel[x].channel == channel) {
							var commandPermissionLevel = results[0].permissionsPerChannel[x].permissionLevel;
							if (sentCommand == '!commands') {
								if (messageParams[1] != 'add' && messageParams[1] != 'edit' && messageParams[1] != 'delete' && messageParams[1] != 'remove' && messageParams[1] != 'permissions' && messageParams[1] != 'permission' && messageParams[1] != 'perms') {
									resolve(0);
								} else {
									resolve(commandPermissionLevel);
								}
							} else if(sentCommand == '!volume' && !functions.isNumber(messageParams[1])) {
								resolve(0);
							} else {
								resolve(commandPermissionLevel);
							}
						}
					}
				}
			} else {
				//not a default command, check to see if it was user added
				var query = {trigger:sentCommand,channel:channel};
				runSQL('select','commands',query,'',db).then(results => {
					if (results) {
						if (results[0].isAlias) { //command passed in was an alias - recursively callback with aliased command
							resolve(getCommandPermissionLevel(db,results[0].aliasFor,messageParams,channel));
						} else {
							resolve(results[0].permissionsLevel);
						}
					} else {
						reject('Command doesn\'t exist!');
					}
				});
			}
		}).catch(err => {
			reject(err)
		});
	})
}

var getUserPermissionLevel = function(db,channel,userstate) {
	return new Promise((resolve, reject) => {
		if ('#' + userstate['username'] == channel) {
			resolve(4);
		} else if (userstate.mod) {
			resolve(3);
		} else if (userstate.subscriber) {
			resolve(2);
		} else {
			regulars.checkIfUserIsRegular(db,userstate,channel).then(isReg => {
				if (isReg) {
					resolve(1);
				} else {
					resolve(0);
				}
			});
		}
	});
}

var canUserCallCommand = function(db,user,levelNeeded,channel) {
	return new Promise((resolve, reject) => {
		switch(levelNeeded.toString()){
			case "0":
				resolve(true);
				break;
			case "1":
				regulars.checkIfUserIsRegular(db,user,channel).then(isRegular => {
					if (isRegular || (user.mod || user.subscriber || '#' + user['username'] == channel)) {
						resolve(true);
					}
				});
				break;
			case "2":
				if (user.mod || user.subscriber || '#' + user['username'] == channel) {
					resolve(true);
				}
				break;
			case "3":
				if (user.mod || '#' + user['username'] == channel) {
					resolve(true);
				}
				break;
			case "4":
				if ('#' + user['username'] == channel) {
					resolve(true);
				} else {
					reject('Permission check failed');
				}
				break;
			default:
				reject('Permission check failed');
				break;
		}
	})
}

module.exports = {
	getCommandPermissionLevel: getCommandPermissionLevel,
	getUserPermissionLevel: getUserPermissionLevel,
	canUserCallCommand: canUserCallCommand
};