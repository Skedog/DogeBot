const database = require('./database.js');
const constants = require('./constants.js');
const stats = require('./stats.js');
const functions = require('./functions.js');
const request = require('async-request');
const promisify = require("es6-promisify");
const YouTube = require('youtube-node');
const ObjectId = require('mongodb').ObjectId;
const messages = require('./chat-messages.js');
const socket = require('./socket.js');
const ypi = require('youtube-playlist-info');

/* - - - - - EXPORT FUNCTIONS - - - - - - */

class songs {

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
			query: {channel:props.channel}
		}
		const results = await database.select(propsForSelect);
		let msgToSend;
		if (results) {
			msgToSend = 'The current song is "' + results[0]['songTitle'] + '" and it was requested by ' + results[0]['whoRequested'];
		} else {
			msgToSend = 'No song currently requested!';
		}
		return functions.buildUserString(props) + msgToSend;
	}

	async callVolume(props) {
		if (functions.isNumber(props.messageParams[1])) {
			return await this.updateVolume(props);
		} else {
			return await this.volume(props);
		}
	}

	async volume(props) {
		const propsForSelect = {
			table: 'channels',
			query: {ChannelName:props.channel}
		}
		const results = await database.select(propsForSelect);
		const msgToSend = 'The current volume is: ' + results[0]['volume'];
		return functions.buildUserString(props) + msgToSend;
	}

	async updateVolume(props) {
		props.ignoreMessageParamsForUserString = true;
		if (props.messageParams[1] <= 100 && props.messageParams[1] >= 0) {
			const newVolume = Math.round(props.messageParams[1]);
			const dataToUse = {};
			dataToUse["volume"] = newVolume;
			const propsForUpdate = {
				table: 'channels',
				query: {ChannelName:props.channel},
				dataToUse: dataToUse
			}
			await database.update(propsForUpdate);
			const msgToSend = 'The volume has been updated to ' + newVolume + '!';
			socket.emit('songs',['volumeupdated',newVolume]);
			return functions.buildUserString(props) + msgToSend;
		}
	}

	async play(props) {
		let dataToUse = {};
		dataToUse["musicStatus"] = 'play';
		const propsForUpdate = {
			table: 'channels',
			query: {ChannelName:props.channel},
			dataToUse: dataToUse
		};
		await database.update(propsForUpdate);
		const msgToSend = 'Music is now playing!';
		socket.emit('songs',['statuschange','play']);
		return functions.buildUserString(props) + msgToSend;
	}

	async pause(props) {
		let dataToUse = {};
		dataToUse["musicStatus"] = 'pause';
		const propsForUpdate = {
			table: 'channels',
			query: {ChannelName:props.channel},
			dataToUse: dataToUse
		};
		await database.update(propsForUpdate);
		const msgToSend = 'Music has been paused!';
		socket.emit('songs',['statuschange','pause']);
		return functions.buildUserString(props) + msgToSend;
	}

	async skip(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel:props.channel}
		}
		const results = await database.select(propsForSelect);
		let songToPassToEmit;
		if (results) {
			const songTitle = results[0]['songTitle'];
			const songToRemove = results[0]['_id'];
			let dataToUse = {};
			let propsForUpdate = {};
			if (results[1]) { //if a second song is in the queue, we need to change it's sort order
				songToPassToEmit = results[1]['songID'];
				dataToUse = {};
				const songToUpdateSortOrder = results[1]['_id'];
				dataToUse["sortOrder"] = 100000;
				propsForUpdate = {
					table: 'songs',
					query: {channel:props.channel,_id:songToUpdateSortOrder},
					dataToUse: dataToUse
				}
				await database.update(propsForUpdate);
			}
			const propsForDelete = {
				table: 'songs',
				query: {channel:props.channel,_id:songToRemove}
			}
			await database.delete(propsForDelete);
			dataToUse = {};
			dataToUse["tempSortVal"] = 199999;
			propsForUpdate = {
				table: 'channels',
				query: {ChannelName:props.channel},
				dataToUse: dataToUse
			}
			await database.update(propsForUpdate);
			socket.emit('songs',['skipped',songToPassToEmit]);
			const msgToSend = songTitle + ' has been skipped!';
			return functions.buildUserString(props) + msgToSend;
		}
	}

	async wrongSong(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel:props.channel,whoRequested:props.userstate['display-name']}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			const songToRemove = results[results.length-1]['_id'];
			const songTitle = results[results.length-1]['songTitle'];
			const propsForDelete = {
				table: 'songs',
				query: {channel:props.channel,_id:songToRemove}
			}
			await database.delete(propsForDelete);
			const msgToSend = songTitle + ' has been removed!';
			return functions.buildUserString(props) + msgToSend;
		}
	}

	async removeSongByQueuePosition(props) {
		props.ignoreMessageParamsForUserString = true;
		const propsForSelect = {
			table: 'songs',
			query: {channel:props.channel}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			let songCount = 0;
			for (let song of results) {
				songCount = songCount + 1;
				if (props.messageParams[1] == songCount) {
					const songToRemove = song['_id'];
					const songTitle = song['songTitle'];
					const propsForDelete = {
						table: 'songs',
						query: {channel:props.channel,_id:songToRemove}
					}
					await database.delete(propsForDelete);
					socket.emit('songs',['removed']);
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
		const songsToRemove = props.messageParams[1].split(',').sort(function(a, b){return b-a;});
		let atLeastOneSongRemoved = false;
		let msgToSend;
		const propsForSelect = {
			table: 'songs',
			query: {channel:props.channel}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			for (let songToRemove of songsToRemove) {
				for (let i = 0; i < results.length; i++) {
					if (i == (songToRemove-1)) {
						const propsForDelete = {
							table: 'songs',
							query: {channel:props.channel,_id:results[i]['_id']}
						}
						await database.delete(propsForDelete);
						atLeastOneSongRemoved = true;
						break;
					}
				}
			};
			if (atLeastOneSongRemoved) {
				socket.emit('songs',['removed']);
				msgToSend = functions.buildUserString(props) + 'Songs removed!';
			} else {
				msgToSend = functions.buildUserString(props) + 'None of the songs you tried to remove exist!';
			}
			return msgToSend;
		} else {
			return functions.buildUserString(props) + 'There are no songs in the queue, so no songs were removed!';
		}
	}

	async removeSongsByUsername(props) {
		props.ignoreMessageParamsForUserString = true;
		const userToRemove = props.messageParams[1].toLowerCase();
		const propsForDelete = {
			table: 'songs',
			//this can cause issues if someones entire name is contained in another users name, such as, ygtskedog and ygtskedogtest
			//however, without this being a regex - you must type the users display name exactly in order for a match, including caps
			query: {channel:props.channel,whoRequested:{$regex:new RegExp(userToRemove, "i")}}
		}
		await database.deleteall(propsForDelete);
		socket.emit('songs',['removed']);
		return functions.buildUserString(props) + 'Songs removed!';
	}

	async remove(props) {
		if (functions.isNumber(props.messageParams[1])) {
			return await this.removeSongByQueuePosition(props);
		} else if (props.messageParams[1].includes(',')) {
			return await this.removeMultipleSongsByQueuePosition(props);
		} else {
			return await this.removeSongsByUsername(props);
		}
	}

	async promote(props) {
		props.ignoreMessageParamsForUserString = true;
		const indexToMove = props.messageParams[1];
		let propsForSelect,results,propsForUpdate,dataToUse;
		propsForSelect = {
			table: 'songs',
			query: {channel:props.channel}
		}
		results = await database.select(propsForSelect);
		for (let i = 0; i < results.length; i++) {
			if (indexToMove == i+1 || indexToMove == results[i]['songID']) {
				const songToPromote = results[i]['_id'];
				propsForSelect = {
					table: 'channels',
					query: {ChannelName:props.channel}
				}
				results = await database.select(propsForSelect);
				const tempSortVal = results[0]['tempSortVal'];
				dataToUse = {};
				dataToUse["sortOrder"] = parseInt(tempSortVal,10);
				propsForUpdate = {
					table: 'songs',
					query: {channel:props.channel,_id:songToPromote},
					dataToUse: dataToUse
				}
				await database.update(propsForUpdate);
				dataToUse = {};
				dataToUse["tempSortVal"] = parseInt(tempSortVal-1,10);
				propsForUpdate = {
					table: 'channels',
					query: {ChannelName:props.channel},
					dataToUse: dataToUse
				}
				await database.update(propsForUpdate);
				const msgToSend = 'Song #' + indexToMove + ' has been promoted!';
				socket.emit('songs',['promoted']);
				return functions.buildUserString(props) + msgToSend;
			};
		}
	}

	async shuffle(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel:props.channel}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			let songsToShuffle = '';
			for (let i = 0; i < results.length; i++) {
				if (results[i]['sortOrder'] >= 200000) {
					songsToShuffle = songsToShuffle + results[i]['_id'] + ',';
				}
			}
			songsToShuffle = songsToShuffle.substring(0, songsToShuffle.length - 1);
			const arrayOfIDs = songsToShuffle.split(',');
			const shuffledArray = await functions.shuffleArray(arrayOfIDs);
			i = 0;
			for (let shuffledSongID of shuffledArray) {
				let dataToUse = {};
				dataToUse["sortOrder"] = parseInt((i+2) + '00000',10);
				const propsForUpdate = {
					table: 'songs',
					query: {channel:props.channel,_id:ObjectId(shuffledSongID)},
					dataToUse: dataToUse
				}
				await database.update(propsForUpdate);
				i++;
			}
			const msgToSend = 'Songs shuffled!';
			return functions.buildUserString(props) + msgToSend;
		}
	}

	async requestSongs(props) {
		props.messageParams.splice(0,1);
		const searchTerm = props.messageParams.join(' ');
		if (searchTerm.slice(-1) == ',') {searchTerm = searchTerm.slice(0, -1);}
		if (searchTerm.includes(',') && !searchTerm.includes(' ')) {
			props.songsToAdd = searchTerm.split(',');
			return await this.requestCommaListOfSongs(props);
		} else {
			if (searchTerm) {
				props.songToAdd = searchTerm;
				return await this.requestSingleSong(props);
			} else {
				return functions.buildUserString(props) + 'To request a song, type the following: !sr youtube URL, video ID, or the song name';
			}
		}
	}

	async requestPlaylist(props) {
		try {
			props.messageParams.splice(0,1);
			const playlistID = await this.getYouTubePlaylistIDFromChatMessage(props);
			const dbConstants = await database.constants();
			const _this = this;
			await this.checkIfUserCanAddSong(props);
			props.messageToSend = 'Gathering playlist data, please wait...';
			messages.send(props);
			const playlistInfo = await promisify(ypi.playlistInfo);
			let playlistItems = '';
			await playlistInfo(dbConstants.YouTubeAPIKey,playlistID).then(results => {
				playlistItems = results;
			}).catch(err => {
				playlistItems = err;
			});
			let createdArray = [];
			for (let x=0;x<playlistItems.length;x++) {
				createdArray.push(playlistItems[x]['resourceId']['videoId']);
			}
			const shuffledSongs = await functions.shuffleArray(createdArray);
			const songNumberLimit = await _this.getChannelSongNumberLimit(props);
			const randomList = await functions.generateListOfRandomNumbers(songNumberLimit+10,shuffledSongs.length-1);
			let randomListOfSongsToAdd = '';
			for (let y = 0; y < randomList.length; y++) {
				randomListOfSongsToAdd = randomListOfSongsToAdd + shuffledSongs[randomList[y]] + ',';
			}
			const finalList = randomListOfSongsToAdd.substring(0, randomListOfSongsToAdd.length - 1);
			props.messageParams = ['!sr',finalList];
			return await _this.requestSongs(props);
		} catch (err) {
			if (err == 'failed limit') {
				return functions.buildUserString(props) + 'Song request limit reached, please try again later!';
			} else if (err = 'invalid playlist ID') {
				return functions.buildUserString(props) + 'Invalid Playlist! To request a playlist, type the following: !pr PlaylistID or YouTube URL!';
			} else {
				return functions.buildUserString(props) + 'Error requesting playlist!';
			}
		}
	}

	/* - - - - - HELPER FUNCTIONS - - - - - - */

	async checkIfSongExists(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel:props.channel,songID:props.songToAdd}
		}
		const res = await database.select(propsForSelect);
		if (res) {
			throw 'failed exists';
		} else {
			return 'doesn\'t exist';
		};
	}

	async checkCacheTimeCheck(props) {
		let propsForSelect;
		propsForSelect = {
			table: 'channels',
			query: {ChannelName:props.channel}
		}
		const res = await database.select(propsForSelect);
		const duplicationCheckDateInMS = res[0]['duplicateSongDelay']*3600000;
		propsForSelect = {
			table: 'songcache',
			query: {channel:props.channel,songID:props.songToAdd}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			const whenRequested = results[0]['whenRequested'];
			const currentdate = new Date();
			const currentTimeInMS = currentdate.getTime();
			const timeCheck = currentTimeInMS - duplicationCheckDateInMS;
			if (whenRequested < timeCheck) {
				return 'cache time is good';
			} else {
				throw 'failed toosoon';
			}
		} else {
			return 'good';
		}
	}

	checkCountryRestrictions(props) {
		if (props.YTData[0]['allowedRegions'] && props.YTData[0]['allowedRegions'].length != 0) {
			if (props.YTData[0]['allowedRegions'].includes('US')) {
				return 'good';
			} else {
				throw 'failed countryCheck';
			}
		} else {
			return 'good';
		}
	}

	checkIfSongCanBeEmbeded(props) {
		if (props.YTData[0]['isEmbeddable']) {
			return 'good';
		} else {
			throw 'failed embedCheck';
		}
	}

	async checkIfUserCanAddSong(props) {
		const songNumberLimit = await this.getChannelSongNumberLimit(props);
		const numberOfSongsForUser = await this.getNumberOfSongsInQueuePerUser(props);
		if (numberOfSongsForUser < songNumberLimit) {
			return 'good';
		} else {
			throw 'failed limit';
		}
	}

	async checkIfSongIsTooLong(props) {
		const channelMaxSongLength = await this.getChannelMaxSongLength(props);
		const songLength = props.YTData[0]['songLength'];
		let minutes;
		if ((songLength.includes("H") || songLength.includes("M"))) {
			minutes = songLength.replace('H',' ').split('M');
			minutes = minutes[0].split(' ');
			minutes = minutes[0].replace('PT','');
		} else {
			if (songLength == 'PT0S') {
				throw 'failed length';
			} else {
				minutes = 0;
			}
		}
		if ((channelMaxSongLength == 0) || (minutes <= channelMaxSongLength && channelMaxSongLength != 0) && !(songLength.includes("H"))) {
			return 'good';
		} else {
			throw 'failed length';
		}
	}

	async addOrUpdateSongCache(props) {
		let propsForSelect;
		propsForSelect = {
			table: 'channels',
			query: {ChannelName:props.channel}
		}
		const res = await database.select(propsForSelect);
		const duplicationCheckDateInMS = res[0]['duplicateSongDelay']*3600000;
		const currentdate = new Date();
		propsForSelect = {
			table: 'songcache',
			query: {channel:props.channel,songID:props.dataToAdd['songID']}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			let dataToUse = {};
			dataToUse["whenRequested"] = currentdate;
			const propsForUpdate = {
				table: 'songcache',
				query: {channel:props.channel,songID:props.dataToAdd['songID']},
				dataToUse: dataToUse
			}
			await database.update(propsForUpdate);
			return 'updated cache';
		} else {
			const propsForAdd = {
				table: 'songcache',
				dataToUse: props.dataToAdd
			}
			await database.add(propsForAdd);
			return 'added to cache';
		}
	}

	async addSongToSonglistAndCache(props) {
		let dataToAdd = {};
		const currentdate = new Date();
		dataToAdd["songID"] = props.YTData[0]["songID"];
		dataToAdd["songTitle"] = props.YTData[0]["songTitle"];
		dataToAdd["songLength"] = props.YTData[0]["songLength"];
		dataToAdd["whoRequested"] = props.userstate["display-name"];
		dataToAdd["channel"] = props.channel;
		dataToAdd["whenRequested"] = currentdate;
		const newSongSortOrder = await this.getNewSongSortOrder(props);
		dataToAdd["sortOrder"] = newSongSortOrder;
		props.dataToAdd = dataToAdd;
		const propsForAdd = {
			table: 'songs',
			dataToUse: dataToAdd
		}
		await Promise.all([
			this.addOrUpdateSongCache(props),
			database.add(propsForAdd)
		]).then(res => {
			const propsForStats = {
				channel:props.channel,
				userstate: props.userstate,
				statFieldToUpdate:'numberOfSongRequests'
			}
			stats.updateUserCounter(propsForStats);
			return 'added';
		}).catch(function(err) {
			throw err;
		});
	}

	async addSongWrapper(props) {
		props.YTData = await this.getYouTubeSongData(props);
		try {
			await this.checkIfUserCanAddSong(props);
			await this.checkIfSongExists(props);
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
	    return await array.filter(item => item == what).length;
	}

	async buildMessageToSendForAddSong(props) {
		const userStr = functions.buildUserString(props);
		let numberOfSongsRequested,msgToSend;
		if (props.songsToAdd) {
			numberOfSongsRequested = props.songsToAdd.length;
		} else {
			numberOfSongsRequested = 1;
		}
		const numberOfAddedSongs = await this.countInArray(props.songStatusArray,'PASSED');
		const propsForErrorMessage = {
			numberOfTooSoon: await this.countInArray(props.songStatusArray,'failed toosoon'),
			numberOfLength: await this.countInArray(props.songStatusArray,'failed length'),
			numberOfExists: await this.countInArray(props.songStatusArray,'failed exists'),
			numberOfFailedIDs: await this.countInArray(props.songStatusArray,'failed getYouTubeSongData'),
			unavailableInCountry: await this.countInArray(props.songStatusArray,'failed countryCheck'),
			numberOfFailedEmbed: await this.countInArray(props.songStatusArray,'failed embedCheck'),
			YTData: props.YTData,
			numberOfSongsRequested: numberOfSongsRequested
		}
		if (numberOfAddedSongs) {
			const numberOfSongsPerChannel = await this.getChannelSongNumberLimit(props);
			if (numberOfSongsRequested == numberOfAddedSongs || numberOfAddedSongs == numberOfSongsPerChannel) {
				//only triggers if all songs requested got added
				if (numberOfAddedSongs == 1) {
					//only one song requested, and added
					const numberOfSongsInQueue = await this.getNumberOfSongsInQueue(props);
					return userStr + 'The song ' + props.YTData[0]['songTitle'] + ' has been added to the queue as #' + numberOfSongsInQueue;
				} else {
					//more than one song requested, and all added
					return userStr + numberOfAddedSongs + ' songs added';
				}
			} else {
				if (props.songStatusArray.includes('failed limit')) {
					if (numberOfAddedSongs > 0) {
						return userStr + numberOfAddedSongs + ' songs were added, but you reached the limit';
					} else {
						return userStr + 'Song request limit reached, please try again later';
					}
				} else {
					if (numberOfAddedSongs > 1) {
						msgToSend = numberOfAddedSongs + ' songs were added, but ';
					} else {
						msgToSend = numberOfAddedSongs + ' song was added, but ';
					}
					const res = await this.getFailedMessages(propsForErrorMessage);
					for (let i = 0; i < res.length; i++) {
						if (i == 0) {
							msgToSend = msgToSend + res[i]
						} else if (i == res.length - 1) {
							msgToSend = msgToSend + ', and ' + res[i]
						} else {
							msgToSend = msgToSend + ', ' + res[i]
						}
					}
					return userStr + msgToSend;
				}
			}
		} else {
			if (props.songStatusArray.includes('failed limit')) {
				return userStr + 'Song request limit reached, please try again later';
			} else {
				msgToSend = numberOfSongsRequested > 1 ? 'No songs were added because ' : '';
				const res = await this.getFailedMessages(propsForErrorMessage);
				for (let i = 0; i < res.length; i++) {
					if (i == 0) {
						msgToSend = msgToSend + res[i]
					} else if (i == res.length - 1) {
						msgToSend = msgToSend + ', and ' + res[i]
					} else {
						msgToSend = msgToSend + ', ' + res[i]
					}
				}
				return userStr + msgToSend;
			}
		}
	}

	async requestSingleSong(props) {
		props.ignoreMessageParamsForUserString = true;
		props.songStatusArray = [];
		try {
			const youTubeID = await this.getYouTubeVideoIDFromChatMessage(props.songToAdd);
			props.songToAdd = youTubeID;
			await this.addSongWrapper(props);
			socket.emit('songs',['added']);
			return await this.buildMessageToSendForAddSong(props) + '!';
		} catch (err) {
			console.log(err);
		}
	}

	async requestCommaListOfSongs(props) {
		props.ignoreMessageParamsForUserString = true;
		props.songStatusArray = [];
		for (let x=0; x < props.songsToAdd.length-1;x++) {
			try {
				const youTubeID = await this.getYouTubeVideoIDFromChatMessage(props.songsToAdd[x]);
				props.songToAdd = youTubeID;
				await this.addSongWrapper(props);
			} catch (err) {
				if (err == 'failed limit') {
					break;
				}
			}
		}
		socket.emit('songs',['added']);
		return await this.buildMessageToSendForAddSong(props) + '!';
	}

	async getChannelSongNumberLimit(props) {
		const propsForSelect = {
			table: 'channels',
			query: {ChannelName:props.channel}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			return results[0]['songNumberLimit'];
		} else {
			throw 'failed getChannelSongNumberLimit';
		};
	}

	async getChannelMaxSongLength(props) {
		const propsForSelect = {
			table: 'channels',
			query: {ChannelName:props.channel}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			return results[0]['maxSongLength'];
		} else {
			throw 'failed getChannelMaxSongLength';
		};
	}

	async getNumberOfSongsInQueue(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel:props.channel}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			return results.length;
		} else {
			return 0;
		}
	}

	async getNumberOfSongsInQueuePerUser(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel:props.channel}
		}
		const resultsTemp = await database.select(propsForSelect);
		if (resultsTemp) {
			let numberOfSongsPerUser = 0;
			for (let i = 0; i < resultsTemp.length; i++) {
				if (resultsTemp[i]['whoRequested'].toLowerCase() == props.userstate['display-name'].toLowerCase()) {
					numberOfSongsPerUser++;
				}
				if (i == (resultsTemp.length - 1)) {
					return numberOfSongsPerUser;
				}
			}
		} else {
			return 0;
		}
	}

	async getYouTubeSongData(props) {
		const dbConstants = await database.constants();
		const youTube = new YouTube();
		youTube.setKey(dbConstants.YouTubeAPIKey);
		if (props.songToAdd.length == 11 && !props.songToAdd.includes(" ")) { //handles song requests
			let getById = await promisify(youTube.getById);
			const result = await getById(props.songToAdd);
			if (result) {
				if (result["items"][0] && (!result["pageInfo"]["totalResults"] == 0)) {
					const videoTitle = result["items"][0]["snippet"]["title"];
					const isEmbeddable = result["items"][0]["status"]["embeddable"];
					const videoLength = result["items"][0]["contentDetails"]["duration"];
					let allowedRegions;
					if (result["items"][0]["contentDetails"]["regionRestriction"]) {
						allowedRegions = result["items"][0]["contentDetails"]["regionRestriction"]["allowed"];
					} else {
						allowedRegions = [];
					}
					return [{"songID": props.songToAdd,"songTitle": videoTitle,"songLength": videoLength,"isEmbeddable": isEmbeddable,"allowedRegions": allowedRegions}];
				}
			}
		}
	}

	getYouTubePlaylistIDFromChatMessage(props) {
		const passedInfo = props.messageParams.join(' ');
		if ((passedInfo.length == 34 || passedInfo.length == 24 || passedInfo.length == 13) && !passedInfo.includes(" ")) {
			return passedInfo;
		} else if (passedInfo.includes("http")) {
			const tempSplit = passedInfo.split('?');
			const query = functions.parseQuery(tempSplit[1]);
			const playlistID = query['list'];
			return playlistID;
		} else if (passedInfo.indexOf('list=') > -1) {
			const query = functions.parseQuery(passedInfo);
			const playlistID = query['list'];
			return playlistID;
		} else {
			throw 'invalid playlist ID';
		}
	}

	async getYouTubeVideoIDFromChatMessage(songToAdd) {
		let vars,finalVideoID,query,tempSplit,videoID;
		if (songToAdd.length == 11 && !songToAdd.includes(" ")) {
			return songToAdd;
		} else if (songToAdd.includes("http")) {
			if (songToAdd.includes("://youtu.be")) {
				vars = songToAdd.split('/');
				finalVideoID = vars[3];
			} else {
				if (songToAdd.includes("?") && songToAdd.includes("v")) {
					tempSplit = songToAdd.split('?');
					query = functions.parseQuery(tempSplit[1]);
					finalVideoID = query['v'];
				} else {
					vars = songToAdd.split('/');
					finalVideoID = vars[3];
				}
			}
			if (finalVideoID.length == 11) {
				return finalVideoID;
			} else {
				throw 'Invalid URL! To request a song, type the following: !sr youtube URL, video ID, or the song name';
			}
		} else if (songToAdd.indexOf('v=') > -1) {
			tempSplit = songToAdd.split('?');
			query = functions.parseQuery(tempSplit[1]);
			videoID = query['v'];
			return videoID;
		} else {
			const dbConstants = await database.constants();
			const youTube = new YouTube();
			youTube.setKey(dbConstants.YouTubeAPIKey);
			const youtubeSearch = await promisify(youTube.search);
			const result = await youtubeSearch(songToAdd,2);
			const numberOfResults = result["pageInfo"]["totalResults"];
			if (numberOfResults > 0) {
				videoID = result["items"][0]["id"]["videoId"];
				if (videoID) {
					return videoID;
				} else {
					//videoID was not defined in the first result, so pull the second one
					//this happens when the search returns a channel first, rather than a video
					videoID = result["items"][1]["id"]["videoId"];
					if (videoID) {
						return videoID;
					} else {
						throw 'Song not found! To request a song, type the following: !sr youtube URL, video ID, or the song name';
					}
				}
			} else {
				throw 'Song not found! To request a song, type the following: !sr youtube URL, video ID, or the song name';
			}
		}
	}

	getFailedMessages(props) {
		const channelDefaultCountry = 'US';
		let msgArray = [];
		if (props.numberOfTooSoon) {
			if (props.numberOfTooSoon > 1) {
				msgArray.push(props.numberOfTooSoon + ' songs were played too recently');
			} else {
				if (props.numberOfSongsRequested > 1) {
					msgArray.push(props.numberOfTooSoon + ' song was played too recently');
				} else {
					msgArray.push('The song ' + props.YTData[0]['songTitle'] + ' was played too recently');
				}
			}
		}
		if (props.numberOfLength) {
			if (props.numberOfLength > 1) {
				msgArray.push(props.numberOfLength + ' songs are too long');
			} else {
				if (props.numberOfSongsRequested > 1) {
					msgArray.push(props.numberOfLength + ' song is too long')
				} else {
					msgArray.push('The song ' + props.YTData[0]['songTitle'] + ' is too long');
				}
			}
		}
		if (props.numberOfExists) {
			if (props.numberOfExists > 1) {
				msgArray.push(props.numberOfExists + ' songs already exist');
			} else {
				if (props.numberOfSongsRequested > 1) {
					msgArray.push(props.numberOfExists + ' song already exists');
				} else {
					msgArray.push('The song ' + props.YTData[0]['songTitle'] + ' already exists in the queue');
				}
			}
		}
		if (props.unavailableInCountry) {
			if (props.unavailableInCountry > 1) {
				msgArray.push(props.unavailableInCountry + ' songs were unavailable for playback in: ' + channelDefaultCountry);
			} else {
				if (props.numberOfSongsRequested > 1) {
					msgArray.push(props.unavailableInCountry + ' song was unavailable for playback in: ' + channelDefaultCountry);
				} else {
					msgArray.push('The song ' + props.YTData[0]['songTitle'] + ' is unavailable for playback in: ' + channelDefaultCountry);
				}
			}
		}
		if (props.numberOfFailedEmbed) {
			if (props.numberOfFailedEmbed > 1) {
				msgArray.push(props.numberOfFailedEmbed + ' songs were not allowed to be embedded');
			} else {
				if (props.numberOfSongsRequested > 1) {
					msgArray.push(props.numberOfFailedEmbed + ' song was not allowed to be embedded');
				} else {
					msgArray.push('The song ' + props.YTData[0]['songTitle'] + ' is not allowed to be embedded');
				}
			}
		}
		if (props.numberOfFailedIDs) {
			if (props.numberOfFailedIDs > 1) {
				msgArray.push(props.numberOfFailedIDs + ' IDs were invalid');
			} else {
				if (props.numberOfSongsRequested > 1) {
					msgArray.push(props.numberOfFailedIDs + ' ID was invalid');
				} else {
					msgArray.push('Invalid song ID');
				}
			}
		}
		if (msgArray[0]) {
			return msgArray;
		} else {
			msgArray.push('Invalid song ID');
			return msgArray;
		}
	}

	async getNewSongSortOrder(props) {
		const propsForSelect = {
			table: 'songs',
			query: {channel:props.channel}
		}
		const results = await database.select(propsForSelect);
		if (results) {
			//check sort order - determines the last song in the queue (largestsortorder) and adds to that number
			let largestSortOrder = 0;
			for (let i = 0; i < results.length; i++) {
				if (largestSortOrder == 0) {
					largestSortOrder = results[i]['sortOrder'];
				} else {
					if (largestSortOrder < results[i]['sortOrder']) {
						largestSortOrder = results[i]['sortOrder'];
					}
				}
			}
			return parseInt(largestSortOrder+100000,10);
		} else {
			return 100000;
		}
	}
}

module.exports = new songs();