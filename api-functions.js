var request = require('request');

var uptime = function(twitchClient,channel,userstate) {
	return new Promise((resolve, reject) => {
		request('https://api.rtainc.co/twitch/channels/' + channel.slice(1) + '/uptime?units=3', function (error, response, body) {
			if (!error && response.statusCode == 200) {
				twitchClient.say(channel, body + '!');
				resolve(body + '!');
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
		var url = 'https://api.rtainc.co/twitch/channels/' + channel.slice(1) + '/followers/' + userToCheck;
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				if (body.includes('isn\'t following')) {
					twitchClient.say(channel, body + '! BibleThump');
				} else {
					twitchClient.say(channel, body + '!');
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
		var url = 'https://api.rtainc.co/twitch/channels/' + channel.slice(1) + '/status?format=%5B0%5D+is+currently+playing+%5B1%5D'
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var userStr = '@' + userstate['display-name'] + ' -> ';
				twitchClient.say(channel, userStr + body + '!');
				resolve(body);
			} else {
				reject(error);
			}
		});
	});
}

var viewerCount = function(twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var url = 'https://api.rtainc.co/twitch/channels/' + channel.slice(1) + '/status?format=%5B0%5D+currently+is+streaming+for+%5B2%5D+viewers'
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var userStr = '@' + userstate['display-name'] + ' -> ';
				twitchClient.say(channel, userStr + body + '!');
				resolve(body);
			} else {
				reject(error);
			}
		});
	});
}

var randomViewer = function(twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var url = 'https://api.rtainc.co/twitch/channels/' + channel.slice(1) + '/viewers/random?format=The+winner+is+%5B0%5D'
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				editedBody = body.replace(' (mod)','');
				if (editedBody.includes('revlobot') || editedBody.includes('skedogbot') || editedBody.includes(channel.slice(1))) {
					resolve(randomViewer(twitchClient,channel,userstate,messageParams));
				} else {
					twitchClient.say(channel, editedBody + '!');
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
		var url = 'https://api.rtainc.co/twitch/brainyquote?format=%22%5B0%5D%22&type=funny'
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var userStr = '@' + userstate['display-name'] + ' -> ';
				twitchClient.say(channel, userStr + 'Quote of the day: ' + body);
				resolve(body);
			} else {
				reject(error);
			}
		});
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
				twitchClient.say(channel, userStr + msgToSend);
				resolve(msgToSend);
			} else {
				reject(error);
			}
		});
	});
}

var eightBall = function(twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var url = 'https://api.rtainc.co/twitch/8ball?format=[0]'
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var userStr = '@' + userstate['display-name'] + ' -> ';
				twitchClient.say(channel, userStr + body);
				resolve(body);
			} else {
				reject(error);
			}
		});
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