const database = require('./database.js');
const functions = require('./functions.js');
const regulars = require('./regulars.js');

class permissions {

	async CommandPermissionLevel(props) {
		const sentCommand = props.messageParams[0].toLowerCase();
		let propsForSelect,results;
		propsForSelect = {
			table: 'defaultCommands',
			query: {trigger:sentCommand}
		}
		results = await database.select(propsForSelect);
		if (results) {
			if (results[0].isAlias) { //command passed in was an alias - recursively callback with aliased command
				props.messageParams[0] = results[0].aliasFor;
				const propsForAlias = {
					channel:props.channel,
					messageParams: props.messageParams
				}
				return this.CommandPermissionLevel(propsForAlias);
			} else {
				const modifier = props.messageParams[1];
				if (sentCommand == '!commands' &&
					modifier != 'edit' &&
					modifier != 'delete' &&
					modifier != 'remove' &&
					modifier != 'permissions' &&
					modifier != 'permission' &&
					modifier != 'perms')
				{
					return 0;
				} else if (sentCommand == '!volume' && !functions.isNumber(modifier)) {
					return 0;
				} else {
					for (let channelPermission of results[0].permissionsPerChannel) {
						if (channelPermission.channel == props.channel) {
							return channelPermission.permissionLevel;
						}
					}
				}
			}
		} else {
			//not a default command, check to see if it was user added
			propsForSelect = {
				table: 'commands',
				query: {trigger:sentCommand,channel:props.channel}
			}
			results = await database.select(propsForSelect);
			if (results) {
				if (results[0].isAlias) { //command passed in was an alias - recursively callback with aliased command
					props.messageParams[0] = results[0].aliasFor;
					const propsForAlias = {
						channel:props.channel,
						messageParams: props.messageParams
					}
					return this.CommandPermissionLevel(propsForAlias);
				} else {
					return results[0].permissionsLevel;
				}
			} else {
				throw 'Command doesn\'t exist!';
			}
		}
	}


	async canUserCallCommand(props) {
		switch(props.permissionLevelNeeded.toString()){
			case "0":
				return true;
				break;
			case "1":
				const propsForRegular = {
					userstate:props.userstate,
					channel:props.channel
				}
				const isRegular = await regulars.checkIfUserIsRegular(propsForRegular);
				if (isRegular || (props.userstate.mod || props.userstate.subscriber || '#' + props.userstate['username'] == props.channel)) {
					return true;
				}
				break;
			case "2":
				if (props.userstate.mod || props.userstate.subscriber || '#' + props.userstate['username'] == props.channel) {
					return true;
				}
				break;
			case "3":
				if (props.userstate.mod || '#' + props.userstate['username'] == props.channel) {
					return true;
				}
				break;
			case "4":
				if ('#' + props.userstate['username'] == props.channel) {
					return true;
				}
				break;
			default:
				throw 'Permission check failed';
				break;
		}
	}

	async getUserPermissionLevel(props) {
		try {
			if ('#' + props.userstate['username'] == props.channel) {
				return 4;
			} else if (props.userstate.mod) {
				return 3;
			} else if (props.userstate.subscriber) {
				return 2;
			} else {
				const isRegular = await regulars.checkIfUserIsRegular(props);
				if (isRegular) {
					return 1;
				} else {
					return 0;
				}
			}
		} catch (err) {
			throw err;
		}
	}
}

module.exports = new permissions();