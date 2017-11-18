const database = require('./database.js');
const functions = require('./functions.js');

class Giveaways {

	async call(props) {
		if (props.messageParams[1] === 'start') {
			return this.startGiveaway(props);
		} else if (props.messageParams[1] === 'end' || props.messageParams[1] === 'stop' || props.messageParams[1] === 'close') {
			return this.endGiveaway(props);
		} else if (props.messageParams[1] === 'roll' || props.messageParams[1] === 'pick' || props.messageParams[1] === 'winner') {
			return this.pickWinner(props);
		} else if (props.messageParams[0] === '!enter') {
			return this.enterGiveaway(props);
		}
	}

	async startGiveaway(props) {
		props.ignoreMessageParamsForUserString = true;
		const propsForSelect = {
			table: 'giveaways',
			query: {channel: props.channel, isActive: true}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return functions.buildUserString(props) + 'A giveaway is already running! Use "!giveaway end" to close it!';
		}
		props.messageParams.splice(0, 2);
		const giveawayToAdd = props.messageParams.join(' ');
		const dataToUse = {};
		dataToUse.giveawayName = giveawayToAdd;
		dataToUse.channel = props.channel;
		dataToUse.timeStarted = new Date();
		dataToUse.isActive = true;
		dataToUse.usersEntered = [];
		const propsForAdd = {
			table: 'giveaways',
			dataToUse
		};
		await database.add(propsForAdd);
		return functions.buildUserString(props).replace(' -> ', '') + ' has started a new giveaway! Use !enter for a chance to win!';
	}

	async endGiveaway(props) {
		props.ignoreMessageParamsForUserString = true;
		const propsForSelect = {
			table: 'giveaways',
			query: {channel: props.channel, isActive: true}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const dataToUse = {};
			dataToUse.isActive = false;
			const propsForUpdate = {
				table: 'giveaways',
				query: {_id: results[0]._id},
				dataToUse
			};
			await database.update(propsForUpdate);
			return functions.buildUserString(props) + 'Entries for the giveaway have closed! Use "!giveaway roll" to pick a winner!';
		}
		return functions.buildUserString(props) + 'There is no active giveaway! Use "!giveaway start" to start a new one!';
	}

	async enterGiveaway(props) {
		props.ignoreMessageParamsForUserString = true;
		const propsForSelect = {
			table: 'giveaways',
			query: {channel: props.channel, isActive: true},
			sortBy: {timeStarted: -1}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const currentEntries = results[0].usersEntered;
			const userEntering = functions.buildUserString(props).replace(' -> ', '');
			if (currentEntries.includes(userEntering)) {
				return functions.buildUserString(props) + 'You have already entered this giveaway!';
			}
			const dataToUse = {};
			currentEntries.push(userEntering);
			dataToUse.usersEntered = currentEntries;
			const propsForUpdate = {
				table: 'giveaways',
				query: {_id: results[0]._id},
				dataToUse
			};
			await database.update(propsForUpdate);
			return functions.buildUserString(props) + 'You have entered for: ' + results[0].giveawayName;
		}
		return functions.buildUserString(props) + 'There is no active giveaway to enter!';
	}

	async pickWinner(props) {
		props.ignoreMessageParamsForUserString = true;
		// Check to make sure all giveaways have been closed first
		const propsForActiveCheck = {
			table: 'giveaways',
			query: {channel: props.channel, isActive: true},
			sortBy: {timeStarted: -1}
		};
		const activeResults = await database.select(propsForActiveCheck);
		if (activeResults) {
			return functions.buildUserString(props) + 'The giveaway for: ' + activeResults[0].giveawayName + ' is still active! Use "!giveaway end" before picking a winner!';
		}
		const propsForSelect = {
			table: 'giveaways',
			query: {channel: props.channel, isActive: false},
			sortBy: {timeStarted: -1}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const allEntries = results[0].usersEntered;
			const winner = functions.getRandomItemFromArray(allEntries)[1];
			const dataToUse = {};
			dataToUse.isActive = false;
			const propsForUpdate = {
				table: 'giveaways',
				query: {_id: results[0]._id},
				dataToUse
			};
			await database.update(propsForUpdate);
			return 'The winner is ' + winner.trim() + '! You will be contacted shortly with your prize!';
		}
		return functions.buildUserString(props) + 'There is no active giveaway! Use "!giveaway start" to start a new one!';
	}
}

module.exports = new Giveaways();
