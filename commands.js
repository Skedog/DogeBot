const database = require('./database.js');
const constants = require('./constants.js');
const permissions = require('./permissions.js');
const functions = require('./functions.js');
const socket = require('./socket.js');
const cache = require('./cache.js');

class Commands {

	async call(props) {
		switch (props.messageParams[1]) {
			case 'add':
				return this.add(props);
			case 'addalias':
				return this.addAlias(props);
			case 'edit':
				return this.edit(props);
			case 'delete':
			case 'remove':
				return this.delete(props);
			case 'permissions':
			case 'permission':
			case 'perms':
				return this.permission(props);
			case 'setcost':
			case 'cost':
			case 'points':
				return this.cost(props);
			default:
				return this.buildCommandLink(props);
		}
	}

	buildCommandLink(props) {
		const msgStr = 'The commands for this channel are available here: ';
		let msgURL;
		if (constants.testMode) {
			msgURL = constants.testPostURL + '/commands/' + props.channel.slice(1);
		} else {
			msgURL = constants.postURL + '/commands/' + props.channel.slice(1);
		}
		return functions.buildUserString(props) + msgStr + msgURL;
	}

	async add(props) {
		props.ignoreMessageParamsForUserString = true;
		const commandExistence = await this.doesUserAddedCommandExist(props);
		if (!commandExistence) {
			const dataToUse = {};
			dataToUse.trigger = props.messageParams[2].toLowerCase();
			dataToUse.chatmessage = props.messageParams.slice(3, props.messageParams.length).join(' ').replace('\'', '&apos;');
			// Commands cannot start with a period because Twitch
			// Treats those as internal commands, just remove it
			if (dataToUse.chatmessage.substring(0, 1) === '.') {
				dataToUse.chatmessage = dataToUse.chatmessage.slice(1);
			}
			dataToUse.commandcounter = 0;
			dataToUse.channel = props.channel;
			dataToUse.permissionsLevel = 0;
			dataToUse.isAlias = false;
			dataToUse.aliasFor = '';
			dataToUse.listArray = [];
			dataToUse.globalDelay = 0;
			dataToUse.userDelay = 0;
			dataToUse.pointCost = 0;
			if (dataToUse.chatmessage !== '') {
				const propsForAdd = {
					table: 'commands',
					dataToUse
				};
				await database.add(propsForAdd);
				await cache.del(props.channel + 'commands');
				socket.io.in(functions.stripHash(props.channel)).emit('commands', ['added']);
				return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' has been added!';
			}
			return functions.buildUserString(props) + 'The syntax to add a command is !commands add commandtoadd text';
		}
		return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' already exists!';
	}

	async addAlias(props) {
		props.ignoreMessageParamsForUserString = true;
		const commandExistence = await this.doesUserAddedCommandExist(props);
		if (!commandExistence) {
			if (props.messageParams[3]) {
				const dataToUse = {};
				dataToUse.trigger = props.messageParams[2].toLowerCase();
				dataToUse.chatmessage = 'Alias for ' + props.messageParams[3];
				dataToUse.commandcounter = 0;
				dataToUse.channel = props.channel;
				dataToUse.permissionsLevel = 0;
				dataToUse.isAlias = true;
				dataToUse.aliasFor = props.messageParams[3];
				dataToUse.listArray = [];
				dataToUse.globalDelay = 0;
				dataToUse.userDelay = 0;
				const propsForAdd = {
					table: 'commands',
					dataToUse
				};
				await database.add(propsForAdd);
				await cache.del(props.channel + 'commands');
				socket.io.in(functions.stripHash(props.channel)).emit('commands', ['added']);
				return functions.buildUserString(props) + 'The alias command ' + props.messageParams[2] + ' has been added!';
			}
			return functions.buildUserString(props) + 'The syntax to add an alias is !commands addalias newCommandName commandToAlias';
		}
		return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' already exists!';
	}

