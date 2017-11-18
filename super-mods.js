const database = require('./database.js');
const functions = require('./functions.js');

class SuperMods {

	async call(props) {
		if (props.messageParams[1] === 'add') {
			return this.add(props);
		} else if (props.messageParams[1] === 'remove' || props.messageParams[1] === 'delete') {
			return this.remove(props);
		}
	}

	async checkIfUserIsSuperMod(props) {
		const propsForSelect = {
			table: 'superMods',
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
			table: 'superMods',
			query: {channel: props.channel, username: props.messageParams[2]}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return functions.buildUserString(props) + props.messageParams[2] + ' is already a superMod!';
		}
		const superModToAdd = props.messageParams[2];
		const dataToUse = {};
		dataToUse.username = superModToAdd.toLowerCase();
		dataToUse.channel = props.channel;
		const propsForAdd = {
			table: 'superMods',
			dataToUse
		};
		await database.add(propsForAdd);
		return functions.buildUserString(props) + props.messageParams[2] + ' has been added as a superMod!';
	}

	async remove(props) {
		props.ignoreMessageParamsForUserString = true;
		const propsForSelect = {
			table: 'superMods',
			query: {channel: props.channel, username: props.messageParams[2].toLowerCase()}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const propsForDelete = {
				table: 'superMods',
				query: {channel: props.channel, username: props.messageParams[2].toLowerCase()}
			};
			await database.delete(propsForDelete);
			return functions.buildUserString(props) + props.messageParams[2] + ' has been removed as a superMod!';
		}
		return functions.buildUserString(props) + props.messageParams[2] + ' isn\'t a superMod!';
	}
}

module.exports = new SuperMods();
