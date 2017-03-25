var runSQL = require('./runSQL.js');

var checkIfUserIsRegular = function(db,userstate,channel) {
	return new Promise((resolve, reject) => {
		runSQL('select','regulars',{channel:channel,username:userstate['username']},'',db).then(results => {
			if (results) {
				resolve(true)
			} else {
				resolve(false)
			}
		}).catch(function(err) {
			reject(err)
		});
	})
}

var add = function(db,twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var query = {channel:channel,username:messageParams[2]};
		runSQL('select','regulars',query,'',db).then(results => {
			if (results) {
				var msgToSend = userstate['display-name'] + ' -> ' + messageParams[2] + ' is already a regular!';
				twitchClient.say(channel, msgToSend);
				reject(msgToSend);
			} else {
				var regularToAdd = messageParams[2];
				var dataToUse = {};
				dataToUse["username"] = regularToAdd.toLowerCase();
				dataToUse["channel"] = channel;
				runSQL('add','regulars',{},dataToUse,db).then(res => {
					var msgToSend = userstate['display-name'] + ' -> ' + messageParams[2] + ' has been added as a regular!'
					twitchClient.say(channel, msgToSend);
					resolve(msgToSend);
				}).catch(function(err) {
					reject(err);
				});
			}
		}).catch(function(err) {
			reject(err)
		});
	});
}

var remove = function(db,twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var query = {channel:channel,username:messageParams[2].toLowerCase()};
		runSQL('select','regulars',query,'',db).then(results => {
			if (!results) {
				var msgToSend = userstate['display-name'] + ' -> ' + messageParams[2] + ' isn\'t a regular!';
				twitchClient.say(channel, msgToSend);
				reject(msgToSend);
			} else {
				var query = {channel:channel,username:messageParams[2].toLowerCase()};
				runSQL('delete','regulars',query,'',db).then(res => {
					var msgToSend = userstate['display-name'] + ' -> ' + messageParams[2] + ' has been removed as a regular!'
					twitchClient.say(channel, msgToSend);
					resolve(msgToSend);
				}).catch(function(err) {
					reject(err);
				});
			}
		}).catch(function(err) {
			reject(err)
		});
	});
}

module.exports = {
	checkIfUserIsRegular: checkIfUserIsRegular,
	add: add,
	remove: remove
};