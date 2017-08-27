const log = require('npmlog');
const Discord = require('discord.js');
const database = require('./database.js');
const lists = require('./lists.js');
const functions = require('./functions.js');

const discordClient = new Discord.Client();
async function start() {
	await connect();
	log.info('Now monitoring Discord chat');
	monitorDiscordChat();
}

async function connect() {
	const dbConstants = await database.constants();
	discordClient.login(dbConstants.discordAPIKey);
	discordClient.on('ready', () => {});
}

function monitorDiscordChat() {
	discordClient.on('message', message => {
		handleChatMessage(message);
	});
}

async function handleChatMessage(message) {
	const messageChannel = message.channel;
	const messageContent = message.content;
	if (message.author.username != 'SkedogBot' && messageContent.startsWith('!')) {
		const messageSplit = messageContent.split(' ');
		const sentCommand = messageSplit[0];
		if (sentCommand == '!setstatus' && message.author.username == 'Skedog') {
			const statusToSet = messageSplit.slice(1, messageSplit.length).join(' ').replace('\'', '&apos;');
			discordClient.users.find('username', 'SkedogBot').setGame(statusToSet, null);
			message.delete().then(msg => console.log(`Deleted message from ${msg.author}`)).catch(console.error);
		} else {
			handleDiscordCommand(message, messageChannel, messageSplit, sentCommand);
		}
	}
}

async function handleDiscordCommand(message, messageChannel, messageSplit, sentCommand) {
	const arrayOfCommands = ['!ayylmao', '!dansgame', '!derpdoge', '!doge', '!letoucan', '!patrick', '!skedoge', '!skegasm', '!skeleton', '!dansgame', '!shrug'];
	if (!arrayOfCommands.includes(sentCommand)) {
		if (sentCommand == '!about') {
			message.reply('Really? Come on, learn to Google you lazy fuck. Here: http://lmgtfy.com/?q=skedogbot');
		} else if (sentCommand == '!commands') {
			message.reply('Ugh, really? Fine, I can insult you using !insult, !about or you can look at the damn commands page: http://skedogbot.com/commands/ygtskedog');
		} else {
			const propsForSelect = {
				table: 'commands',
				query: {channel: '#ygtskedog', trigger: sentCommand}
			};
			const results = await database.select(propsForSelect);
			if (results) {
				if (results[0].permissionsLevel == 0) {
					if (results[0].chatmessage.includes('$(list)')) {
						const testUserstate = [];
						testUserstate['display-name'] = message.author;
						const propsForListCommands = {
							channel: '#ygtskedog',
							messageParams: [sentCommand,messageSplit[1]],
							results: results,
							userstate: testUserstate
						};
						try {
							const returnedMessage = await lists.getListCommandItem(propsForListCommands);
							if (messageSplit[1] != undefined && !functions.isNumber(messageSplit[1])) {
								const finalMessage = returnedMessage.split(' -> #');
								messageChannel.send(messageSplit[1] + ' -> #' + finalMessage[1]);
							} else {
								const finalMessage = returnedMessage.split(' -> #');
								messageChannel.send(message.author + ' -> #' + finalMessage[1]);
							}
						} catch (err) {
							console.log(err);
						}
					} else {
						let messageToSend = results[0].chatmessage;
						messageToSend = messageSplit[1] ?
							messageToSend.replace('$(touser)', messageSplit[1]).replace('$(user)', messageSplit[1]) :
							messageToSend.replace('$(touser)', message.author).replace('$(user)', message.author);
						messageChannel.send(messageToSend);
					}
				}
			}
		}
	}
}

module.exports = {
	start
};
