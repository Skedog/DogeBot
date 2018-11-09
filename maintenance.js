const database = require('./database.js');

class Maintenance {

	async clearSongCache(props) {
		const propsForDelete = {
			table: 'songcache',
			query: {channel: props.channel}
		};
		return database.deleteall(propsForDelete);
	}

	async deleteChannel(props) {
		let propsForDelete = {
			query: {channel: props.channel}
		};
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
		const propsForSelect = {
			table: 'defaultCommands'
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const updateResults = [];
			for (let i = results.length - 1; i >= 0; i--) {
				const arrayOfPermissions = results[i].permissionsPerChannel;
				const arrayOfPoints = results[i].pointsPerChannel;
				for (let x = 0; x < arrayOfPermissions.length; x++) {
					if (results[i].permissionsPerChannel[x].channel === props.channel) {
						arrayOfPermissions.splice(x, 1);
					}
				}
				for (let y = 0; y < arrayOfPoints.length; y++) {
					if (results[i].pointsPerChannel[y].channel === props.channel) {
						arrayOfPoints.splice(y, 1);
					}
				}
				const dataToUse = {};
				dataToUse.permissionsPerChannel = arrayOfPermissions;
				dataToUse.pointsPerChannel = arrayOfPoints;
				const propsForUpdate = {
					table: 'defaultCommands',
					query: {trigger: results[i].trigger},
					dataToUse
				};
				updateResults.push(database.update(propsForUpdate));
			}
			await Promise.all(updateResults);
		}
		propsForDelete = {
			table: 'channels',
			query: {ChannelName: props.channel}
		};
		return database.delete(propsForDelete);
	}

	async getAndUpdateTwitchUserIDsForAllUsers(props) {
		const propsForSelect = {
			table: 'channels',
			query: {}
		};
		const results = await database.select(propsForSelect);
		const dbConstants = await database.constants();
		for (let i = results.length - 1; i >= 0; i--) {
			const urlStr = 'https://api.twitch.tv/kraken/users/' + results[i].ChannelName.slice(1) + '?client_id=' + dbConstants.twitchTestClientID;
			props.twitchClient.api({
				url: urlStr,
				method: 'GET'
			}, (err, res, body) => {
				if (err) {
					console.log(err);
					return;
				}
				const dataToUse = {};
				dataToUse.twitchUserID = body._id;
				const propsForUpdate = {
					table: 'channels',
					query: {ChannelName: '#' + body.name},
					dataToUse
				};
				if (body.name !== undefined) {
					database.update(propsForUpdate);
				}
			});
		}
		return 'Done';
	}
}

module.exports = new Maintenance();
