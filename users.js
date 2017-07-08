var runSQL = require('./runSQL.js');
var moment = require('moment');
var messageHandler = require('./chat-messages.js');

var lastSeen = function(db,twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		if (messageParams[1]) {
			var query = {channel:channel,userName:messageParams[1].toLowerCase()};
			runSQL('select','chatusers',query,'',db).then(results => {
				if (results) {
					var lastSeenDate = moment(results[0]['lastSeen']);
					var formattedDate = lastSeenDate.format('MMMM Do YYYY, h:mm:ss a');
					var currentUTCDate = moment(new Date());
					var differenceInDays = lastSeenDate.diff(currentUTCDate, 'days');
					if (differenceInDays > 0) {
						var msgToSend = messageParams[1] + ' was last seen ' + formattedDate + '. That is ' + differenceInDays + ' days ago.';
					} else {
						var msgToSend = messageParams[1] + ' was last seen ' + formattedDate + '.';
					}
					messageHandler.sendMessage(twitchClient,channel,msgToSend,false,'');
					resolve(msgToSend);
				}
			}).catch(function(err) {
				reject(err)
			});
		}
	});
}

var firstSeen = function(db,twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		if (messageParams[1]) {
			var query = {channel:channel,userName:messageParams[1].toLowerCase()};
			runSQL('select','chatusers',query,'',db).then(results => {
				if (results) {
					var firstSeenDate = moment(results[0]['firstSeen']);
					var formattedDate = firstSeenDate.format('MMMM Do YYYY, h:mm:ss a');
					var msgToSend = messageParams[1] + ' was first seen on ' + formattedDate + '.';
					messageHandler.sendMessage(twitchClient,channel,msgToSend,false,'');
					resolve(msgToSend);
				}
			}).catch(function(err) {
				reject(err)
			});
		}
	});
}

module.exports = {
	lastSeen: lastSeen,
	firstSeen: firstSeen
};