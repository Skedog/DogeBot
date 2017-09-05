const database = require('./database.js');
const constants = require('./constants.js');
const functions = require('./functions.js');
const socket = require('./socket.js');
const songs = require('./songs.js');
const cache = require('./cache.js');

class Blacklist {

	async call(props) {
		switch (props.messageParams[1]) {
			case 'add':
				return this.add(props);
			case 'delete':
			case 'remove':
				return this.delete(props);
			default:
				return this.buildBlacklistLink(props);
		}
	}

	buildBlacklistLink(props) {
		const msgStr = 'The song blacklist for this channel is available here: ';
		let msgURL;
		if (constants.testMode) {
			msgURL = constants.testPostURL + '/blacklist/' + props.channel.slice(1);
		} else {
			msgURL = constants.postURL + '/blacklist/' + props.channel.slice(1);
		}
		return functions.buildUserString(props) + msgStr + msgURL;
	}

	async add(props) {
		if (props.messageParams[2] === 'current') {
			return this.addcurrent(props);
		}
		props.ignoreMessageParamsForUserString = true;
		props.messageParams.splice(0, 2);
		const searchTerm = props.messageParams.join(' ');
		props.songToAdd = searchTerm;
		const youTubeID = await songs.getYouTubeVideoIDFromChatMessage(props.songToAdd);
		props.songToAdd = youTubeID;
		props.YTData = await songs.getYouTubeSongData(props);
		try {
			await songs.checkIfSongExistsInBlacklist(props);
			await songs.addSongToBlacklist(props);
			await cache.del(props.channel + 'blacklist');
			socket.io.in(functions.stripHash(props.channel)).emit('blacklist', ['added']);
			return functions.buildUserString(props) + 'The song ' + props.YTData[0].songTitle + ' has been added to the blacklist!';
		} catch (err) {
			if (err === 'failed exists in blacklist') {
				return functions.buildUserString(props) + 'The song ' + props.YTData[0].songTitle + ' already exists in the blacklist!';
			}
			return functions.buildUserString(props) + 'Failed to add the song ' + props.YTData[0].songTitle + ' to the blacklist!';
		}
	}

	async addcurrent(props) {
		props.ignoreMessageParamsForUserString = true;
		props.songToAdd = await songs.currentSongID(props);
		props.YTData = await songs.getYouTubeSongData(props);
		try {
			await songs.checkIfSongExistsInBlacklist(props);
			await songs.addSongToBlacklist(props);
			await cache.del(props.channel + 'blacklist');
			socket.io.in(functions.stripHash(props.channel)).emit('blacklist', ['added']);
			await songs.skip(props);
			return functions.buildUserString(props) + 'The song ' + props.YTData[0].songTitle + ' has been added to the blacklist!';
		} catch (err) {
			if (err === 'failed exists in blacklist') {
				return functions.buildUserString(props) + 'The song ' + props.YTData[0].songTitle + ' already exists in the blacklist!';
			}
			return functions.buildUserString(props) + 'Failed to add the song ' + props.YTData[0].songTitle + ' to the blacklist!';
		}
	}

	async delete(props) {
		props.ignoreMessageParamsForUserString = true;
		props.messageParams.splice(0, 2);
		const searchTerm = props.messageParams.join(' ');
		props.songToAdd = searchTerm;
		const youTubeID = await songs.getYouTubeVideoIDFromChatMessage(props.songToAdd);
		props.songToAdd = youTubeID;
		props.YTData = await songs.getYouTubeSongData(props);
		const propsForSelect = {
			table: 'songblacklist',
			query: {channel: props.channel, songID: props.songToAdd}
		};
		const songExistence = await database.select(propsForSelect);
		if (songExistence) {
			await database.delete(propsForSelect);
			await cache.del(props.channel + 'blacklist');
			socket.io.in(functions.stripHash(props.channel)).emit('blacklist', ['removed']);
			return functions.buildUserString(props) + 'The song ' + props.YTData[0].songTitle + ' has been removed from the blacklist!';
		}
		return functions.buildUserString(props) + 'The song ' + props.YTData[0].songTitle + ' doesn\'t exist in the blacklist!';
	}
}

module.exports = new Blacklist();
