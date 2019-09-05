const objectId = require('mongodb').ObjectId;
const YouTube = require('youtube-node');
const promisify = require('es6-promisify');
const database = require('./database.js');
const constants = require('./constants.js');
const stats = require('./stats.js');
const functions = require('./functions.js');
const messages = require('./chat-messages.js');
const socket = require('./socket.js');
const cache = require('./cache.js');

/* - - - - - EXPORT FUNCTIONS - - - - - - */

class Songs {

	async songlist(props) {
		let msgToSend;
		if (constants.testMode) {
			msgToSend = 'The song list is available at: ' + constants.testPostURL + '/songs/' + props.channel.slice(1);
		} else {
			msgToSend = 'The song list is available at: ' + constants.postURL + '/songs/' + props.channel.slice(1);
		}
		return functions.buildUserString(props) + msgToSend;
	}

	async songcache(props) {
		let msgToSend;
		if (constants.testMode) {
			msgToSend = 'The song cache is available at: ' + constants.testPostURL + '/songcache/' + props.channel.slice(1);
		} else {
			msgToSend = 'The song cache is available at: ' + constants.postURL + '/songcache/' + props.channel.slice(1);
		}
		return functions.buildUserString(props) + msgToSend;
	}

	async currentSong(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel: props.channel}
		};
		const results = await database.select(propsForSelect);
		let msgToSend;
		if (results) {
			msgToSend = 'The current song is "' + results[0].songTitle + '" and it was requested by ' + results[0].whoRequested;
		} else {
			msgToSend = 'No song currently requested!';
		}
		return functions.buildUserString(props) + msgToSend;
	}

	async lastSong(props) {
		const propsForSelect = {
			table: 'channels',
			query: {ChannelName: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return functions.buildUserString(props) + 'The last song was "' + results[0].lastSong + '"';
		}
	}

	async currentSongID(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return results[0].songID;
		}
		return 'No current song';
	}

	async callVolume(props) {
		if (functions.isNumber(props.messageParams[1])) {
			return this.updateVolume(props);
		}
		return this.volume(props);
	}

	async volume(props) {
		const propsForSelect = {
			table: 'channels',
			query: {ChannelName: props.channel}
		};
		const results = await database.select(propsForSelect);
		const msgToSend = 'The current volume is ' + results[0].volume + '!';
		return functions.buildUserString(props) + msgToSend;
	}

	async updateVolume(props) {
		props.ignoreMessageParamsForUserString = true;
		if (props.messageParams[1] <= 100 && props.messageParams[1] >= 0) {
			const newVolume = Math.round(props.messageParams[1]);
			const dataToUse = {};
			dataToUse.volume = newVolume;
			const propsForUpdate = {
				table: 'channels',
				query: {ChannelName: props.channel},
				dataToUse
			};
			await database.update(propsForUpdate);
			const msgToSend = 'The volume has been updated to ' + newVolume + '!';
			socket.io.in(functions.stripHash(props.channel)).emit('songs', ['volumeupdated', newVolume]);
			return functions.buildUserString(props) + msgToSend;
		}
	}

	async play(props) {
		const dataToUse = {};
		dataToUse.musicStatus = 'play';
		const propsForUpdate = {
			table: 'channels',
			query: {ChannelName: props.channel},
			dataToUse
		};
		await database.update(propsForUpdate);
		const msgToSend = 'Music is now playing!';
		socket.io.in(functions.stripHash(props.channel)).emit('songs', ['statuschange', 'play']);
		return functions.buildUserString(props) + msgToSend;
	}

	async pause(props) {
		const dataToUse = {};
		dataToUse.musicStatus = 'pause';
		const propsForUpdate = {
			table: 'channels',
			query: {ChannelName: props.channel},
			dataToUse
		};
		await database.update(propsForUpdate);
		const msgToSend = 'Music has been paused!';
		socket.io.in(functions.stripHash(props.channel)).emit('songs', ['statuschange', 'pause']);
		return functions.buildUserString(props) + msgToSend;
	}

	async skip(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel: props.channel}
		};
		const results = await database.select(propsForSelect);
		let songToPassToEmit;
		if (results) {
			const songTitle = results[0].songTitle;
			const songToRemove = results[0]._id;
			let dataToUse = {};
			let propsForUpdate = {};
			// If a second song is in the queue, we need to change it's sort order
			if (results[1]) {
				songToPassToEmit = results[1].songID;
				dataToUse = {};
				const songToUpdateSortOrder = results[1]._id;
				dataToUse.sortOrder = 100000;
				propsForUpdate = {
					table: 'songs',
					query: {channel: props.channel, _id: songToUpdateSortOrder},
					dataToUse
				};
				await database.update(propsForUpdate);
			}
			const propsForDelete = {
				table: 'songs',
				query: {channel: props.channel, _id: songToRemove}
			};
			await database.delete(propsForDelete);
			dataToUse = {};
			dataToUse.tempSortVal = 199999;
			dataToUse.lastSong = songTitle;
			propsForUpdate = {
				table: 'channels',
				query: {ChannelName: props.channel},
				dataToUse
			};
			await database.update(propsForUpdate);
			await cache.del(props.channel + 'songlist');
			socket.io.in(functions.stripHash(props.channel)).emit('songs', ['skipped', songToPassToEmit]);
			if (props.skipSocket === undefined) {
				socket.io.in(functions.stripHash(props.channel)).emit('songs', ['twitchSkip', songToPassToEmit]);
			}
			const msgToSend = songTitle + ' has been skipped!';
			return functions.buildUserString(props) + msgToSend;
		}
	}

	async wrongSong(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel: props.channel, whoRequested: props.userstate['display-name']}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const songToRemove = results[results.length - 1]._id;
			const songTitle = results[results.length - 1].songTitle;
			const propsForDelete = {
				table: 'songs',
				query: {channel: props.channel, _id: songToRemove}
			};
			await database.delete(propsForDelete);
			await cache.del(props.channel + 'songlist');
			socket.io.in(functions.stripHash(props.channel)).emit('songs', ['removed']);
			const msgToSend = songTitle + ' has been removed!';
			return functions.buildUserString(props) + msgToSend;
		}
	}

	async removeSongByQueuePosition(props) {
		props.ignoreMessageParamsForUserString = true;
		const propsForSelect = {
			table: 'songs',
			query: {channel: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			let songCount = 0;
			for (const song of results) {
				songCount += 1;
				if (parseInt(props.messageParams[1], 10) === songCount) {
					const songToRemove = song._id;
					const songTitle = song.songTitle;
					const propsForDelete = {
						table: 'songs',
						query: {channel: props.channel, _id: songToRemove}
					};
					await database.delete(propsForDelete);
					await cache.del(props.channel + 'songlist');
					socket.io.in(functions.stripHash(props.channel)).emit('songs', ['removed']);
					const msgToSend = 'The song ' + songTitle + ' has been removed!';
					return functions.buildUserString(props) + msgToSend;
				}
			}
		} else {
			const msgToSend = 'The song you tried to remove doesn\'t exist!';
			return functions.buildUserString(props) + msgToSend;
		}
	}

	async removeMultipleSongsByQueuePosition(props) {
		props.ignoreMessageParamsForUserString = true;
		const songsToRemove = props.messageParams[1].split(',').sort((a, b) => {
			return b - a;
		});
		let atLeastOneSongRemoved = false;
		let msgToSend;
		const propsForSelect = {
			table: 'songs',
			query: {channel: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			for (const songToRemove of songsToRemove) {
				for (let i = 0; i < results.length; i++) {
					if (i === (songToRemove - 1)) {
						const propsForDelete = {
							table: 'songs',
							query: {channel: props.channel, _id: results[i]._id}
						};
						await database.delete(propsForDelete);
						atLeastOneSongRemoved = true;
						break;
					}
				}
			}
			if (atLeastOneSongRemoved) {
				await cache.del(props.channel + 'songlist');
				socket.io.in(functions.stripHash(props.channel)).emit('songs', ['removed']);
				msgToSend = functions.buildUserString(props) + 'Songs removed!';
			} else {
				msgToSend = functions.buildUserString(props) + 'None of the songs you tried to remove exist!';
			}
			return msgToSend;
		}
		return functions.buildUserString(props) + 'There are no songs in the queue, so no songs were removed!';
	}

	async removeSongsByUsername(props) {
		props.ignoreMessageParamsForUserString = true;
		const userToRemove = props.messageParams[1].toLowerCase();
		const propsForDelete = {
			table: 'songs',
			// This can cause issues if someones entire name is contained in another users name, such as, ygtskedog and ygtskedogtest
			// However, without this being a regex - you must type the users display name exactly in order for a match, including caps
			query: {channel: props.channel, whoRequested: {$regex: new RegExp(userToRemove, 'i')}}
		};
		await database.deleteall(propsForDelete);
		await cache.del(props.channel + 'songlist');
		socket.io.in(functions.stripHash(props.channel)).emit('songs', ['removed']);
		return functions.buildUserString(props) + 'Songs removed!';
	}

	async remove(props) {
		if (functions.isNumber(props.messageParams[1])) {
			return this.removeSongByQueuePosition(props);
		} else if (props.messageParams[1].includes(',')) {
			return this.removeMultipleSongsByQueuePosition(props);
		}
		return this.removeSongsByUsername(props);
	}

	async promote(props) {
		props.ignoreMessageParamsForUserString = true;
		const indexToMove = props.messageParams[1];
		let propsForSelect;
		let results;
		let propsForUpdate;
		let dataToUse;
		let numberIndex;
		propsForSelect = {
			table: 'songs',
			query: {channel: props.channel}
		};
		results = await database.select(propsForSelect);
		if (functions.isNumber(indexToMove)) {
			// Song to promote is a number
			numberIndex = parseInt(indexToMove, 10);
		}
		for (let i = 0; i < results.length; i++) {
			if (numberIndex === i + 1 || indexToMove === results[i].songID) {
				const songToPromote = results[i]._id;
				propsForSelect = {
					table: 'channels',
					query: {ChannelName: props.channel}
				};
				results = await database.select(propsForSelect);
				const tempSortVal = results[0].tempSortVal;
				dataToUse = {};
				dataToUse.sortOrder = parseInt(tempSortVal, 10);
				propsForUpdate = {
					table: 'songs',
					query: {channel: props.channel, _id: songToPromote},
					dataToUse
				};
				await database.update(propsForUpdate);
				dataToUse = {};
				dataToUse.tempSortVal = parseInt(tempSortVal - 1, 10);
				propsForUpdate = {
					table: 'channels',
					query: {ChannelName: props.channel},
					dataToUse
				};
				await database.update(propsForUpdate);
				await cache.del(props.channel + 'songlist');
				socket.io.in(functions.stripHash(props.channel)).emit('songs', ['promoted']);
				if (functions.isNumber(indexToMove)) {
					return functions.buildUserString(props) + 'Song #' + indexToMove + ' has been promoted!';
				}
				return functions.buildUserString(props) + 'Song "' + indexToMove + '" has been promoted!';
			}
		}
	}

	async shuffle(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			if (results.length > 1) {
				let songsToShuffle = '';
				for (let i = 0; i < results.length; i++) {
					if (results[i].sortOrder >= 200000) {
						songsToShuffle = songsToShuffle + results[i]._id + ',';
					}
				}
				songsToShuffle = songsToShuffle.substring(0, songsToShuffle.length - 1);
				const arrayOfIDs = songsToShuffle.split(',');
				const shuffledArray = await functions.shuffleArray(arrayOfIDs);
				let i = 0;
				for (const shuffledSongID of shuffledArray) {
					const dataToUse = {};
					dataToUse.sortOrder = parseInt((i + 2) + '00000', 10);
					const propsForUpdate = {
						table: 'songs',
						query: {channel: props.channel, _id: objectId(shuffledSongID)},
						dataToUse
					};
					await database.update(propsForUpdate);
					i++;
				}
				const msgToSend = 'Songs shuffled!';
				await cache.del(props.channel + 'songlist');
				socket.io.in(functions.stripHash(props.channel)).emit('songs', ['shuffled']);
				return functions.buildUserString(props) + msgToSend;
			}
		}
	}

	async requestSongs(props) {
		props.messageParams.splice(0, 1);
		let searchTerm = props.messageParams.join(' ');
		if (searchTerm.slice(-1) === ',') {
			searchTerm = searchTerm.slice(0, -1);
		}
		if (searchTerm.includes(',')) {
			props.songsToAdd = searchTerm.replace(/ /g, '').split(',');
			return this.requestCommaListOfSongs(props);
		}
		if (searchTerm) {
			props.songToAdd = searchTerm;
			return this.requestSingleSong(props);
		}
		return functions.buildUserString(props) + 'To request a song, type the following: !sr youtube URL, video ID, or the song name';
	}

	async requestSongWithNoCache(props) {
		props.ignoreCache = true;
		return this.requestSongs(props);
	}

	async requestSongAndPromote(props) {
		if (props.messageParams.includes(',')) {
			// We can't promote if there is more than one song requested, so return an error?
			return functions.buildUserString(props) + 'You can\'t promote when you request more than one song, either use !sr or use !srp youtube URL, video ID, or the song name';
		}
		props.shouldPromote = true;
		const returnedMessage = await this.requestSongs(props);
		if (returnedMessage.includes('has been added to the queue')) {
			// Song was added to the queue, now call promote on it
			// We can promote by the songID
			const messageParams = ['!promote', props.dataToAdd.songID];
			const fakeUserstate = [];
			fakeUserstate['display-name'] = 'promotedfromweb';
			const propsForPromote = {
				channel: props.channel,
				messageParams,
				userstate: fakeUserstate
			};
			const promotedMessage = await this.promote(propsForPromote);
			if (promotedMessage.includes('has been promoted')) {
				const messageToReturn = returnedMessage.split('has been added to the queue');
				return messageToReturn[0] + ' has been added to the queue and has been promoted!';
			}
			// Song failed to be promoted, return the promotion failed message
			return promotedMessage;
		}
		// Song was not added, show the error as to why
		return returnedMessage;
	}

	async getPlaylistItems(props, apiKey) {
		try {
			const youTube = new YouTube();
			youTube.setKey(apiKey);
			if (props.nextPageToken !== null) {
				youTube.addParam('pageToken', props.nextPageToken);
			}
			const getPlaylistItemsByID = await promisify(youTube.getPlayListsItemsById);
			const result = await getPlaylistItemsByID(props.playlistIDToRequest, 50);
			if (props.playlistItems.length === 0 && props.sendPlaylistMessage !== false) {
				props.messageToSend = 'Gathering playlist data, please wait...';
				await messages.send(props);
			}
			for (let x = 0; x < result.items.length; x++) {
				props.playlistItems.push(result.items[x].snippet);
			}
			props.nextPageToken = result.nextPageToken;
			if (props.nextPageToken) {
				return await this.getPlaylistItems(props, apiKey);
			}
			return props.playlistItems;
		} catch (err) {
			console.log(err);
		}
	}

	async requestPlaylist(props) {
		try {
			props.messageParams.splice(0, 1);
			const dbConstants = await database.constants();
			const _this = this;
			await this.checkIfUserCanAddSong(props);
			props.playlistIDToRequest = await this.getYouTubePlaylistIDFromChatMessage(props);
			props.playlistItems = [];
			await this.getPlaylistItems(props, dbConstants.YouTubeAPIKey);
			const createdArray = [];
			for (let x = 0; x < props.playlistItems.length; x++) {
				createdArray.push(props.playlistItems[x].resourceId.videoId);
			}
			const shuffledSongs = await functions.shuffleArray(createdArray);
			const songNumberLimit = await _this.getChannelSongNumberLimit(props);
			const randomList = shuffledSongs.slice(0, songNumberLimit + 10);
			const finalList = randomList.join(',');
			props.messageParams = ['!sr', finalList];
			return await _this.requestSongs(props);
		} catch (err) {
			props.ignoreMessageParamsForUserString = true;
			if (err === 'failed limit') {
				return functions.buildUserString(props) + 'Song request limit reached, please try again later!';
			} else if (err === 'invalid playlist ID') {
				return functions.buildUserString(props) + 'Invalid Playlist! To request a playlist, type the following: !pr PlaylistID or YouTube URL!';
			}
			return functions.buildUserString(props) + 'Error requesting playlist!';
		}
	}

	/* - - - - - HELPER FUNCTIONS - - - - - - */

	async checkIfSongExists(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel: props.channel, songID: props.songToAdd}
		};
		const res = await database.select(propsForSelect);
		if (res) {
			throw 'failed exists';
		} else {
			return 'doesn\'t exist';
		}
	}

	async checkIfSongExistsInBlacklist(props) {
		const propsForSelect = {
			table: 'songblacklist',
			query: {channel: props.channel, songID: props.songToAdd}
		};
		const res = await database.select(propsForSelect);
		if (res) {
			throw 'failed exists in blacklist';
		} else {
			return 'doesn\'t exist';
		}
	}

	async checkCacheTimeCheck(props) {
		if (props.ignoreCache) {
			// If ignore cache command was called, return good
			return 'cache time is good';
		}
		let propsForSelect;
		propsForSelect = {
			table: 'channels',
			query: {ChannelName: props.channel}
		};
		const res = await database.select(propsForSelect);
		const duplicationCheckDateInMS = res[0].duplicateSongDelay * 3600000;
		propsForSelect = {
			table: 'songcache',
			query: {channel: props.channel, songID: props.songToAdd}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const whenRequested = results[0].whenRequested;
			const currentdate = new Date();
			const currentTimeInMS = currentdate.getTime();
			const timeCheck = currentTimeInMS - duplicationCheckDateInMS;
			if (whenRequested < timeCheck) {
				return 'cache time is good';
			}
			throw 'failed toosoon';
		} else {
			return 'good';
		}
	}

	async getChannelCountry(channel) {
		const propsForSelect = {
			table: 'channels',
			query: {ChannelName: channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return results[0].ChannelCountry;
		}
	}

	async checkCountryRestrictions(props) {
		if (props.YTData[0].blockedRegions && props.YTData[0].blockedRegions.length !== 0) {
			const channelCountry = await this.getChannelCountry(props.channel);
			if (props.YTData[0].blockedRegions.includes(channelCountry)) {
				throw 'failed countryCheck';
			}
		}
		if (props.YTData[0].allowedRegions && props.YTData[0].allowedRegions.length !== 0) {
			const channelCountry = await this.getChannelCountry(props.channel);
			if (props.YTData[0].allowedRegions.includes(channelCountry)) {
				return 'good';
			}
			throw 'failed countryCheck';
		}
		return 'good';
	}

	checkIfSongCanBeEmbeded(props) {
		if (props.YTData[0].isEmbeddable) {
			return 'good';
		}
		throw 'failed embedCheck';
	}

	async checkIfUserCanAddSong(props) {
		const songNumberLimit = await this.getChannelSongNumberLimit(props);
		const numberOfSongsForUser = await this.getNumberOfSongsInQueuePerUser(props);
		if (numberOfSongsForUser < songNumberLimit) {
			return 'good';
		}
		throw 'failed limit';
	}

	async checkIfSongIsTooLong(props) {
		const channelMaxSongLength = await this.getChannelMaxSongLength(props);
		const songLength = props.YTData[0].songLength;
		let minutes;
		if ((songLength.includes('H') || songLength.includes('M'))) {
			minutes = songLength.replace('H', ' ').split('M');
			minutes = minutes[0].split(' ');
			minutes = minutes[0].replace('PT', '');
		} else if (songLength !== 'PT0S') {
			minutes = 0;
		}
		if ((channelMaxSongLength === 0) || ((minutes <= channelMaxSongLength && channelMaxSongLength !== 0) && !(songLength.includes('H')))) {
			return 'good';
		}
		throw 'failed length';
	}

	async addOrUpdateSongCache(props) {
		const currentdate = new Date();
		const propsForSelect = {
			table: 'songcache',
			query: {channel: props.channel, songID: props.dataToAdd.songID}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			const dataToUse = {};
			dataToUse.whenRequested = currentdate;
			if (props.YTData[0].fromYoutube) {
				dataToUse.lastYoutubeDate = currentdate;
			}
			const propsForUpdate = {
				table: 'songcache',
				query: {channel: props.channel, songID: props.dataToAdd.songID},
				dataToUse
			};
			await database.update(propsForUpdate);
			return 'updated cache';
		}
		const propsForAdd = {
			table: 'songcache',
			dataToUse: props.dataToAdd
		};
		await database.add(propsForAdd);
		return 'added to cache';
	}

	async addSongToSonglistAndCache(props) {
		const dataToAdd = {};
		const currentdate = new Date();
		dataToAdd.songID = props.YTData[0].songID;
		dataToAdd.songTitle = props.YTData[0].songTitle;
		dataToAdd.songLength = props.YTData[0].songLength;
		dataToAdd.allowedRegions = props.YTData[0].allowedRegions;
		dataToAdd.blockedRegions = props.YTData[0].blockedRegions;
		dataToAdd.whoRequested = props.userstate['display-name'];
		dataToAdd.channel = props.channel;
		dataToAdd.whenRequested = currentdate;
		dataToAdd.lastYoutubeDate = currentdate;
		const newSongSortOrder = await this.getNewSongSortOrder(props);
		dataToAdd.sortOrder = newSongSortOrder;
		props.dataToAdd = dataToAdd;
		const propsForAdd = {
			table: 'songs',
			dataToUse: dataToAdd
		};
		await Promise.all([
			this.addOrUpdateSongCache(props),
			database.add(propsForAdd)
		]).catch(err => {
			throw err;
		});
		const propsForStats = {
			channel: props.channel,
			userstate: props.userstate,
			statFieldToUpdate: 'numberOfSongRequests'
		};
		stats.updateUserCounter(propsForStats);
		return 'added';
	}

	async addSongToBlacklist(props) {
		const dataToAdd = {};
		const currentdate = new Date();
		dataToAdd.songID = props.YTData[0].songID;
		dataToAdd.songTitle = props.YTData[0].songTitle;
		dataToAdd.songLength = props.YTData[0].songLength;
		dataToAdd.allowedRegions = props.YTData[0].allowedRegions;
		dataToAdd.blockedRegions = props.YTData[0].blockedRegions;
		dataToAdd.whoRequested = props.userstate['display-name'];
		dataToAdd.channel = props.channel;
		dataToAdd.whenRequested = currentdate;
		const propsForAdd = {
			table: 'songblacklist',
			dataToUse: dataToAdd
		};
		await database.add(propsForAdd);
		return 'added';
	}

	async addSongWrapper(props) {
		try {
			props.YTData = await this.getYouTubeSongData(props);
			await this.checkIfUserCanAddSong(props);
			await this.checkIfSongExists(props);
			await this.checkIfSongExistsInBlacklist(props);
			await this.checkCacheTimeCheck(props);
			await this.checkCountryRestrictions(props);
			await this.checkIfSongIsTooLong(props);
			await this.checkIfSongCanBeEmbeded(props);
			await this.addSongToSonglistAndCache(props);
			props.songStatusArray.push('PASSED');
			return 'Passed';
		} catch (err) {
			props.songStatusArray.push(err);
			return err;
		}
	}

	async countInArray(array, what) {
		return array.filter(item => item === what).length;
	}

	async buildMessageToSendForAddSong(props) {
		const userStr = functions.buildUserString(props);
		let msgToSend;
		const numberOfSongsRequested = props.songStatusArray.length;
		const numberOfAddedSongs = await this.countInArray(props.songStatusArray, 'PASSED');
		const propsForErrorMessage = {
			numberOfTooSoon: await this.countInArray(props.songStatusArray, 'failed toosoon'),
			numberOfLength: await this.countInArray(props.songStatusArray, 'failed length'),
			numberOfExists: await this.countInArray(props.songStatusArray, 'failed exists'),
			numberOfExistsInBlacklist: await this.countInArray(props.songStatusArray, 'failed exists in blacklist'),
			numberOfFailedIDs: await this.countInArray(props.songStatusArray, 'failed getYouTubeSongData'),
			unavailableInCountry: await this.countInArray(props.songStatusArray, 'failed countryCheck'),
			numberOfFailedEmbed: await this.countInArray(props.songStatusArray, 'failed embedCheck'),
			YTData: props.YTData,
			numberOfSongsRequested
		};
		if (numberOfAddedSongs) {
			const numberOfSongsPerChannel = await this.getChannelSongNumberLimit(props);
			if (numberOfSongsRequested === numberOfAddedSongs || numberOfAddedSongs === numberOfSongsPerChannel) {
				// Only triggers if all songs requested got added
				if (numberOfAddedSongs === 1) {
					// Only one song requested, and added
					const numberOfSongsInQueue = await this.getNumberOfSongsInQueue(props);
					const amountOfTimeInQueue = await this.getTimeInQueue(props);
					if (amountOfTimeInQueue !== '0 minutes') {
						return userStr + 'The song ' + props.YTData[0].songTitle + ' has been added to the queue as #' + numberOfSongsInQueue + '! It will be about ' + amountOfTimeInQueue + ' until it plays';
					}
					return userStr + 'The song ' + props.YTData[0].songTitle + ' has been added to the queue as #' + numberOfSongsInQueue;
				}
				// More than one song requested, and all added
				return userStr + numberOfAddedSongs + ' songs added';
			}
			if (props.songStatusArray.includes('failed limit')) {
				if (numberOfAddedSongs > 1) {
					return userStr + numberOfAddedSongs + ' songs were added, but you reached the limit';
				} else if (numberOfAddedSongs > 0) {
					return userStr + numberOfAddedSongs + ' song was added, but you reached the limit';
				}
				return userStr + 'Song request limit reached, please try again later';
			}
			if (numberOfAddedSongs > 1) {
				msgToSend = numberOfAddedSongs + ' songs were added, but ';
			} else {
				msgToSend = numberOfAddedSongs + ' song was added, but ';
			}
			const res = await this.getFailedMessages(propsForErrorMessage);
			for (let i = 0; i < res.length; i++) {
				if (i === 0) {
					msgToSend += res[i];
				} else if (i === res.length - 1) {
					msgToSend = msgToSend + ', and ' + res[i];
				} else {
					msgToSend = msgToSend + ', ' + res[i];
				}
			}
			return userStr + msgToSend;
		}
		if (props.songStatusArray.includes('failed limit')) {
			return userStr + 'Song request limit reached, please try again later';
		}
		msgToSend = numberOfSongsRequested > 1 ? 'No songs were added because ' : '';
		const res = await this.getFailedMessages(propsForErrorMessage);
		for (let i = 0; i < res.length; i++) {
			if (i === 0) {
				msgToSend += res[i];
			} else if (i === res.length - 1) {
				msgToSend = msgToSend + ', and ' + res[i];
			} else {
				msgToSend = msgToSend + ', ' + res[i];
			}
		}
		return userStr + msgToSend;
	}

	async requestSingleSong(props) {
		props.ignoreMessageParamsForUserString = true;
		props.songStatusArray = [];
		try {
			const youTubeID = await this.getYouTubeVideoIDFromChatMessage(props.songToAdd);
			props.songToAdd = youTubeID;
			await this.addSongWrapper(props);
			await cache.del(props.channel + 'songlist');
			await cache.del(props.channel + 'songcache');
			socket.io.in(functions.stripHash(props.channel)).emit('songs', ['added']);
			return await this.buildMessageToSendForAddSong(props) + '!';
		} catch (err) {
			return await functions.buildUserString(props) + err + '!';
		}
	}

	async requestRelatedSongs(props) {
		props.messageParams.splice(0, 1);
		if (props.messageParams.length === 0) {
			return await functions.buildUserString(props) + 'To request related songs, use !srr URL, Song Title, or songID';
		}
		const lastParam = props.messageParams[props.messageParams.length - 1];
		let numberOfSongsToGet;
		let searchTerm;
		if (functions.isNumber(lastParam)) {
			// Last part of message is a number, try requesting that number of songs
			// Number has to be less than 50 or else that bones the YT API
			if (lastParam < 50) {
				numberOfSongsToGet = lastParam;
			} else {
				numberOfSongsToGet = 49;
			}
			// Remove the last item from the array, and join to get the correct search string
			props.messageParams.splice(-1, 1);
			searchTerm = props.messageParams.join(' ');
		} else {
			// No number of songs passed, pull max number of requestable songs for this channel
			numberOfSongsToGet = await this.getChannelSongNumberLimit(props);
			numberOfSongsToGet = parseInt(numberOfSongsToGet, 10) + 1;
			searchTerm = props.messageParams.join(' ');
		}
		props.ignoreMessageParamsForUserString = true;
		props.songStatusArray = [];
		try {
			const youTubeID = await this.getYouTubeVideoIDFromChatMessage(searchTerm);
			const relatedSongs = await this.getRelatedSongs(youTubeID, numberOfSongsToGet);
			if (relatedSongs.items.length > 0) {
				let songsToRequest = '';
				for (const song in relatedSongs.items) {
					if (Object.prototype.hasOwnProperty.call(relatedSongs.items, song)) {
						songsToRequest += relatedSongs.items[song].id.videoId + ',';
					}
				}
				if (songsToRequest) {
					// Remove extra , from list
					songsToRequest = songsToRequest.substring(0, songsToRequest.length - 1);
					props.songsToAdd = songsToRequest.replace(/ /g, '').split(',');
					return this.requestCommaListOfSongs(props);
				}
			}
			return await functions.buildUserString(props) + 'There were no related songs!';
		} catch (err) {
			return await functions.buildUserString(props) + 'There were no related songs, or that is an invalid URL, song title, songID!';
		}
	}

	async requestCommaListOfSongs(props) {
		props.ignoreMessageParamsForUserString = true;
		props.songStatusArray = [];
		let numberOfSongsNotFound = 0;
		for (let x = 0; x <= props.songsToAdd.length - 1; x++) {
			try {
				const youTubeID = await this.getYouTubeVideoIDFromChatMessage(props.songsToAdd[x]);
				props.songToAdd = youTubeID;
				const returnedVal = await this.addSongWrapper(props);
				if (returnedVal === 'failed limit') {
					break;
				}
			} catch (err) {
				// This is only hit if there is a problem finding a song that was requested
				numberOfSongsNotFound++;
				console.log(err);
				break;
			}
		}
		await cache.del(props.channel + 'songlist');
		await cache.del(props.channel + 'songcache');
		socket.io.in(functions.stripHash(props.channel)).emit('songs', ['added']);
		if (numberOfSongsNotFound > 0) {
			if (numberOfSongsNotFound === 1) {
				return await this.buildMessageToSendForAddSong(props) + ', and ' + numberOfSongsNotFound + ' song was not found!';
			}
			return await this.buildMessageToSendForAddSong(props) + ', and ' + numberOfSongsNotFound + ' songs were not found!';
		}
		return await this.buildMessageToSendForAddSong(props) + '!';
	}

	async getChannelSongNumberLimit(props) {
		const propsForSelect = {
			table: 'channels',
			query: {ChannelName: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return results[0].songNumberLimit;
		}
		throw 'failed getChannelSongNumberLimit';
	}

	async getChannelMaxSongLength(props) {
		const propsForSelect = {
			table: 'channels',
			query: {ChannelName: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return results[0].maxSongLength;
		}
		throw 'failed getChannelMaxSongLength';
	}

	async getNumberOfSongsInQueue(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			return results.length;
		}
		return 0;
	}

	async getTimeInQueue(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel: props.channel}
		};
		const results = await database.select(propsForSelect);
		let totalTime = 0;
		if (results) {
			for (const song in results) {
				if (props.songToAdd !== results[song].songID) {
					let minutes;
					const songLength = results[song].songLength;
					if ((songLength.includes('H') || songLength.includes('M'))) {
						minutes = songLength.replace('H', ' ').split('M');
						minutes = minutes[0].split(' ');
						minutes = minutes[0].replace('PT', '');
					} else if (songLength !== 'PT0S') {
						minutes = 0;
					}
					totalTime += parseInt(minutes, 10);
				}
			}
		}
		if (totalTime > 60) {
			totalTime = (totalTime / 60).toFixed(2) + ' hours';
		} else {
			totalTime += ' minutes';
		}
		return totalTime;
	}

	async getNumberOfSongsInQueuePerUser(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			let numberOfSongsPerUser = 0;
			for (let i = 0; i < results.length; i++) {
				if (results[i].whoRequested.toLowerCase() === props.userstate['display-name'].toLowerCase()) {
					numberOfSongsPerUser++;
				}
				if (i === (results.length - 1)) {
					return numberOfSongsPerUser;
				}
			}
		}
		return 0;
	}

	async getResultsFromCache(props) {
		const propsForCacheSelect = {
			table: 'songcache',
			query: {songID: props.songToAdd, channel: props.channel}
		};
		const resultsFromCache = await database.select(propsForCacheSelect);
		if (resultsFromCache) {
			// Only pull cache results if they are less than a month old
			const currentDateMinus30 = new Date(new Date().getTime() + (-30 * 24 * 60 * 60 * 1000));
			if (resultsFromCache[0].lastYoutubeDate > currentDateMinus30) {
				const propsForReturn = [{
					songID: props.songToAdd,
					songTitle: resultsFromCache[0].songTitle,
					songLength: resultsFromCache[0].songLength,
					isEmbeddable: true,
					allowedRegions: [],
					blockedRegions: []
				}];
				if (resultsFromCache[0].allowedRegions) {
					propsForReturn.allowedRegions = resultsFromCache[0].allowedRegions;
				}
				if (resultsFromCache[0].blockedRegions) {
					propsForReturn.blockedRegions = resultsFromCache[0].blockedRegions;
				}
				return propsForReturn;
			}
		}
	}

	async getResultsFromYouTube(props, youTube) {
		// Song not in cache, get info from YouTube instead
		const getById = await promisify(youTube.getById);
		const result = await getById(props.songToAdd);
		if (result) {
			if (result.items[0] && (result.pageInfo.totalResults !== 0)) {
				const videoTitle = result.items[0].snippet.title;
				const isEmbeddable = result.items[0].status.embeddable;
				const videoLength = result.items[0].contentDetails.duration;
				let allowedRegions = [];
				let blockedRegions = [];
				const contentDetails = result.items[0].contentDetails;
				if (Object.prototype.hasOwnProperty.call(contentDetails, 'regionRestriction')) {
					if (Object.prototype.hasOwnProperty.call(contentDetails.regionRestriction, 'allowed')) {
						allowedRegions = contentDetails.regionRestriction.allowed;
					}
					if (Object.prototype.hasOwnProperty.call(contentDetails.regionRestriction, 'blocked')) {
						blockedRegions = contentDetails.regionRestriction.blocked;
					}
				}
				return [{
					songID: props.songToAdd,
					songTitle: videoTitle,
					songLength: videoLength,
					isEmbeddable,
					allowedRegions,
					blockedRegions,
					fromYoutube: true
				}];
			}
		}
	}

	async getYouTubeSongData(props) {
		const dbConstants = await database.constants();
		const youTube = new YouTube();
		youTube.setKey(dbConstants.YouTubeAPIKey);
		if (props.songToAdd) {
			if (props.songToAdd.length === 11 && !props.songToAdd.includes(' ')) {
				// Try pulling data from songcache first, instead of always kicking out to YouTube
				// This would mean that the title may not match if it gets updated
				const resultsFromCache = await this.getResultsFromCache(props);
				if (resultsFromCache) {
					return resultsFromCache;
				}
				const resultsFromYouTube = await this.getResultsFromYouTube(props, youTube);
				if (resultsFromYouTube) {
					return resultsFromYouTube;
				}
			}
		}
		throw 'failed getYouTubeSongData';
	}

	async getRelatedSongs(songID, numberToGet) {
		const dbConstants = await database.constants();
		const youTube = new YouTube();
		youTube.setKey(dbConstants.YouTubeAPIKey);
		const related = await promisify(youTube.related);
		return related(songID, numberToGet);
	}

	getYouTubePlaylistIDFromChatMessage(props) {
		const passedInfo = props.messageParams.join(' ');
		if (passedInfo !== '') {
			if ((passedInfo.length === 34 || passedInfo.length === 24 || passedInfo.length === 15 || passedInfo.length === 13) && !passedInfo.includes(' ')) {
				return passedInfo;
			} else if (passedInfo.includes('http')) {
				const tempSplit = passedInfo.split('?');
				const query = functions.parseQuery(tempSplit[1]);
				const playlistID = query.list;
				if (playlistID !== undefined) {
					if (playlistID.length === 34 || playlistID.length === 24 || playlistID.length === 15 || playlistID.length === 13) {
						return playlistID;
					}
				}
			} else if (passedInfo.indexOf('list=') > -1) {
				const query = functions.parseQuery(passedInfo);
				const playlistID = query.list;
				return playlistID;
			}
		}
		throw 'invalid playlist ID';
	}

	async getYouTubeVideoIDFromChatMessage(songToAdd) {
		let vars;
		let finalVideoID;
		let query;
		let tempSplit;
		let videoID;
		if (songToAdd.length === 11 && !songToAdd.includes(' ')) {
			return songToAdd;
		} else if (songToAdd.includes('http')) {
			if (songToAdd.includes('://youtu.be')) {
				vars = songToAdd.split('/');
				finalVideoID = vars[3];
			}
			if (songToAdd.includes('?') && songToAdd.includes('v')) {
				tempSplit = songToAdd.split('?');
				query = functions.parseQuery(tempSplit[1]);
				finalVideoID = query.v;
			} else {
				vars = songToAdd.split('/');
				finalVideoID = vars[3];
			}
			if (finalVideoID) {
				if (finalVideoID.length === 11) {
					return finalVideoID;
				}
			}
			throw 'Invalid URL! To request a song, type the following: !sr youtube URL, video ID, or the song name';
		} else if (songToAdd.indexOf('v=') > -1) {
			tempSplit = songToAdd.split('?');
			query = functions.parseQuery(tempSplit[1]);
			videoID = query.v;
			return videoID;
		} else {
			const dbConstants = await database.constants();
			const youTube = new YouTube();
			youTube.setKey(dbConstants.YouTubeAPIKey);
			const youtubeSearch = await promisify(youTube.search);
			const result = await youtubeSearch(songToAdd, 2);
			const numberOfResults = result.pageInfo.totalResults;
			if (numberOfResults > 0) {
				videoID = result.items[0].id.videoId;
				if (videoID) {
					return videoID;
				}
				// VideoID was not defined in the first result, so pull the second one
				// This happens when the search returns a channel first, rather than a video
				videoID = result.items[1].id.videoId;
				if (videoID) {
					return videoID;
				}
				throw 'Song not found! To request a song, type the following: !sr youtube URL, video ID, or the song name';
			} else {
				throw 'Song not found! To request a song, type the following: !sr youtube URL, video ID, or the song name';
			}
		}
	}

	getFailedMessages(props) {
		const msgArray = [];
		if (props.numberOfTooSoon) {
			if (props.numberOfSongsRequested === 1 && props.numberOfTooSoon === 1) {
				// Only 1 song requested and it was too recent
				msgArray.push('The song ' + props.YTData[0].songTitle + ' was played too recently');
			}
			if (props.numberOfSongsRequested > 1 && props.numberOfTooSoon === 1) {
				// Only 1 song was requested too recently, but more than one song was requested
				msgArray.push(props.numberOfTooSoon + ' song was played too recently');
			}
			if (props.numberOfTooSoon > 1) {
				// More than one song was requested too recently
				msgArray.push(props.numberOfTooSoon + ' songs were played too recently');
			}
		}
		if (props.numberOfLength) {
			if (props.numberOfSongsRequested === 1 && props.numberOfLength === 1) {
				// Only 1 song was requested and it was too long
				msgArray.push('The song ' + props.YTData[0].songTitle + ' is too long');
			}
			if (props.numberOfSongsRequested > 1 && props.numberOfLength === 1) {
				// Only 1 song was too long, but more than one song was requested
				msgArray.push(props.numberOfLength + ' song is too long');
			}
			if (props.numberOfLength > 1) {
				// More than one song was too long
				msgArray.push(props.numberOfLength + ' songs are too long');
			}
		}
		if (props.numberOfExists) {
			if (props.numberOfSongsRequested === 1 && props.numberOfExists === 1) {
				msgArray.push('The song ' + props.YTData[0].songTitle + ' already exists in the queue');
			}
			if (props.numberOfSongsRequested > 1 && props.numberOfExists === 1) {
				msgArray.push(props.numberOfExists + ' song already exists');
			}
			if (props.numberOfExists > 1) {
				msgArray.push(props.numberOfExists + ' songs already exist');
			}
		}
		if (props.numberOfExistsInBlacklist) {
			if (props.numberOfSongsRequested === 1 && props.numberOfExistsInBlacklist === 1) {
				msgArray.push('The song ' + props.YTData[0].songTitle + ' is blacklisted');
			}
			if (props.numberOfSongsRequested > 1 && props.numberOfExistsInBlacklist === 1) {
				msgArray.push(props.numberOfExistsInBlacklist + ' song is blacklisted');
			}
			if (props.numberOfExistsInBlacklist > 1) {
				msgArray.push(props.numberOfExistsInBlacklist + ' songs are blacklisted');
			}
		}
		if (props.unavailableInCountry) {
			if (props.numberOfSongsRequested === 1 && props.unavailableInCountry === 1) {
				msgArray.push('The song ' + props.YTData[0].songTitle + ' is unavailable for playback in your country');
			}
			if (props.numberOfSongsRequested > 1 && props.unavailableInCountry === 1) {
				msgArray.push(props.unavailableInCountry + ' song was unavailable for playback in your country');
			}
			if (props.unavailableInCountry > 1) {
				msgArray.push(props.unavailableInCountry + ' songs were unavailable for playback in your country');
			}
		}
		if (props.numberOfFailedEmbed) {
			if (props.numberOfSongsRequested === 1 && props.numberOfFailedEmbed === 1) {
				msgArray.push('The song ' + props.YTData[0].songTitle + ' is not allowed to be embedded');
			}
			if (props.numberOfSongsRequested > 1 && props.numberOfFailedEmbed === 1) {
				msgArray.push(props.numberOfFailedEmbed + ' song was not allowed to be embedded');
			}
			if (props.numberOfFailedEmbed > 1) {
				msgArray.push(props.numberOfFailedEmbed + ' songs were not allowed to be embedded');
			}
		}
		if (props.numberOfFailedIDs) {
			if (props.numberOfSongsRequested === 1 && props.numberOfFailedIDs === 1) {
				msgArray.push('Invalid song ID');
			}
			if (props.numberOfSongsRequested > 1 && props.numberOfFailedIDs === 1) {
				msgArray.push(props.numberOfFailedIDs + ' ID was invalid');
			}
			if (props.numberOfFailedIDs > 1) {
				msgArray.push(props.numberOfFailedIDs + ' IDs were invalid');
			}
		}
		return msgArray;
	}

	async getNewSongSortOrder(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel: props.channel}
		};
		const results = await database.select(propsForSelect);
		if (results) {
			// Check sort order - determines the last song in the queue (largestsortorder) and adds to that number
			let largestSortOrder = 0;
			for (let i = 0; i < results.length; i++) {
				if (largestSortOrder === 0) {
					largestSortOrder = results[i].sortOrder;
				}
				if (largestSortOrder < results[i].sortOrder) {
					largestSortOrder = results[i].sortOrder;
				}
			}
			return parseInt(largestSortOrder + 100000, 10);
		}
		return 100000;
	}
}

module.exports = new Songs();
