const database = require('./database.js');
const functions = require('./functions.js');
const cache = require('./cache.js');
const socket = require('./socket.js');

class Lists {

	async add(props) {
		props.ignoreMessageParamsForUserString = true;
		try {
			let arrayOfMessages = props.results[0].listArray;
			const messageToAdd = props.messageParams.slice(2, props.messageParams.length).join(' ').replace('\'', '&apos;');
			if (arrayOfMessages) {
				arrayOfMessages.push(messageToAdd);
			} else {
				arrayOfMessages = [];
				arrayOfMessages.push(messageToAdd);
			}
			const dataToUse = {};
			dataToUse.listArray = arrayOfMessages;
			const propsForUpdate = {
				table: 'commands',
				query: {channel: props.channel, trigger: props.messageParams[0]},
				dataToUse
			};
			await database.update(propsForUpdate);
			const messageToSend = functions.buildUserString(props) + 'Added successfully as #' + arrayOfMessages.length + '!';
			await cache.del(props.channel + 'commands');
			socket.io.in(functions.stripHash(props.channel)).emit('commands', ['added']);
			return messageToSend;
		} catch (err) {
			throw err;
		}
	}

	async edit(props) {
		props.ignoreMessageParamsForUserString = true;
		try {
			const arrayOfMessages = props.results[0].listArray;
			const passedQuoteNumber = props.messageParams[2].replace('#', '');
			const indexToEdit = passedQuoteNumber - 1;

			if (functions.isNumber(indexToEdit)) {
				if (indexToEdit >= 0 && indexToEdit <= arrayOfMessages.length - 1) {
					const newMessage = props.messageParams.slice(3, props.messageParams.length).join(' ').replace('\'', '&apos;');
					arrayOfMessages[indexToEdit] = newMessage;
					const dataToUse = {};
					dataToUse.listArray = arrayOfMessages;
					const propsForUpdate = {
						table: 'commands',
						query: {channel: props.channel, trigger: props.messageParams[0]},
						dataToUse
					};
					await database.update(propsForUpdate);
					const messageToSend = functions.buildUserString(props) + props.messageParams[0].slice(1) + ' #' + passedQuoteNumber + ' has been updated!';
					await cache.del(props.channel + 'commands');
					socket.io.in(functions.stripHash(props.channel)).emit('commands', ['updated']);
					return messageToSend;
				}
			}
		} catch (err) {
			throw err;
		}
	}

	async remove(props) {
		props.ignoreMessageParamsForUserString = true;
		try {
			const arrayOfMessages = props.results[0].listArray;
			const passedQuoteNumber = props.messageParams[2].replace('#', '');
			const indexToRemove = passedQuoteNumber - 1;
			if (functions.isNumber(indexToRemove)) {
				if (indexToRemove < 1) {
					const messageToSend = functions.buildUserString(props) + 'You can\'t remove the last item in a list. You can however delete the command with !delcom !' + props.messageParams[0].slice(1);
					return messageToSend;
				}
				if (indexToRemove >= 1 && indexToRemove <= arrayOfMessages.length - 1) {
					arrayOfMessages.splice(indexToRemove, 1);
					const dataToUse = {};
					dataToUse.listArray = arrayOfMessages;
					const propsForUpdate = {
						table: 'commands',
						query: {channel: props.channel, trigger: props.messageParams[0]},
						dataToUse
					};
					await database.update(propsForUpdate);
					const messageToSend = functions.buildUserString(props) + props.messageParams[0].slice(1) + ' #' + passedQuoteNumber + ' has been removed!';
					await cache.del(props.channel + 'commands');
					socket.io.in(functions.stripHash(props.channel)).emit('commands', ['deleted']);
					return messageToSend;
				}
				const messageToSend = functions.buildUserString(props) + props.messageParams[0].slice(1) + ' doesn\'t have a #' + passedQuoteNumber + '!';
				return messageToSend;
			}
		} catch (err) {
			throw err;
		}
	}

	async getListCommandItem(props) {
		try {
			const arrayOfMessages = props.results[0].listArray;
			if (arrayOfMessages) {
				if (functions.isNumber(props.messageParams[1])) {
					props.ignoreMessageParamsForUserString = true;
					const passedIndex = props.messageParams[1].replace('#', '');
					const indexToUse = passedIndex - 1;
					if (indexToUse <= arrayOfMessages.length - 1) {
						const messageToSend = functions.buildUserString(props) + '#' + (indexToUse + 1) + ': ' + arrayOfMessages[indexToUse].replace('&apos;', '\'');
						return messageToSend;
					}
					throw new Error('Not a valid ' + props.results[0].trigger);
				} else {
					try {
						const res = await functions.getRandomItemFromArray(arrayOfMessages);
						const messageToSend = functions.buildUserString(props) + '#' + res[0] + ': ' + res[1];
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

module.exports = new Lists();