	async edit(props) {
		props.ignoreMessageParamsForUserString = true;
		const commandExistence = await this.doesUserAddedCommandExist(props);
		if (commandExistence) {
			const tempLength = props.messageParams.length;
			const messageToAdd = props.messageParams.slice(3, tempLength).join(' ').replace('\'', '&apos;');
			const dataToUse = {};
			dataToUse.chatmessage = messageToAdd;
			// Commands cannot start with a period because Twitch
			// Treats those as internal commands, just remove it
			if (dataToUse.chatmessage.substring(0, 1) === '.') {
				dataToUse.chatmessage = dataToUse.chatmessage.slice(1);
			}
			const propsForUpdate = {
				table: 'commands',
				query: {channel: props.channel, trigger: props.messageParams[2].toLowerCase()},
				dataToUse
			};
			await database.update(propsForUpdate);
			await cache.del(props.channel + 'commands');
			socket.io.in(functions.stripHash(props.channel)).emit('commands', ['updated']);
			return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' has been updated!';
		}
		return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' doesn\'t exist!';
	}

	async delete(props) {
		props.ignoreMessageParamsForUserString = true;
		const commandExistence = await this.doesUserAddedCommandExist(props);
		if (commandExistence) {
			const propsForDelete = {
				table: 'commands',
				query: {channel: props.channel, trigger: props.messageParams[2].toLowerCase()}
			};
			await database.delete(propsForDelete);
			await cache.del(props.channel + 'commands');
			socket.io.in(functions.stripHash(props.channel)).emit('commands', ['deleted']);
			return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' has been deleted!';
		}
		return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' doesn\'t exist!';
	}

	async permission(props) {
		props.permissionLevels = await this.getPermissionLevels();
		try {
			props.ignoreMessageParamsForUserString = true;
			let validPermLevel = false;
			for (const permissionLevel of props.permissionLevels) {
				if (permissionLevel.includes(props.messageParams[3])) {
					validPermLevel = true;
				}
			}
			if (!validPermLevel) {
				throw new Error('incorrect permission level');
			}
			const propsForSelect = {
				table: 'commands',
				query: {channel: props.channel, trigger: props.messageParams[2].toLowerCase()}
			};
			const results = await database.select(propsForSelect);
			if (results) {
				props.results = results;
				return this.setPermissionForUserAddedCommand(props);
			}
			return this.setPermissionsForDefaultCommand(props);
		} catch (err) {
			let listOfOptions = '';
			for (const permissionLevel of props.permissionLevels) {
				listOfOptions += permissionLevel[0] + ', ';
			}
			listOfOptions = listOfOptions.slice(0, -2);
			return functions.buildUserString(props) + 'Error setting permissions for ' + props.messageParams[2] + ' - the options are ' + listOfOptions + '!';
		}
	}

	async cost(props) {
		try {
			props.ignoreMessageParamsForUserString = true;
			const commandToEdit = props.messageParams[2].toLowerCase();
			const numberOfPointsToSet = props.messageParams[3];
			if (!isNaN(parseInt(numberOfPointsToSet, 10))) {
				const propsForSelect = {
					table: 'commands',
					query: {channel: props.channel, trigger: commandToEdit}
				};
				const results = await database.select(propsForSelect);
				if (results) {
					props.results = results;
					return this.setCostForUserAddedCommand(props);
				}
				return this.setCostForDefaultCommand(props);
			}
		} catch (err) {
			return functions.buildUserString(props) + 'Error setting cost for ' + props.messageParams[2] + ' - try again in a little bit!';
		}
	}

	async setCostForUserAddedCommand(props) {
		const dataToUse = {};
		dataToUse.pointCost = parseInt(props.messageParams[3], 10);
		const propsForUpdate = {
			table: 'commands',
			query: {channel: props.channel, trigger: props.messageParams[2].toLowerCase()},
			dataToUse
		};
		await database.update(propsForUpdate);
		await cache.del(props.channel + 'commands');
		socket.io.in(functions.stripHash(props.channel)).emit('commands', ['updated']);
		return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' cost has been updated to ' + props.messageParams[3] + '!';
	}

	async setCostForDefaultCommand(props) {
		const commandToEdit = props.messageParams[2].toLowerCase();
		// We need to exclude these commands from this to avoid situations where mods need to use these commands and can't due to a lack of points
		// these will awlays be set to 0
		if (commandToEdit !== '!commands' && commandToEdit !== '!volume' && commandToEdit !== '!title' && commandToEdit !== '!game') {
			// Select from default commands
			const propsForSelect = {
				table: 'defaultCommands',
				query: {trigger: commandToEdit}
			};
			props.results = await database.select(propsForSelect);
			if (props.results) {
				const aliasResults = await this.getAliasedDefaultCommand(props, props.results);
				const propsForUpdate = {
					table: 'defaultCommands',
					query: {trigger: aliasResults[0].trigger, pointsPerChannel: {$elemMatch: {channel: props.channel}}},
					dataToUse: {'pointsPerChannel.$.pointCost': parseInt(props.messageParams[3], 10)}
				};
				props.results = await database.update(propsForUpdate);
				return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' cost has been updated to ' + props.messageParams[3] + '!';
			}
		} else {
			return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' cannnot have it\'s cost changed. If you need to limit access, try setting the permissions instead!';
		}
	}

