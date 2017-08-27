const database = require('./database.js');
const functions = require('./functions.js');

class Regulars {

	async call(props) {
		if (props.messageParams[1] == 'add') {
			return this.add(props);
		} else if (props.messageParams[1] == 'remove' || props.messageParams[1] == 'delete') {
			return this.remove(props);
		}
	}

	async checkIfUserIsRegular(props) {
		const propsForSelect = {
			table: 'regulars',
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
			table: 'regulars',
			query: {channel: props.channel, username: props.messageParams[2]}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return functions.buildUserString(props) + props.messageParams[2] + ' is already a regular!';
		}
		const regularToAdd = props.messageParams[2];
		const dataToUse = {};
		dataToUse.username = regularToAdd.toLowerCase();
		dataToUse.channel = props.channel;
		const propsForAdd = {
			table: 'regulars',
			dataToUse
		};
		await database.add(propsForAdd);
		return functions.buildUserString(props) + props.messageParams[2] + ' has been added as a regular!';
	}

	async remove(props) {
		props.ignoreMessageParamsForUserString = true;
		const propsForSelect = {
			table: 'regulars',
			query: {channel: props.channel, username: props.messageParams[2].toLowerCase()}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const propsForDelete = {
				table: 'regulars',
				query: {channel: props.channel, username: props.messageParams[2].toLowerCase()}
			};
			await database.delete(propsForDelete);
			return functions.buildUserString(props) + props.messageParams[2] + ' has been removed as a regular!';
		}
		return functions.buildUserString(props) + props.messageParams[2] + ' isn\'t a regular!';
	}
}

module.exports = new Regulars();
