const database = require('./database.js');
const functions = require('./functions.js');

class regulars {

	async call(props) {
		if (props.messageParams[1] == 'add') {
			return await this.add(props);
		} else if (props.messageParams[1] == 'remove' || props.messageParams[1] == 'delete') {
			return await this.remove(props);
		} else {
			return;
		}
	}

	async checkIfUserIsRegular(props) {
		const propsForSelect = {
			table: 'regulars',
			query: {channel:props.channel,username:props.userstate['username']}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			return true;
		} else {
			return false;
		}
	}

	async add(props) {
		props.ignoreMessageParamsForUserString = true;
		const propsForSelect = {
			table: 'regulars',
			query: {channel:props.channel,username:props.messageParams[2]}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			return buildUserString(props) + props.messageParams[2] + ' is already a regular!';
		} else {
			const regularToAdd = props.messageParams[2];
			let dataToUse = {};
			dataToUse["username"] = regularToAdd.toLowerCase();
			dataToUse["channel"] = props.channel;
			const propsForAdd = {
				table: 'regulars',
				dataToUse: dataToUse
			}
			await database.add(propsForAdd);
			return buildUserString(props) + props.messageParams[2] + ' has been added as a regular!'
		}
	}

	async remove(props) {
		props.ignoreMessageParamsForUserString = true;
		let propsForSelect = {
			table:'regulars',
			query: {channel:props.channel,username:props.messageParams[2].toLowerCase()}
		}
		let results = await database.select(propsForSelect);
		if (!results) {
			return buildUserString(props) + props.messageParams[2] + ' isn\'t a regular!';
		} else {
			let propsForDelete = {
				table:'regulars',
				query: {channel:props.channel,username:props.messageParams[2].toLowerCase()}
			}
			await database.delete(propsForDelete);
			return buildUserString(props) + props.messageParams[2] + ' has been removed as a regular!';
		}
	}
}

module.exports = new regulars();