var runSQL = require('./runSQL.js');

var muteMessages = function(twitchClient,channel,isWhisper,whisperFrom) {
	return new Promise((resolve, reject) => {
		runSQL('select','channels',{ChannelName:channel},'',db).then(results => {
			var dataToUse = {};
			dataToUse["isSilent"] = true;
			runSQL('update','channels',{ChannelName:channel},dataToUse,db);
			sendMessage(twitchClient,channel,'Bot has been muted!',isWhisper,whisperFrom);
			resolve('Muted bot in ' + channel);
		}).catch(err => {
			resolve(err);
		});
	});
}

var unmuteMessages = function(twitchClient,channel,isWhisper,whisperFrom) {
	return new Promise((resolve, reject) => {
		runSQL('select','channels',{ChannelName:channel},'',db).then(results => {
			var dataToUse = {};
			dataToUse["isSilent"] = false;
			runSQL('update','channels',{ChannelName:channel},dataToUse,db).then(res => {
				sendMessage(twitchClient,channel,'Bot has been unmuted!',isWhisper,whisperFrom);
				resolve('Muted bot in ' + channel);
			});
		}).catch(err => {
			resolve(err);
		});
	});
}

var sendMessage = function(twitchClient,channel,messageToSend,isWhisper,whipserFrom) {
	runSQL('select','channels',{ChannelName:channel},'',db).then(results => {
		if (isWhisper) {
			twitchClient.whisper(whipserFrom, messageToSend);
		} else {
			if (!results[0]['isSilent']) {
				twitchClient.say(channel, messageToSend);
			};
		};
	});
}


module.exports = {
	muteMessages: muteMessages,
	unmuteMessages: unmuteMessages,
	sendMessage: sendMessage
};