const database = require('./database.js');
const functions = require('./functions.js');
const regulars = require('./regulars.js');

class Permissions {

	async commandPermissionLevel(props) {
		const sentCommand = props.messageParams[0].toLowerCase();
		let propsForSelect;
		let results;
		propsForSelect = {
			table: 'defaultCommands',
			query: {trigger: sentCommand}
		};
		results = await database.select(propsForSelect);
		if (results) {
			if (results[0].isAlias) { // Command passed in was an alias - recursively callback with aliased command
				props.messageParams[0] = results[0].aliasFor;
				const propsForAlias = {
					channel: props.channel,
					messageParams: props.messageParams
				};
				return this.commandPermissionLevel(propsForAlias);
			}
			const modifier = props.messageParams[1];
			if (sentCommand === '!commands' && modifier !== 'add' && modifier !== 'edit' && modifier !== 'delete' && modifier !== 'remove' && modifier !== 'permissions' && modifier !== 'permission' && modifier !== 'perms') {
				return 0;
			}
			if (sentCommand === '!volume' && !functions.isNumber(modifier)) {
				return 0;
			}
			if (sentCommand === '!game' && modifier === undefined) {
				return 0;
			}
			if (sentCommand === '!title' && modifier === undefined) {
				return 0;
			}
			for (const channelPermission of results[0].permissionsPerChannel) {
				if (channelPermission.channel === props.channel) {
					return channelPermission.permissionLevel;
				}
			}
		} else {
			// Not a default command, check to see if it was user added
			propsForSelect = {
				table: 'commands',
				query: {trigger: sentCommand, channel: props.channel}
			};
			results = await database.select(propsForSelect);
			if (results) {
				if (results[0].isAlias) { // Command passed in was an alias - recursively callback with aliased command
					props.messageParams[0] = results[0].aliasFor;
					const propsForAlias = {
						channel: props.channel,
						messageParams: props.messageParams
					};
					return this.commandPermissionLevel(propsForAlias);
				}
				return results[0].permissionsLevel;
			}
			throw new Error('Command doesn\'t exist!');
		}
	}

	async canUserCallCommand(props) {
		const propsForRegular = {
			userstate: props.userstate,
			channel: props.channel
		};
		const isRegular = await regulars.checkIfUserIsRegular(propsForRegular);
		switch (props.permissionLevelNeeded.toString()) {
			case '0':
				return true;
			case '1':
				if (isRegular || (props.userstate.mod || props.userstate.subscriber || '#' + props.userstate.username === props.channel)) {
					return true;
				}
				break;
			case '2':
				if (props.userstate.mod || props.userstate.subscriber || '#' + props.userstate.username === props.channel) {
					return true;
				}
				break;
			case '3':
				if (props.userstate.mod || '#' + props.userstate.username === props.channel) {
					return true;
				}
				break;
			case '4':
				if ('#' + props.userstate.username === props.channel) {
					return true;
				}
				break;
			default:
				throw new Error('Permission check failed');
		}
		throw new Error('Permission check failed');
	}

	async getUserPermissionLevel(props) {
		try {
			if ('#' + props.userstate.username === props.channel) {
				return 4;
			} else if (props.userstate.mod) {
				return 3;
			} else if (props.userstate.subscriber) {
				return 2;
			}
			const isRegular = await regulars.checkIfUserIsRegular(props);
			if (isRegular) {
				return 1;
			}
			return 0;
		} catch (err) {
			throw err;
		}
	}
}

module.exports = new Permissions();