	async setPermissionForUserAddedCommand(props) {
		let permissionLevelToSet = '';
		for (const permissionLevel of props.permissionLevels) {
			if (permissionLevel.includes(props.messageParams[3])) {
				permissionLevelToSet = permissionLevel[1];
			}
		}
		const commandPermissionLevelNeeded = props.results[0].permissionsLevel;
		const userPermissionLevel = await permissions.getUserPermissionLevel(props);
		if (permissionLevelToSet <= userPermissionLevel && userPermissionLevel >= commandPermissionLevelNeeded) {
			const dataToUse = {};
			dataToUse.permissionsLevel = permissionLevelToSet;
			const propsForUpdate = {
				table: 'commands',
				query: {channel: props.channel, trigger: props.messageParams[2].toLowerCase()},
				dataToUse
			};
			await database.update(propsForUpdate);
			await cache.del(props.channel + 'commands');
			socket.io.in(functions.stripHash(props.channel)).emit('commands', ['updated']);
			return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' permissions have been updated!';
		}
	}

	async setPermissionsForDefaultCommand(props) {
		// Select from default commands
		const propsForSelect = {
			table: 'defaultCommands',
			query: {trigger: props.messageParams[2].toLowerCase()}
		};
		props.results = await database.select(propsForSelect);
		if (props.results) {
			const aliasResults = await this.getAliasedDefaultCommand(props, props.results);
			let permissionLevelToSet = '';
			for (const permissionLevel of props.permissionLevels) {
				if (permissionLevel.includes(props.messageParams[3])) {
					permissionLevelToSet = permissionLevel[1];
				}
			}
			const arrayOfPermissions = aliasResults[0].permissionsPerChannel;
			const userPermissionLevel = await permissions.getUserPermissionLevel(props);
			let commandPermissionLevelNeeded;
			for (let x = 0; x < arrayOfPermissions.length; x++) {
				if (aliasResults[0].permissionsPerChannel[x].channel === props.channel) {
					commandPermissionLevelNeeded = arrayOfPermissions[x].permissionLevel;
					break;
				}
			}
			if (permissionLevelToSet <= userPermissionLevel && userPermissionLevel >= commandPermissionLevelNeeded) {
				const propsForUpdate = {
					table: 'defaultCommands',
					query: {trigger: aliasResults[0].trigger, permissionsPerChannel: {$elemMatch: {channel: props.channel}}},
					dataToUse: {'permissionsPerChannel.$.permissionLevel': permissionLevelToSet}
				};
				props.results = await database.update(propsForUpdate);
				return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' permissions have been updated!';
			}
		}
	}

	async getAliasedDefaultCommand(props, results) {
		if (results[0].isAlias) {
			const propsForSelect = {
				table: 'defaultCommands',
				query: {trigger: results[0].aliasFor}
			};
			const newResults = await database.select(propsForSelect);
			return this.getAliasedDefaultCommand(props, newResults);
		}
		return results;
	}

	async getPermissionLevels() {
		const propsForSelect = {
			table: 'permissions',
			sortBy: {permissionLevel: 1}
		};
		const permissionLevels = await database.select(propsForSelect);
		const permissionLevelsToReturn = [];
		if (permissionLevels) {
			for (const level of permissionLevels) {
				permissionLevelsToReturn.push([level.permissionName, level.permissionLevel]);
			}
		}
		return permissionLevelsToReturn;
	}

	async doesUserAddedCommandExist(props) {
		if (props.messageParams[2]) {
			const propsForSelect = {
				table: 'commands',
				query: {channel: props.channel, trigger: props.messageParams[2].toLowerCase()}
			};
			const res = await database.select(propsForSelect);
			if (res) {
				return true;
			}
		}
		return false;
	}
}

module.exports = new Commands();
