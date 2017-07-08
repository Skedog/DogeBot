var runSQL = require('./runSQL.js');

var addCounterStat = function(table,numberToAdd,channel,db) {
	runSQL('select',table,{channel:channel},'',db).then(results => {
		if (results) {
			var dataToUse = {};
			dataToUse["counter"] = results[0]['counter']+numberToAdd;
			runSQL('update',table,{channel:channel},dataToUse,db);
		} else {
			var dataToUse = {};
			dataToUse["channel"] = channel;
			dataToUse["counter"] = numberToAdd;
			runSQL('add',table,{},dataToUse,db);
		}
	});
};

var addTrackedUser = function(channel,username,db) {
	runSQL('select','chatusers',{channel:channel,userName:username},'',db).then(results => {
		if (results) {
			var dataToUse = {};
			dataToUse["lastSeen"] = new Date();
			runSQL('update','chatusers',{channel:channel,userName:username},dataToUse,db);
		} else {
			var dataToUse = {};
			dataToUse["userName"] = username;
			dataToUse["channel"] = channel;
			dataToUse["lastSeen"] = new Date();
			dataToUse["firstSeen"] = new Date();
			dataToUse["numberOfChatMessages"] = 0;
			runSQL('add','chatusers',{},dataToUse,db);
		}
	});
}

var updateUserMessageCounter = function(channel,username,db) {
	runSQL('select','chatusers',{channel:channel,userName:username},'',db).then(results => {
		if (results) {
			var dataToUse = {};
			dataToUse["numberOfChatMessages"] = results[0]['numberOfChatMessages']+1;
			runSQL('update','chatusers',{channel:channel,userName:username},dataToUse,db);
		} else {
			addTrackedUser(channel,username,db);
		}
	});
}

var updateUserCommandCounter = function(channel,username,db) {
	runSQL('select','chatusers',{channel:channel,userName:username},'',db).then(results => {
		if (results) {
			var dataToUse = {};
			dataToUse["numberOfCommandMessages"] = results[0]['numberOfCommandMessages']+1;
			runSQL('update','chatusers',{channel:channel,userName:username},dataToUse,db);
		} else {
			addTrackedUser(channel,username,db);
		}
	});
}

var updateUserSongRequestCounter = function(channel,username,db) {
	runSQL('select','chatusers',{channel:channel,userName:username},'',db).then(results => {
		if (results) {
			var dataToUse = {};
			dataToUse["numberOfSongRequests"] = results[0]['numberOfSongRequests']+1;
			runSQL('update','chatusers',{channel:channel,userName:username},dataToUse,db);
		} else {
			addTrackedUser(channel,username,db);
		}
	});
}

module.exports = {
	addCounterStat: addCounterStat,
	addTrackedUser: addTrackedUser,
	updateUserMessageCounter: updateUserMessageCounter,
	updateUserCommandCounter: updateUserCommandCounter,
	updateUserSongRequestCounter: updateUserSongRequestCounter
};