const database = require('./database.js');
const functions = require('./functions.js');
const messages = require('./chat-messages.js');

class Points {

	async call(props) {
		switch (props.messageParams[1]) {
			case 'add':
			case 'gift':
				return this.addPoints(props);
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

	async removePoints(props) {
		if (props.pointsToRemove > 0) {
			const propsForSelect = {
				table: 'chatusers',
				query: {userName: props.userstate.username, channel: props.channel}
			};
			const results = await database.select(propsForSelect);
			if (results) {
				const dataToUse = {};
				dataToUse.loyaltyPoints = (results[0].loyaltyPoints - props.pointsToRemove);
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

	async getUserPointCount(props) {
		try {
			let passedUser = props.messageParams[1];
			if (passedUser) {
				passedUser = passedUser.replace('@', '');
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
}

module.exports = new Points();
