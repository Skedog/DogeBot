const log = require('npmlog');
const Discord = require('discord.js');
const discordClient = new Discord.Client();
const database = require('./database.js');
const functions = require('./functions.js');

async function start() {
	await connect();
	log.info('Now monitoring Discord chat');
	monitorDiscordChat();
	return;
};

async function connect() {
	const dbConstants = await database.constants();
	discordClient.login(dbConstants.discordAPIKey);
	discordClient.on('ready', () => {
		return;
	});
};

function monitorDiscordChat() {
	discordClient.on('message', message => {
		handleChatMessage(message);
	});
};

async function handleChatMessage(message) {
	const messageChannel = message.channel;
	const messageContent = message.content;
	const firstMentionedUser = message.mentions.users.first();
	if (message.author.username != 'SkedogBot' && messageContent.startsWith('!')) {
		const messageSplit = messageContent.split(' ');
		const sentCommand = messageSplit[0];
		if (sentCommand == '!setstatus' && message.author.username == 'Skedog') {
			statusToSet = messageSplit.slice(1,messageSplit.length).join(' ').replace("'","&apos;");
			discordClient.users.find("username", "SkedogBot").setGame(statusToSet,null);
			message.delete().then(msg => console.log(`Deleted message from ${msg.author}`)).catch(console.error);
		} else {
			const arrayOfCommands = ['!ayylmao','!dansgame','!derpdoge','!doge','!letoucan','!patrick','!skedoge','!skegasm','!skeleton','!dansgame','!shrug'];
			if (!arrayOfCommands.includes(sentCommand)) {
				const propsForSelect = {
					table: 'commands',
					query: {channel: '#ygtskedog',trigger: sentCommand}
				}
				const results = await database.select(propsForSelect);
				if (results) {
					if (results[0]['permissionsLevel'] == 0) {
						let messageToSend = results[0]['chatmessage'];
						messageToSend = messageSplit[1] ?
							messageToSend.replace('$(touser)',messageSplit[1]).replace('$(user)',messageSplit[1]) :
							messageToSend.replace('$(touser)',message.author).replace('$(user)',message.author)
						messageChannel.send(messageToSend);
					}
				} else {
					if (sentCommand == '!insult') {
						const listOfInsults = ["I'm not saying I hate you, but I would unplug your life support to charge my phone.","Is your ass jealous of the amount of shit that just came out of your mouth?","I bet your brain feels as good as new, seeing that you never use it.","You must have been born on a highway because that's where most accidents happen.","You bring everyone a lot of joy, when you leave the room.","If you are going to be two faced, at least make one of them pretty.","What's the difference between you and eggs? Eggs get laid and you don't.","I'm jealous of all the people that haven't met you!","Two wrongs don't make a right, take your parents as an example.","I'd like to see things from your point of view but I can't seem to get my head that far up my ass.","Shut up, you'll never be the man your mother is.","Your family tree is a cactus, because everybody on it is a prick.","You're so ugly Hello Kitty said goodbye to you.","It looks like your face caught on fire and someone tried to put it out with a fork."];
						const insultToSend = functions.getRandomInt(0,listOfInsults.length-1);
						if (firstMentionedUser !== undefined) {
							messageChannel.send(firstMentionedUser + ' ' + listOfInsults[insultToSend]);
						} else {
							message.reply(listOfInsults[insultToSend]);
						}
					} else if (sentCommand == '!about') {
						message.reply('Really? Come on, learn to Google you lazy fuck. Here: http://lmgtfy.com/?q=skedogbot');
					} else if (sentCommand == '!commands') {
						message.reply('Ugh, really? Fine, I can insult you using !insult, !about or you can look at the damn commands page: http://skedogbot.com/commands/ygtskedog');
					}
				}
			}
		};
	}
}

module.exports = {
	start: start
};