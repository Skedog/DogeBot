const database = require('./database.js');
const moment = require('moment');
const functions = require('./functions.js');

class users {

	async lastSeen(props) {
		props.ignoreMessageParamsForUserString = true;
		if (props.messageParams[1]) {
			const propsForSelect = {
				table: 'chatusers',
				query: {channel:props.channel,userName:props.messageParams[1].toLowerCase()}
			}
			const results = await database.select(propsForSelect);
			if (results) {
				const lastSeenDate = moment(results[0]['lastSeen']);
				const formattedDate = lastSeenDate.format('MMMM Do YYYY, h:mm:ss a');
				const currentUTCDate = moment(new Date());
				const differenceInDays = lastSeenDate.diff(currentUTCDate, 'days');
				let msgToSend;
				if (differenceInDays > 0) {
					msgToSend = functions.buildUserString(props) + props.messageParams[1] + ' was last seen ' + formattedDate + '. That is ' + differenceInDays + ' days ago.';
				} else {
					msgToSend = functions.buildUserString(props) + props.messageParams[1] + ' was last seen ' + formattedDate + '.';
				}
				return msgToSend;
			}
		}
		return;
	}

	async firstSeen(props) {
		props.ignoreMessageParamsForUserString = true;
		if (props.messageParams[1]) {
			const propsForSelect = {
				table: 'chatusers',
				query: {channel:props.channel,userName:props.messageParams[1].toLowerCase()}
			}
			const results = await database.select(propsForSelect);
			if (results) {
				const firstSeenDate = moment(results[0]['firstSeen']);
				const formattedDate = firstSeenDate.format('MMMM Do YYYY, h:mm:ss a');
				const msgToSend = functions.buildUserString(props) + props.messageParams[1] + ' was first seen on ' + formattedDate + '.';
				return msgToSend;
			}
		};
		return;
	}
}

module.exports = new users();