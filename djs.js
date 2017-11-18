const database = require('./database.js');
const functions = require('./functions.js');

class DJs {

	async call(props) {
		if (props.messageParams[1] === 'add') {
			return this.add(props);
		} else if (props.messageParams[1] === 'remove' || props.messageParams[1] === 'delete') {
			return this.remove(props);
		}
	}

	async checkIfUserIsDJ(props) {
		const propsForSelect = {
			table: 'djs',
			query: {channel: props.channel, username: props.userstate.username}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return true;
		}
		return false;
	}

	async add(props) {
		props.ignoreMessageParamsForUserString = true;
		const propsForSelect = {
			table: 'djs',
			query: {channel: props.channel, username: props.messageParams[2]}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return functions.buildUserString(props) + props.messageParams[2] + ' is already a DJ!';
		}
		const djToAdd = props.messageParams[2];
		const dataToUse = {};
		dataToUse.username = djToAdd.toLowerCase();
		dataToUse.channel = props.channel;
		const propsForAdd = {
			table: 'djs',
			dataToUse
		};
		await database.add(propsForAdd);
		return functions.buildUserString(props) + props.messageParams[2] + ' has been added as a DJ!';
	}

	async remove(props) {
		props.ignoreMessageParamsForUserString = true;
		const propsForSelect = {
			table: 'djs',
			query: {channel: props.channel, username: props.messageParams[2].toLowerCase()}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const propsForDelete = {
				table: 'djs',
				query: {channel: props.channel, username: props.messageParams[2].toLowerCase()}
			};
			await database.delete(propsForDelete);
			return functions.buildUserString(props) + props.messageParams[2] + ' has been removed as a DJ!';
		}
		return functions.buildUserString(props) + props.messageParams[2] + ' isn\'t a DJ!';
	}
}

module.exports = new DJs();
