const log = require('npmlog');
const database = require('./database.js');

class maintenance {

	async clearSongCache(props) {
		const propsForDelete = {
			table:'songcache',
			query:{channel:props.channel}
		}
		return await database.deleteall(propsForDelete);
	}

	async deleteChannel(props) {
		let propsForDelete,propsForSelect;
		propsForSelect = {
			table:'channels',
			query:{ChannelName:props.channel}
		}
		let channelResults = await database.select(propsForSelect);
		const twitchUserID = channelResults[0].twitchUserID;
		propsForDelete = {
			query:{channel:props.channel}
		}
		propsForDelete.table = 'chatusers';
		await database.deleteall(propsForDelete);
		propsForDelete.table = 'regulars';
		await database.deleteall(propsForDelete);
		propsForDelete.table = 'songs';
		await database.deleteall(propsForDelete);
		propsForDelete.table = 'songcache';
		await database.deleteall(propsForDelete);
		propsForDelete.table = 'commands';
		await database.deleteall(propsForDelete);
		propsForDelete.table = 'sessions';
		await database.deleteall(propsForDelete);
		propsForDelete.table = 'chatmessages';
		await database.deleteall(propsForDelete);
		propsForDelete.table = 'commandmessages';
		await database.deleteall(propsForDelete);
		propsForSelect = {
			table:'defaultCommands'
		}
		const results = await database.select(propsForSelect);
		if (results) {
			for (let i = results.length - 1; i >= 0; i--) {
				let arrayOfPermissions = results[i]['permissionsPerChannel'];
				for (let x = 0; x < arrayOfPermissions.length; x++) {
					if (results[i]['permissionsPerChannel'][x]['channel'] == props.channel) {
						arrayOfPermissions.splice(x,1);
					}
				}
				let dataToUse = {};
				dataToUse["permissionsPerChannel"] = arrayOfPermissions;
				const propsForUpdate = {
					table:'defaultCommands',
					query:{trigger:results[i].trigger},
					dataToUse:dataToUse
				}
				await database.update(propsForUpdate);
			}
		}
		propsForDelete = {
			table:'channels',
			query:{ChannelName:props.channel}
		}
		return await database.delete(propsForDelete);
	}

	async getAndUpdateTwitchUserIDsForAllUsers(props) {
		const propsForSelect = {
			table:'channels',
			query:{}
		}
		let results = await database.select(propsForSelect);
		let dbConstants = await database.constants();
		for (let i = results.length - 1; i >= 0; i--) {
			const urlStr = "https://api.twitch.tv/kraken/users/" + results[i].ChannelName.slice(1) + "?client_id=" + dbConstants.twitchTestClientID;
			props.twitchClient.api({
				url: urlStr,
				method: "GET"
			}, function(err, res, body) {
				let dataToUse = {};
				dataToUse['twitchUserID'] = body._id;
				const propsForUpdate = {
					table:'channels',
					query:{ChannelName:'#' + body.name},
					dataToUse:dataToUse
				}
				if (body.name != undefined) {
					database.update(propsForUpdate);
				}
			})
		};
		return 'Done';
	}
}

module.exports = new maintenance();