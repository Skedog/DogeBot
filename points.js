const database = require('./database.js');
const functions = require('./functions.js');
const messages = require('./chat-messages.js');
const permissions = require('./permissions.js');

class Points {

	async call(props) {
		switch (props.messageParams[1]) {
			case 'add':
			case 'gift':
				return this.addPoints(props);
			case 'remove':
			case 'take':
				return this.takePoints(props);
			default:
				return this.getUserPoints(props);
		}
	}

	async addPoints(props) {
		try {
			const userSendingPoints = props.userstate.username;
			const userToSendPointsTo = props.messageParams[2].replace('@', '').toLowerCase();
			const amountOfPointsToSend = parseInt(props.messageParams[3], 10);
			const numberOfPointsSendingUserHas = await this.getUserPointCount(props);
			let isStreamer = false;
			if (isNaN(amountOfPointsToSend) || amountOfPointsToSend <= 0) {
				return;
			}
			if (userSendingPoints === props.channel.replace('#', '')) {
				isStreamer = true;
			}
			if (userSendingPoints === userToSendPointsTo && !isStreamer) {
				props.ignoreMessageParamsForUserString = true;
				return functions.buildUserString(props) + 'You can\'t give yourself points!';
			}
			if (numberOfPointsSendingUserHas < amountOfPointsToSend && !isStreamer) {
				props.ignoreMessageParamsForUserString = true;
				return functions.buildUserString(props) + 'You don\'t have enough points to do that!';
			}
			if (!isStreamer) {
				const propsForSelect = {
					table: 'chatusers',
					query: {userName: userSendingPoints, channel: props.channel}
				};
				const results = await database.select(propsForSelect);
				if (results) {
					const propsForUpdate = {
						table: 'chatusers',
						query: {userName: userSendingPoints, channel: props.channel},
						inc: {loyaltyPoints: Number(amountOfPointsToSend * -1)}
					};
					await database.update(propsForUpdate);
				}
			}
			const propsForSelect2 = {
				table: 'chatusers',
				query: {userName: userToSendPointsTo, channel: props.channel}
			};
			const results2 = await database.select(propsForSelect2);
			if (results2) {
				const propsForUpdate2 = {
					table: 'chatusers',
					query: {userName: userToSendPointsTo, channel: props.channel},
					inc: {loyaltyPoints: Number(amountOfPointsToSend)}
				};
				await database.update(propsForUpdate2);
				return userSendingPoints + ' sent ' + userToSendPointsTo + ' ' + amountOfPointsToSend + ' point(s)!';
			}
			throw new Error('failed trying to addPoints to ' + userToSendPointsTo + ' from ' + userSendingPoints);
		} catch (err) {
			throw err;
		}
	}

	async getPointsModerationPermissionLevel(props) {
		const sentCommand = props.messageParams[0].toLowerCase();
		const propsForSelect = {
			table: 'defaultCommands',
			query: {trigger: sentCommand}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			props.permissionLevelNeeded = await permissions.getModerationPermissionLevelForCommand(props, results[0].permissionsPerChannel);
			return permissions.canUserCallCommand(props);
		}
		throw new Error('Failed to get moderation permissions level of !points command for removing points');
	}

	// Handles removing points from !points remove user numberOfPoints
	async takePoints(props) {
		try {
			const amountOfPointsToRemove = parseInt(props.messageParams[3], 10);
			props.ignoreMessageParamsForUserString = true;
			const userStr = functions.buildUserString(props);
			const canUserCall = await this.getPointsModerationPermissionLevel(props);
			const userToRemovePointsFrom = props.messageParams[2].replace('@', '').toLowerCase();
			const propsForSelect = {
				table: 'chatusers',
				query: {userName: userToRemovePointsFrom, channel: props.channel}
			};
			const results = await database.select(propsForSelect);
			if (canUserCall && amountOfPointsToRemove > 0 && results) {
				const dataToUse = {};
				if (results[0].loyaltyPoints >= amountOfPointsToRemove) {
					dataToUse.loyaltyPoints = (results[0].loyaltyPoints - amountOfPointsToRemove);
				} else {
					dataToUse.loyaltyPoints = 0;
				}
				const propsForUpdate = {
					table: 'chatusers',
					query: {userName: userToRemovePointsFrom, channel: props.channel},
					dataToUse
				};
				await database.update(propsForUpdate);
				return userStr + 'Removed ' + amountOfPointsToRemove + ' point(s) from ' + userToRemovePointsFrom + '!';
			} else if (!results) {
				return userStr + 'User "' + userToRemovePointsFrom + '" does not exist!';
			}
		} catch (err) {
			throw err;
		}
	}

