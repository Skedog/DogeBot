const database = require('./database.js');
const functions = require('./functions.js');
const regulars = require('./regulars.js');
const superMods = require('./super-mods.js');
const djs = require('./djs.js');

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
			// If adding/modifying a command
			if ((sentCommand === '!commands' && (modifier === 'add' || modifier === 'edit' || modifier === 'delete' || modifier === 'remove' || modifier === 'permissions' || modifier === 'permission' || modifier === 'perms' || modifier === 'addalias' || modifier === 'setcost' || modifier === 'cost' || modifier === 'points' || modifier === 'enable' || modifier === 'disable')) || (sentCommand === '!addcom') || (sentCommand === '!editcom') || (sentCommand === '!deletecom') || (sentCommand === '!delcom') || (sentCommand === '!addalias') || (sentCommand === '!enablecom') || (sentCommand === '!disablecom')) {
				return this.getModerationPermissionLevelForCommand(props, results[0].permissionsPerChannel);
			}
			// If modifying volume
			if (sentCommand === '!volume' && functions.isNumber(modifier)) {
				return this.getModerationPermissionLevelForCommand(props, results[0].permissionsPerChannel);
			}
			// If modifying game
			if (sentCommand === '!game' && modifier !== undefined) {
				return this.getModerationPermissionLevelForCommand(props, results[0].permissionsPerChannel);
			}
			// If modifying title
			if (sentCommand === '!title' && modifier !== undefined) {
				return this.getModerationPermissionLevelForCommand(props, results[0].permissionsPerChannel);
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

	async getModerationPermissionLevelForCommand(props, permsPerChannel) {
		for (const channelPermission of permsPerChannel) {
			if (channelPermission.channel === props.channel) {
				return channelPermission.moderationPermissionLevel;
			}
		}
	}

	async canUserCallCommand(props) {
		const propsForUser = {
			userstate: props.userstate,
			channel: props.channel
		};
		const isRegular = await regulars.checkIfUserIsRegular(propsForUser);
		const isSuperMod = await superMods.checkIfUserIsSuperMod(propsForUser);
		const isDJ = await djs.checkIfUserIsDJ(propsForUser);
		switch (props.permissionLevelNeeded.toString()) {
			case '0':
				return true;
			case '100':
				if (isRegular || (props.userstate.mod || props.userstate.subscriber || '#' + props.userstate.username === props.channel)) {
					return true;
				}
				break;
			case '200':
				if (props.userstate.mod || props.userstate.subscriber || '#' + props.userstate.username === props.channel) {
					return true;
				}
				break;
			case '201':
				if (props.userstate.mod || isDJ || '#' + props.userstate.username === props.channel) {
					return true;
				}
				break;
			case '300':
				if (props.userstate.mod || '#' + props.userstate.username === props.channel) {
					return true;
				}
				break;
			case '301':
				if (isSuperMod || '#' + props.userstate.username === props.channel) {
					return true;
				}
				break;
			case '400':
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
				return 400;
			} else if (props.userstate.mod) {
				return 300;
			} else if (props.userstate.subscriber) {
				return 200;
			}
			const isRegular = await regulars.checkIfUserIsRegular(props);
			if (isRegular) {
				return 100;
			}
			return 0;
		} catch (err) {
			throw err;
		}
	}
}

module.exports = new Permissions();
