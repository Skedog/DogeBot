const database = require('./database.js');
const constants = require('./constants.js');
const permissions = require('./permissions.js');
const functions = require('./functions.js');
const socket = require('./socket.js');

class commands {

	async call(props) {
		switch(props.messageParams[1]) {
			case 'add':
				return await this.add(props);
				break;
			case 'edit':
				return await this.edit(props);
				break;
			case 'delete':
			case 'remove':
				return await this.delete(props);
				break;
			case 'permissions':
			case 'permission':
			case 'perms':
				return await this.permission(props);
				break;
			default:
				const msgStr = 'The commands for this channel are available here: ';
				let msgURL;
				if (constants.testMode) {
					msgURL = constants.testPostURL + '/commands/' + props.channel.slice(1);
				} else {
					msgURL = constants.postURL + '/commands/' + props.channel.slice(1);
				}
				return functions.buildUserString(props) + msgStr + msgURL;
				break;
		}
	}

	async add(props) {
		props.ignoreMessageParamsForUserString = true;
		const commandExistence = await this.doesUserAddedCommandExist(props);
		if (!commandExistence) {
			let dataToUse = {};
			dataToUse["trigger"] = props.messageParams[2].toLowerCase();
			dataToUse["chatmessage"] = props.messageParams.slice(3,props.messageParams.length).join(' ').replace("'","&apos;");;
			dataToUse["commandcounter"] = 0;
			dataToUse["channel"] = props.channel;
			dataToUse["permissionsLevel"] = 0;
			dataToUse["isAlias"] = false;
			dataToUse["aliasFor"] = '';
			dataToUse["listArray"] = [];
			const propsForAdd = {
				table: 'commands',
				dataToUse: dataToUse
			}
			await database.add(propsForAdd);
			socket.emit('commands',['added']);
			return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' has been added!';
		} else {
			return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' already exists!';
		}
	}

	async edit(props) {
		props.ignoreMessageParamsForUserString = true;
		const commandExistence = await this.doesUserAddedCommandExist(props);
		if (commandExistence) {
			const tempLength = props.messageParams.length;
			const messageToAdd = props.messageParams.slice(3,tempLength).join(' ').replace("'","&apos;");
			let dataToUse = {};
			dataToUse["chatmessage"] = messageToAdd;
			const propsForUpdate = {
				table:'commands',
				query: {channel:props.channel,trigger:props.messageParams[2]},
				dataToUse: dataToUse
			}
			await database.update(propsForUpdate);
			socket.emit('commands',['updated']);
			return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' has been updated!';
		} else {
			return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' doesn\'t exist!';
		}
	}

	async delete(props) {
		props.ignoreMessageParamsForUserString = true;
		const commandExistence = await this.doesUserAddedCommandExist(props);
		if (commandExistence) {
			const propsForDelete = {
				table:'commands',
				query:{channel:props.channel,trigger:props.messageParams[2]}
			}
			await database.delete(propsForDelete);
			socket.emit('commands',['deleted']);
			return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' has been deleted!';
		} else {
			return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' doesn\'t exist!';
		}
	}

	async permission(props) {
		props.ignoreMessageParamsForUserString = true;
		const propsForSelect = {
			table: 'commands',
			query: {channel:props.channel,trigger:props.messageParams[2]}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			const permissionLevelToSet = props.messageParams[3];
			const commandPermissionlevelNeeded = results[0].permissionsLevel;
			const userPermissionLevel = await permissions.getUserPermissionLevel(props);
			if (permissionLevelToSet <= userPermissionLevel && userPermissionLevel >= commandPermissionlevelNeeded) {
				if (functions.isNumber(permissionLevelToSet)) {
					let dataToUse = {};
					dataToUse["permissionsLevel"] = permissionLevelToSet;
					const propsForUpdate = {
						table: 'commands',
						query: {channel:props.channel,trigger:props.messageParams[2]},
						dataToUse: dataToUse
					}
					await database.update(propsForUpdate);
					socket.emit('commands',['updated']);
					return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' permissions have been updated!';
				}
			}
		} else {
			return functions.buildUserString(props) + 'The command ' + props.messageParams[2] + ' doesn\'t exist!';
		}
	}

	async doesUserAddedCommandExist(props) {
		let propsForSelect = {
			table: 'commands',
			query: {channel:props.channel,trigger:props.messageParams[2]}
		}
		let res = await database.select(propsForSelect);
		if (res) {
			return true;
		} else {
			return false;
		}
	}
}

module.exports = new commands();