const database = require('./database.js');

class stats {

	async addCounterStat(props) {
		const propsForSelect = {
			table:props.statTableToUpdate,
			query:{channel:props.channel}
		}
		const results = await database.select(propsForSelect);
		let dataToUse = {};
		if (results) {
			dataToUse["counter"] = results[0]['counter']+1;
			const propsForUpdate = {
				table:props.statTableToUpdate,
				query:{channel:props.channel},
				dataToUse:dataToUse
			}
			await database.update(propsForUpdate);
			return;
		} else {
			dataToUse["channel"] = props.channel;
			dataToUse["counter"] = 1;
			const propsForAdd = {
				table:props.statTableToUpdate,
				dataToUse:dataToUse
			}
			await database.add(propsForAdd);
			return;
		}
	}

	async addTrackedUser(props) {
		let username;
		if (props.userstate != undefined) {
			username = props.userstate['username'];
		} else {
			username = props.username;
		}
		const propsForSelect = {table:'chatusers',query:{channel:props.channel,userName:username}}
		const results = await database.select(propsForSelect);
		if (results) {
			let dataToUse = {};
			dataToUse["lastSeen"] = new Date();
			const propsForUpdate = {table:'chatusers',query:{channel:props.channel,userName:username},dataToUse:dataToUse}
			await database.update(propsForUpdate);
			return;
		} else {
			let dataToUse = {};
			dataToUse["userName"] = username;
			dataToUse["channel"] = props.channel;
			dataToUse["lastSeen"] = new Date();
			dataToUse["firstSeen"] = new Date();
			dataToUse["numberOfChatMessages"] = 0;
			dataToUse["numberOfCommandMessages"] = 0;
			dataToUse["numberOfSongRequests"] = 0;
			const propsForAdd = {table:'chatusers',dataToUse:dataToUse}
			await database.add(propsForAdd);
			return;
		}
	}

	async updateUserCounter(props) {
		const username = props.userstate['username'];
		const propsForSelect = {table:'chatusers',query:{channel:props.channel,userName:username}}
		const results = await database.select(propsForSelect);
		if (results) {
			let dataToUse = {};
			dataToUse[props.statFieldToUpdate] = results[0][props.statFieldToUpdate]+1;
			const propsForUpdate = {table:'chatusers',query:{channel:props.channel,userName:username},dataToUse:dataToUse}
			await database.update(propsForUpdate);
			return;
		} else {
			await this.addTrackedUser(props);
			return;
		}
	}
}

module.exports = new stats();