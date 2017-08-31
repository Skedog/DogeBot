const database = require('./database.js');

class Stats {

	async addCounterStat(props) {
		const propsForSelect = {
			table: props.statTableToUpdate,
			query: {channel: props.channel}
		};
		const results = await database.select(propsForSelect);
		const dataToUse = {};
		if (results) {
			dataToUse.counter = results[0].counter + 1;
			const propsForUpdate = {
				table: props.statTableToUpdate,
				query: {channel: props.channel},
				dataToUse
			};
			await database.update(propsForUpdate);
		} else {
			dataToUse.channel = props.channel;
			dataToUse.counter = 1;
			const propsForAdd = {
				table: props.statTableToUpdate,
				dataToUse
			};
			await database.add(propsForAdd);
		}
	}

	async addTrackedUser(props) {
		let username;
		if (props.userstate === undefined) {
			username = props.username;
		} else {
			username = props.userstate.username;
		}
		const propsForSelect = {
			table: 'chatusers',
			query: {channel: props.channel, userName: username}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const dataToUse = {};
			dataToUse.lastSeen = new Date();
			const propsForUpdate = {
				table: 'chatusers',
				query: {channel: props.channel, userName: username},
				dataToUse
			};
			await database.update(propsForUpdate);
		} else {
			const dataToUse = {};
			dataToUse.userName = username;
			dataToUse.channel = props.channel;
			dataToUse.lastSeen = new Date();
			dataToUse.firstSeen = new Date();
			dataToUse.numberOfChatMessages = 0;
			dataToUse.numberOfCommandMessages = 0;
			dataToUse.numberOfSongRequests = 0;
			const propsForAdd = {
				table: 'chatusers',
				dataToUse
			};
			await database.add(propsForAdd);
		}
	}

	async updateUserCounter(props) {
		const username = props.userstate.username;
		const propsForSelect = {
			table: 'chatusers',
			query: {channel: props.channel, userName: username}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const dataToUse = {};
			dataToUse[props.statFieldToUpdate] = results[0][props.statFieldToUpdate] + 1;
			const propsForUpdate = {
				table: 'chatusers',
				query: {channel: props.channel, userName: username},
				dataToUse
			};
			await database.update(propsForUpdate);
		} else {
			await this.addTrackedUser(props);
		}
	}
}

module.exports = new Stats();
