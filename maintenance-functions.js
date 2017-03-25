var log = require('npmlog');
var runSQL = require('./runSQL.js');

var clearSongCache = function(db,channel) {
	return new Promise((resolve, reject) => {
		runSQL('deleteall','songcache',{channel:channel},'',db).then(res => {
			resolve(res);
		}).catch(err => {
			log.error(err);
			reject(err);
		})
	})
}

var deleteChannel = function(db,channel) {
	return new Promise((resolve, reject) => {
		runSQL('select','channels',{ChannelName:channel},'',db).then(channelResults => {
			var twitchUserID = channelResults[0].twitchUserID;
			runSQL('deleteall','chatusers',{channel:channel},'',db);
			runSQL('deleteall','regulars',{channel:channel},'',db);
			runSQL('deleteall','songs',{channel:channel},'',db);
			runSQL('deleteall','songcache',{channel:channel},'',db);
			runSQL('deleteall','commands',{channel:channel},'',db);
			runSQL('deleteall','sessions',{twitchUserID:twitchUserID},'',db);

			runSQL('select','defaultCommands',{},'',db).then(results => {
				if (results) {
					for (var i = results.length - 1; i >= 0; i--) {
						var arrayOfPermissions = results[i]['permissionsPerChannel'];
						for (x = 0; x < arrayOfPermissions.length; x++) {
							if (results[i]['permissionsPerChannel'][x]['channel'] == channel) {
								arrayOfPermissions.splice(x,1);
							}
						}
						var dataToUse = {};
						dataToUse["permissionsPerChannel"] = arrayOfPermissions;
						runSQL('update','defaultCommands',{trigger:results[i].trigger},dataToUse,db);
					}
				}
				runSQL('delete','channels',{ChannelName:channel},'',db).then(res => {
					resolve(res);
				});
			});
		});
	})
}

var resetDatabase = function(db) {
	return new Promise((resolve, reject) => {
		var dataToUse = {};
		dataToUse["permissionsPerChannel"] = [];
		Promise.all([
			runSQL('deleteall','songcache',{},'',db),
			runSQL('deleteall','channels',{},'',db),
			runSQL('deleteall','chatusers',{},'',db),
			runSQL('deleteall','sessions',{},'',db),
			runSQL('updateall','defaultCommands',{},dataToUse,db)
		]).then(res => {
			resolve(res);
		}).catch(function(err) {
			log.info(err);
			reject(err);
		});
	})
}

var getAndUpdateTwitchUserIDsForAllUsers = function(db,twitchClient) {
	return new Promise((resolve, reject) => {
		runSQL('select','channels',{},'',db).then(results => {
			for (var i = results.length - 1; i >= 0; i--) {
				var urlStr = "https://api.twitch.tv/kraken/users/" + results[i].ChannelName.slice(1) + "?client_id=" + dbConstants.twitchTestClientID;
				twitchClient.api({
					url: urlStr,
					method: "GET"
				}, function(err, res, body) {
					dataToUse = {};
					dataToUse['twitchUserID'] = body._id;
					runSQL('update','channels',{ChannelName:'#' + body.name},dataToUse,db);
				})
			};
			resolve('Done');
		})
	});
}

module.exports = {
	clearSongCache: clearSongCache,
	resetDatabase: resetDatabase,
	deleteChannel: deleteChannel,
	getAndUpdateTwitchUserIDsForAllUsers: getAndUpdateTwitchUserIDsForAllUsers
};