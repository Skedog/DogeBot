var request = require('request');
var messageHandler = require('./chat-messages.js');

var uptime = function(twitchClient,channel,userstate) {
	return new Promise((resolve, reject) => {
		var url = 'https://decapi.me/twitch/uptime?channel=' + channel.slice(1);
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				editedBody = body.replace('.','');
				if (editedBody.includes('Channel is not live')) {
					messageHandler.sendMessage(twitchClient,channel,channel.slice(1) + ' is not live!',false,'');
					resolve(editedBody + '!');
				} else {
					messageHandler.sendMessage(twitchClient,channel,channel.slice(1) + ' has been live for ' + editedBody + '!',false,'');
					resolve(editedBody + '!');
				}
			} else {
				reject(error);
			}
		});
	});
}

var followage = function(twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		if (messageParams[1]) {
			var userToCheck = messageParams[1];
		} else {
			var userToCheck = userstate['display-name'];
		}
		var url = 'https://beta.decapi.me/twitch/followage/' + channel.slice(1) + '/' + userToCheck;
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				if (body.includes('is not following')) {
					messageHandler.sendMessage(twitchClient,channel,userToCheck + ' is not following! BibleThump',false,'');
				} else {
					messageHandler.sendMessage(twitchClient,channel,userToCheck + ' has been following for ' + body + '!',false,'');
				}
				resolve(body);
			} else {
				reject(error);
			}
		});
	});
}

var game = function(twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var userStr = '@' + userstate['display-name'] + ' -> ';
		messageHandler.sendMessage(twitchClient,channel,userStr + 'Sorry, the API used for this command is broken and an alternative has yet to be found!',false,'');
		resolve('!game is broken');
		// var url = 'https://api.rtainc.co/twitch/channels/' + channel.slice(1) + '/status?format=%5B0%5D+is+currently+playing+%5B1%5D'
		// request(url, function (error, response, body) {
		// 	if (!error && response.statusCode == 200) {
		// 		var userStr = '@' + userstate['display-name'] + ' -> ';
		// 		twitchClient.say(channel, userStr + body + '!');
		// 		resolve(body);
		// 	} else {
		// 		reject(error);
		// 	}
		// });
	});
}

var viewerCount = function(twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var userStr = '@' + userstate['display-name'] + ' -> ';
		messageHandler.sendMessage(twitchClient,channel,userStr + 'Sorry, the API used for this command is broken and an alternative has yet to be found!',false,'');
		resolve('!viewers is broken');
		// var url = 'https://api.rtainc.co/twitch/channels/' + channel.slice(1) + '/status?format=%5B0%5D+currently+is+streaming+for+%5B2%5D+viewers'
		// request(url, function (error, response, body) {
		// 	if (!error && response.statusCode == 200) {
		// 		var userStr = '@' + userstate['display-name'] + ' -> ';
		// 		twitchClient.say(channel, userStr + body + '!');
		// 		resolve(body);
		// 	} else {
		// 		reject(error);
		// 	}
		// });
	});
}

var randomViewer = function(twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var url = 'https://2g.be/twitch/randomviewer.php?channel=' + channel.slice(1);
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				if (body.includes('revlobot') || body.includes('skedogbot') || body.includes(channel.slice(1))) {
					resolve(randomViewer(twitchClient,channel,userstate,messageParams));
				} else {
					messageHandler.sendMessage(twitchClient,channel,'The winner is ' + body + '!',false,'');
					resolve(body);
				}
			} else {
				reject(error);
			}
		});
	});
}

var quoteOfTheDay = function(twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var userStr = '@' + userstate['display-name'] + ' -> ';
		messageHandler.sendMessage(twitchClient,channel,userStr + 'Sorry, the API used for this command is broken and an alternative has yet to be found!',false,'');
		resolve('!qotd is broken');
		// var url = 'https://api.rtainc.co/twitch/brainyquote?format=%22%5B0%5D%22&type=funny'
		// request(url, function (error, response, body) {
		// 	if (!error && response.statusCode == 200) {
		// 		var userStr = '@' + userstate['display-name'] + ' -> ';
		// 		twitchClient.say(channel, userStr + 'Quote of the day: ' + body);
		// 		resolve(body);
		// 	} else {
		// 		reject(error);
		// 	}
		// });
	});
}

var bf4stats = function(twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var plat = messageParams[2] ? messageParams[2] : 'pc'
		var url = 'https://api.bf4stats.com/api/playerInfo?plat=' + plat + '&name=' + messageParams[1] + '&output=json&opt=urls,stats'
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var json = JSON.parse(body);
				var playerName = json.player.name;
				var kills = json.stats.kills;
				var deaths = json.stats.deaths;
				var kd = Math.round(((kills / deaths) + 0.00001) * 100) / 100;
				var statsLink = 'https://bf4stats.com/pc/' + playerName;
				var rank = json.stats.rank;
				var msgToSend = playerName + ' has a ' + kd + ' k/d and is rank ' + rank + '! More stats here: ' + statsLink;
				var userStr = '@' + userstate['display-name'] + ' -> ';
				messageHandler.sendMessage(twitchClient,channel,userStr + msgToSend,false,'');
				resolve(msgToSend);
			} else {
				reject(error);
			}
		});
	});
}

var eightBall = function(twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var userStr = '@' + userstate['display-name'] + ' -> ';
		messageHandler.sendMessage(twitchClient,channel,userStr + 'Sorry, the API used for this command is broken and an alternative has yet to be found!',false,'');
		resolve('!8ball is broken');
		// var url = 'https://api.rtainc.co/twitch/8ball?format=[0]'
		// request(url, function (error, response, body) {
		// 	if (!error && response.statusCode == 200) {
		// 		var userStr = '@' + userstate['display-name'] + ' -> ';
		// 		twitchClient.say(channel, userStr + body);
		// 		resolve(body);
		// 	} else {
		// 		reject(error);
		// 	}
		// });
	});
}

module.exports = {
	uptime: uptime,
	followage: followage,
	game: game,
	viewerCount: viewerCount,
	randomViewer: randomViewer,
	quoteOfTheDay: quoteOfTheDay,
	bf4stats: bf4stats,
	eightBall: eightBall
};