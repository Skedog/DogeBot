var mongo = require('mongodb').MongoClient;
var runSQL = require('./runSQL.js');

const mongoConfig = JSON.parse(process.env.APP_CONFIG);
const dbStr = 'mongodb://' + mongoConfig.mongo.user + ':' + process.env.MONGO_PASSWORD + '@' + mongoConfig.mongo.hostString;

var connect = function() {
	return new Promise((resolve, reject) => {
		mongo.connect(dbStr, function(err, db) {
			if (err) {
				reject(err)
			} else {
				resolve(db)
			}
		})
	})
}

var getDbConstants = function(db) {
	return new Promise((resolve, reject) => {
		runSQL('select','globalConstants',{},'',db).then(results => {
			var dbConstants = {
				twitchOauthPass:results[0].twitchOauthPass,
				twitchClientID:results[0].twitchClientID,
				twitchTestClientID:results[0].twitchTestClientID,
				YouTubeAPIKey:results[0].YouTubeAPIKey,
				discordAPIKey:results[0].discordAPIKey
			};
			resolve(dbConstants);
		}).catch(function(err) {
			reject(err);
		});
	})
}

var start = function() {
	return new Promise((resolve, reject) => {
		connect().then(db => {
			getDbConstants(db).then(dbConstants => {
				resolve([db,dbConstants])
			}).catch(function(err) {
				reject(err)
			});
		}).catch(function(err) {
			reject(err)
		});
	})
}

module.exports = {
	connect: connect,
	getDbConstants: getDbConstants,
	start: start
};