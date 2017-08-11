const database = require('./database.js');

class messages {

	async mute(props) {
		try {
			const propsForSelect = {
				table:'channels',
				query:{ChannelName:props.channel}
			}
			const results = await database.select(propsForSelect);
			if (results) {
				let dataToUse = {};
				dataToUse["isSilent"] = true;
				const propsForUpdate = {
					table:'channels',
					query:{ChannelName:props.channel},
					dataToUse:dataToUse
				}
				await database.update(propsForUpdate)
				return 'Bot has been muted!';
			}
		} catch (err) {
			throw err;
		}
	}

	async unmute(props) {
		try {
			const propsForSelect = {
				table:'channels',
				query:{ChannelName:props.channel}
			}
			const results = await database.select(propsForSelect);
			if (results) {
				var dataToUse = {};
				dataToUse["isSilent"] = false;
				const propsForUpdate = {
					table:'channels',
					query:{ChannelName:props.channel},
					dataToUse:dataToUse
				}
				await database.update(propsForUpdate)
				return 'Bot has been unmuted!';
			}
		} catch (err) {
			throw err;
		}
	}

	async send(props) {
		try {
			const propsForSelect = {
				table:'channels',
				query:{ChannelName:props.channel}
			}
			const results = await database.select(propsForSelect);
			if (results[0].isSilent || props.isWhisper) {
				props.twitchClient.whisper(props.userstate['username'], props.messageToSend);
			} else {
				props.twitchClient.say(props.channel, props.messageToSend);
			};
		} catch (err) {
			throw err;
		}
	}
}

module.exports = new messages();