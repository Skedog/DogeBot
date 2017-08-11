const database = require('./database.js');
const functions = require('./functions.js');

class lists {

	async add(props) {
		props.ignoreMessageParamsForUserString = true;
		try {
			let arrayOfMessages = props.results[0].listArray;
			const messageToAdd = props.messageParams.slice(2,props.messageParams.length).join(' ').replace("'","&apos;");
			if (arrayOfMessages) {
				arrayOfMessages.push(messageToAdd);
			} else {
				arrayOfMessages = [];
				arrayOfMessages.push(messageToAdd);
			}
			let dataToUse = {};
			dataToUse["listArray"] = arrayOfMessages;
			const propsForUpdate = {
				table:'commands',
				query:{channel:props.channel,trigger:props.messageParams[0]},
				dataToUse:dataToUse
			}
			await database.update(propsForUpdate);
			const messageToSend = buildUserString(props) + 'Added successfully as #' + arrayOfMessages.length + '!';
			return messageToSend;
		} catch (err) {
			throw err;
		}
	}

	async edit(props) {
		props.ignoreMessageParamsForUserString = true;
		try {
			let arrayOfMessages = props.results[0].listArray;
			const passedQuoteNumber = props.messageParams[2].replace('#',''), indexToEdit = passedQuoteNumber-1;
			if (functions.isNumber(indexToEdit)) {
				if (indexToEdit >= 0 && indexToEdit <= arrayOfMessages.length-1) {
					const newMessage = props.messageParams.slice(3,props.messageParams.length).join(' ').replace("'","&apos;");
					arrayOfMessages[indexToEdit] = newMessage;
					let dataToUse = {};
					dataToUse["listArray"] = arrayOfMessages;
					const propsForUpdate = {
						table:'commands',
						query:{channel:props.channel,trigger:props.messageParams[0]},
						dataToUse:dataToUse
					}
					await database.update(propsForUpdate)
					const messageToSend = buildUserString(props) + props.messageParams[0].slice(1) + ' #' + passedQuoteNumber  + ' has been updated!';
					return messageToSend;
				};
			}
		} catch (err) {
			throw err;
		}
	}

	async remove(props) {
		props.ignoreMessageParamsForUserString = true;
		try {
			let arrayOfMessages = props.results[0].listArray;
			const passedQuoteNumber = props.messageParams[2].replace('#',''), indexToRemove = passedQuoteNumber-1;
			if (functions.isNumber(indexToRemove)) {
				if (indexToRemove >= 1 && indexToRemove <= arrayOfMessages.length-1) {
					arrayOfMessages.splice(indexToRemove,1);
					let dataToUse = {};
					dataToUse["listArray"] = arrayOfMessages;
					const propsForUpdate = {
						table:'commands',
						query:{channel:props.channel,trigger:props.messageParams[0]},
						dataToUse:dataToUse
					}
					await database.update(propsForUpdate)
					const messageToSend = buildUserString(props) + props.messageParams[0].slice(1) + ' #' + passedQuoteNumber  + ' has been removed!';
					return messageToSend;
				};
			}
		} catch (err) {
			throw err;
		}
	}

	async getListCommandItem(props) {
		props.ignoreMessageParamsForUserString = true;
		try {
			let arrayOfMessages = props.results[0].listArray;
			if (arrayOfMessages) {
				if (props.messageParams[1]) {
					const passedIndex = props.messageParams[1].replace('#','');
					const indexToUse = passedIndex - 1;
					if (indexToUse <= arrayOfMessages.length - 1) {
						const messageToSend = buildUserString(props) + '#' + (indexToUse+1) + ': ' + arrayOfMessages[indexToUse].replace('&apos;',"'")
						return messageToSend;
					} else {
						throw'Not a valid ' + props.results[0].trigger;
					};
				} else {
					try {
						const res = await functions.getRandomItemFromArray(arrayOfMessages);
						const messageToSend = buildUserString(props) + '#' + res[0] + ': ' + res[1]
						return messageToSend;
					} catch (err) {
						throw err;
					}
				}
			}
		} catch (err) {
			throw err;
		}
	}
}

module.exports = new lists();