var runSQL = require('./runSQL.js');
module.exports = function(db,token,twitchUserID) {
	return new Promise((resolve, reject) => {
		if (token) {
			twitchUserID = parseInt(twitchUserID, 10);
			runSQL('select','sessions',{token:token,twitchUserID:twitchUserID},'',db).then(results => {
				if (results) {
					resolve(true);
				} else {
					reject('not logged in');
				}
			});
		} else {
			reject('not logged in');
		}
	});
};