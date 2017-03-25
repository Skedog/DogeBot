const Discord = require('discord.js');
const discordClient = new Discord.Client();
var runSQL = require('./runSQL.js');
var log = require('npmlog');
// var Cleverbot = require('cleverbot-node');
// cleverbot = new Cleverbot;


var start = function(dbAndConstants) {
	return new Promise((resolve, reject) => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		connect(dbConstants).then(res => {
			log.info(res);
			monitorDiscordChat(db);
			resolve('Now monitoring Discord chat');
		}).catch(err => {
			log.error(err);
		});
	});
};

var connect = function(dbConstants) {
	return new Promise((resolve, reject) => {
		discordClient.login(dbConstants.discordAPIKey);
		discordClient.on('ready', () => {
			resolve('Connected to Discord server');
		});
	})
};

var monitorDiscordChat = function(db) {
	discordClient.on('message', message => {
		var messageChannel = message.channel;
		var messageContent = message.content;
		var botMentioned = message.mentions.users.find('username','SkedogBot');
		var firstMentionedUser = message.mentions.users.first();
		if (message.author.username != 'SkedogBot') {
			if (messageContent.startsWith('!')) {
				var messageSplit = messageContent.split(' ');
				var sentCommand = messageSplit[0];
				if (sentCommand == '!setstatus' && message.author.username == 'Skedog') {
					tempLength = messageSplit.length;
					statusToSet = messageSplit.slice(1,tempLength).join(' ').replace("'","&apos;");
					discordClient.users.find("username", "SkedogBot").setGame(statusToSet,null);
					message.delete().then(msg => console.log(`Deleted message from ${msg.author}`)).catch(console.error);
				} else {
					if (sentCommand != '!ayylmao' && sentCommand != '!dansgame' && sentCommand != '!derpdoge' && sentCommand != '!doge' && sentCommand != '!letoucan' && sentCommand != '!patrick' && sentCommand != '!skedoge' && sentCommand != '!skegasm' && sentCommand != '!skeleton' && sentCommand != '!dansgame' && sentCommand != '!shrug') {
						var query = {channel:'#ygtskedog',trigger:sentCommand};
						runSQL('select','commands',query,'',db).then(results => {
							if (results) {
								if (results[0]['permissionsLevel'] == 0) {
									var messageToSend = results[0]['chatmessage'];
									messageToSend = messageSplit[1] ?
										messageToSend.replace('$(touser)',messageSplit[1]).replace('$(user)',messageSplit[1]) :
										messageToSend.replace('$(touser)',message.author).replace('$(user)',message.author)
									messageChannel.sendMessage(messageToSend);
								}
							} else {
								if (sentCommand == '!insult') {
									var listOfInsults = ["I'm not saying I hate you, but I would unplug your life support to charge my phone.","Is your ass jealous of the amount of shit that just came out of your mouth?","I bet your brain feels as good as new, seeing that you never use it.","You must have been born on a highway because that's where most accidents happen.","You bring everyone a lot of joy, when you leave the room.","If you are going to be two faced, at least make one of them pretty.","What's the difference between you and eggs? Eggs get laid and you don't.","I'm jealous of all the people that haven't met you!","Two wrongs don't make a right, take your parents as an example.","I'd like to see things from your point of view but I can't seem to get my head that far up my ass.","Shut up, you'll never be the man your mother is.","Your family tree is a cactus, because everybody on it is a prick.","You're so ugly Hello Kitty said goodbye to you.","It looks like your face caught on fire and someone tried to put it out with a fork."];
									var insultToSend = getRandomInt(0,listOfInsults.length-1);
									if (firstMentionedUser !== undefined) {
										messageChannel.sendMessage(firstMentionedUser + ' ' + listOfInsults[insultToSend]);
									} else {
										message.reply(listOfInsults[insultToSend]);
									}
								} else if (sentCommand == '!about') {
									message.reply('Really? Come on, learn to Google you lazy fuck. Here: http://lmgtfy.com/?q=skedogbot');
								} else if (sentCommand == '!commands') {
									message.reply('Ugh, really? Fine, I can insult you using !insult, !about or you can look at the damn commands page: http://skedogbot.com/commands/ygtskedog');
								}
							}
						});
					}
				};
			} else {
				if (botMentioned) {
					// Removed due to Cleverbot changing API - needs API key now - which requires registration
					// Cleverbot.prepare(function(){
					// 	cleverbot.write(messageContent, function (response) {
					// 		message.reply(response.output);
					// 	});
					// });
				};
			}
		}
	});
};

module.exports = {
	start: start
};