	// Handles removing points from calling commands that have a "cost"
	async removePoints(props) {
		if (props.pointsToRemove > 0) {
			const propsForSelect = {
				table: 'chatusers',
				query: {userName: props.userstate.username, channel: props.channel}
			};
			const results = await database.select(propsForSelect);
			if (results) {
				const dataToUse = {};
				if (results[0].loyaltyPoints >= props.pointsToRemove) {
					dataToUse.loyaltyPoints = (results[0].loyaltyPoints - props.pointsToRemove);
				} else {
					dataToUse.loyaltyPoints = 0;
				}
				const propsForUpdate = {
					table: 'chatusers',
					query: {userName: props.userstate.username, channel: props.channel},
					dataToUse
				};
				await database.update(propsForUpdate);
				return;
			}
			throw new Error('failed trying to remove ' + props.pointsToRemove + ' points from ' + props.userstate.username);
		}
	}

	async commandPointCost(props) {
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
			for (const channelPointCost of results[0].pointsPerChannel) {
				if (channelPointCost.channel === props.channel) {
					return channelPointCost.pointCost;
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
				return results[0].pointCost;
			}
			throw new Error('Command doesn\'t exist!');
		}
	}

	async canUserCallCommand(props) {
		const userPoints = await this.getUserPointCount(props);
		if (userPoints > props.pointsToRemove || props.pointsToRemove === 0) {
			return true;
		}
		const userStr = functions.buildUserString(props);
		props.messageToSend = userStr + 'You don\'t have enough points to call ' + props.messageParams[0].toLowerCase() + ', please try again later!';
		messages.send(props);
		throw new Error('not enough points');
	}

	async getUserPointCount(props) {
		try {
			let passedUser = props.messageParams[1];
			if (passedUser) {
				passedUser = passedUser.replace('@', '').toLowerCase();
				const propsForSelect = {
					table: 'chatusers',
					query: {userName: passedUser, channel: props.channel}
				};
				const results = await database.select(propsForSelect);
				if (results) {
					return results[0].loyaltyPoints;
				}
			}
			const propsForSelect = {
				table: 'chatusers',
				query: {userName: props.userstate.username, channel: props.channel}
			};
			const results = await database.select(propsForSelect);
			if (results) {
				return results[0].loyaltyPoints;
			}
			throw new Error('failed to get points');
		} catch (err) {
			throw err;
		}
	}

	// This is used for the default command !points
	async getUserPoints(props) {
		props.ignoreMessageParamsForUserString = true;
		const numberOfPoints = await this.getUserPointCount(props);
		const passedUser = props.messageParams[1];
		if (passedUser) {
			return functions.buildUserString(props) + passedUser + ' currently has ' + Math.floor(numberOfPoints) + ' points!';
		}
		return functions.buildUserString(props) + 'You currently have ' + Math.floor(numberOfPoints) + ' points!';
	}

	async gamble(props) {
		props.ignoreMessageParamsForUserString = true;
		let userPoints = await this.getUserPointCount(props);
		userPoints = Math.floor(userPoints);
		let amountToGamble = 0;
		if (!isNaN(props.messageParams[1])) {
			amountToGamble = props.messageParams[1];
		} else if (props.messageParams[1] === 'all') {
			amountToGamble = userPoints;
		} else {
			return functions.buildUserString(props) + 'Please pick a number of points to gamble, or use !gamble all';
		}
		if (userPoints === 0 && props.messageParams[1] === 'all') {
			return functions.buildUserString(props) + 'You don\'t have any points to gamble!';
		}
		if (amountToGamble <= 0 && props.messageParams[1] !== 'all') {
			return functions.buildUserString(props) + 'Please pick a number of points greater than 0 to gamble, or use !gamble all';
		}
		if (userPoints >= amountToGamble) {
			const randomNumber = functions.getRandomInt(1, 100);
			// Set the win percentage here
			if (randomNumber >= 60) {
				const propsForUpdate = {
					table: 'chatusers',
					query: {userName: props.userstate.username, channel: props.channel},
					inc: {loyaltyPoints: Number(amountToGamble)}
				};
				await database.update(propsForUpdate);
				const userPoints = await this.getUserPointCount(props);
				return 'Congrats! You won ' + amountToGamble + ' points, taking you to a total of ' + Math.floor(userPoints) + '!';
			}
			const propsForUpdate = {
				table: 'chatusers',
				query: {userName: props.userstate.username, channel: props.channel},
				inc: {loyaltyPoints: Number(amountToGamble * -1)}
			};
			await database.update(propsForUpdate);
			const userPoints = await this.getUserPointCount(props);
			if (userPoints === 0) {
				return 'Hahaha! You lost all your points!';
			}
			return 'Hahaha! You lost ' + amountToGamble + ' points, leaving you with a measly ' + Math.floor(userPoints) + '!';
		}
		return functions.buildUserString(props) + 'You don\'t have enough points to do that! You have ' + Math.floor(userPoints) + ' points!';
	}
}

module.exports = new Points();
