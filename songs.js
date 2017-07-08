const constants = require('./constants.js');
var runSQL = require('./runSQL.js');
var functions = require('./general-functions.js');
var YouTube = require('youtube-node');
var async = require('async');
var stats = require('./stats.js');
var ObjectId = require('mongodb').ObjectId;

/* - - - - - EXPORT FUNCTIONS - - - - - - */

var songlist = function(twitchClient,channel,userstate) {
	return new Promise((resolve, reject) => {
		if (constants.testMode) {
			var msgToSend = 'The song list is available at: ' + constants.testPostURL + '/songs/' + channel.slice(1);
		} else {
			var msgToSend = 'The song list is available at: ' + constants.postURL + '/songs/' + channel.slice(1);
		}
		var userStr = '@' + userstate['display-name'] + ' -> ';
		twitchClient.say(channel, userStr + msgToSend);
		resolve(msgToSend);
	});
}

var songcache = function(twitchClient,channel,userstate) {
	return new Promise((resolve, reject) => {
		if (constants.testMode) {
			var msgToSend = 'The song cache is available at: ' + constants.testPostURL + '/songcache/' + channel.slice(1);
		} else {
			var msgToSend = 'The song cache is available at: ' + constants.postURL + '/songcache/' + channel.slice(1);
		}
		var userStr = '@' + userstate['display-name'] + ' -> ';
		twitchClient.say(channel, userStr + msgToSend);
		resolve(msgToSend);
	});
}

var currentSong = function(db,twitchClient,channel,userstate) {
	return new Promise((resolve, reject) => {
		runSQL('select','songs',{channel:channel},'',db).then(results => {
			if (results) {
				var msgToSend = 'The current song is "' + results[0]['songTitle'] + '" and it was requested by ' + results[0]['whoRequested'];
			} else {
				var msgToSend = 'No song currently requested!';
			}
			var userStr = '@' + userstate['display-name'] + ' -> ';
			twitchClient.say(channel, userStr + msgToSend);
			resolve(msgToSend);
		});
	});
}

var volume = function(db,twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		runSQL('select','channels',{ChannelName:channel},'',db).then(results => {
			if (messageParams[1]) {
				var userStr = messageParams[1] + ' -> ';
			} else {
				var userStr = '@' + userstate['display-name'] + ' -> ';
			}
			var msgToSend = 'The current volume is: ' + results[0]['volume'];
			twitchClient.say(channel, userStr + msgToSend);
			resolve(msgToSend);
		});
	});
}

var updateVolume = function(db,twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		if (functions.isNumber(messageParams[1])) {
			if (messageParams[1] <= 100) {
				var newVolume = Math.round(messageParams[1]);
				var dataToUse = {};
				dataToUse["volume"] = newVolume;
				runSQL('update','channels',{ChannelName:channel},dataToUse,db).then(results => {
					var userStr = '@' + userstate['display-name'] + ' -> ';
					var msgToSend = 'The volume has been updated to ' + newVolume + '!';
					twitchClient.say(channel, userStr + msgToSend);
					resolve(msgToSend);
				});
			}
		}
	});
}

var play = function(db,twitchClient,channel,userstate) {
	return new Promise((resolve, reject) => {
		var dataToUse = {};
		dataToUse["musicStatus"] = 'play';
		runSQL('update','channels',{ChannelName:channel},dataToUse,db).then(results => {
			var userStr = '@' + userstate['display-name'] + ' -> ';
			var msgToSend = 'Music is now playing!';
			twitchClient.say(channel, userStr + msgToSend);
			resolve(msgToSend);
		});
	});
}

var pause = function(db,twitchClient,channel,userstate) {
	return new Promise((resolve, reject) => {
		var dataToUse = {};
		dataToUse["musicStatus"] = 'pause';
		runSQL('update','channels',{ChannelName:channel},dataToUse,db).then(results => {
			var userStr = '@' + userstate['display-name'] + ' -> ';
			var msgToSend = 'Music has been paused!';
			twitchClient.say(channel, userStr + msgToSend);
			resolve(msgToSend);
		});
	});
}

var skip = function(db,twitchClient,channel,userstate) {
	return new Promise((resolve, reject) => {
		runSQL('select','songs',{channel:channel},'',db).then(results => {
			if (results) {
				var songTitle = results[0]['songTitle'];
				var songToRemove = results[0]['_id'];
				if (results[1]) { //if a second song is in the queue, we need to change it's sort order
					var dataToUse = {};
					var query = {};
					var songToUpdateSortOrder = results[1]['_id'];
					dataToUse["sortOrder"] = 100000;
					runSQL('update','songs',{channel:channel,_id:songToUpdateSortOrder},dataToUse,db);
				}
				var query2 = {channel:channel,_id:songToRemove};
				runSQL('delete','songs',query2,'',db).then(results => {
					dataToUse = {};
					dataToUse["tempSortVal"] = 199999;
					runSQL('update','channels',{ChannelName:channel},dataToUse,db).then(results => {
						var userStr = '@' + userstate['display-name'] + ' -> ';
						var msgToSend = songTitle + ' has been skipped!';
						twitchClient.say(channel, userStr + msgToSend);
						resolve(msgToSend);
					});
				})
			}
		});
	});
}

var wrongSong = function(db,twitchClient,channel,userstate) {
	return new Promise((resolve, reject) => {
		var query = {channel:channel,whoRequested:userstate['display-name']};
		runSQL('select','songs',query,'',db).then(results => {
			if (results) {
				var songToRemove = results[results.length-1]['_id'];
				var songTitle = results[results.length-1]['songTitle'];
				var query = {channel:channel,_id:songToRemove};
				runSQL('delete','songs',query,'',db).then(results => {
					var userStr = '@' + userstate['display-name'] + ' -> ';
					var msgToSend = songTitle + ' has been removed!';
					twitchClient.say(channel, userStr + msgToSend);
					resolve(msgToSend);
				});
			}
		});
	});
}

var remove = function(db,twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var query = {};
		if (functions.isNumber(messageParams[1])) {
			//remove a single song by queue position
			query = {channel:channel};
			runSQL('select','songs',query,'',db).then(results => {
				if (results) {
					var songCount = 0;
					for (i = 0; i < results.length; i++) {
						var songCount = songCount + 1;
						if (messageParams[1] == songCount) {
							var songToRemove = results[i]['_id'];
							var songTitle = results[i]['songTitle'];
							var query = {channel:channel,_id:songToRemove};
							runSQL('delete','songs',query,'',db).then(results => {
								var userStr = '@' + userstate['display-name'] + ' -> ';
								var msgToSend = 'The song ' + songTitle + ' has been removed!';
								twitchClient.say(channel, userStr + msgToSend);
								resolve(msgToSend);
							});
							break;
						}
					}
				} else {
					var userStr = '@' + userstate['display-name'] + ' -> ';
					var msgToSend = 'The song you tried to remove doesn\'t exist!';
					twitchClient.say(channel, userStr + msgToSend);
					resolve(msgToSend);
				}
			});
		} else if (messageParams[1].includes(',')) {
			//remove multiple songs by id, comma separated
			var songsToRemove = messageParams[1].split(',').sort(function(a, b){return b-a;});
			var songsRemoved = false;
			var userStr = '@' + userstate['display-name'] + ' -> ';
			runSQL('select','songs',{channel:channel},'',db).then(results => {
				if (results) {
					var songsToRemoveCounter = 0;
					async.eachSeries(songsToRemove, function(songToRemove, callback) {
						var songCount = 0;
						for (i = 1; i < results.length; i++) {
							if (i == (songToRemove-1)) {
								runSQL('delete','songs',{channel:channel,_id:results[i]['_id']},'',db).then(results => {
									songsRemoved = true;
									callback();
								});
								break;
							}
						}
					}, function(err) {
						if (songsRemoved) {
							var msgToSend = userStr + 'Songs removed!';
						} else {
							var msgToSend = userStr + 'None of the songs you tried to remove exist!';
						}
						twitchClient.say(channel, msgToSend);
						resolve(msgToSend);
					});
				} else {
					var msgToSend = userStr + 'There are no songs in the queue, so no songs were removed!';
					twitchClient.say(channel, msgToSend);
					resolve(msgToSend);
				}
			});
		} else {
			//remove songs by username
			var userToRemove = messageParams[1].toLowerCase();
			var foundAtLeastOne = false;
			var query = {channel:channel,whoRequested:{$regex:new RegExp(userToRemove, "i")}};
			runSQL('deleteall','songs',query,'',db).then(results => {
				var userStr = '@' + userstate['display-name'] + ' -> ';
				var msgToSend = userStr + 'Songs removed!';
				twitchClient.say(channel, msgToSend);
				resolve(msgToSend);
			}).catch(err => {
				reject('Found no songs requested by: ' + userToRemove);
			});
		}
	});
}

var promote = function(db,twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var indexToMove = messageParams[1];
		if (functions.isNumber(indexToMove)) {
			runSQL('select','songs',{channel:channel},'',db).then(results => {
				for (i = 0; i < results.length; i++) {
					if (indexToMove == i+1) {
						var songToPromote = results[i]['_id'];
						runSQL('select','channels',{ChannelName:channel},'',db).then(results => {
							var tempSortVal = results[0]['tempSortVal'];
							var query = {channel:channel,_id:songToPromote};
							var dataToUse = {};
							dataToUse["sortOrder"] = parseInt(tempSortVal,10);
							runSQL('update','songs',query,dataToUse,db).then(results => {
								query = {};
								query = {ChannelName:channel};
								dataToUse = {};
								dataToUse["tempSortVal"] = parseInt(tempSortVal-1,10);
								runSQL('update','channels',query,dataToUse,db).then(results => {
									var userStr = '@' + userstate['display-name'] + ' -> ';
									var msgToSend = 'Song #' + indexToMove + ' has been promoted!';
									twitchClient.say(channel, userStr + msgToSend);
									resolve(msgToSend);
								});
							});
						});
						break;
					}
				}
			});
		}
	});
}

var shuffle = function(db,twitchClient,channel,userstate) {
	return new Promise((resolve, reject) => {
		runSQL('select','songs',{channel:channel},'',db).then(results => {
			if (results) {
				var songsToShuffle = '';
				for (i = 0; i < results.length; i++) {
					if (results[i]['sortOrder'] >= 200000) {
						songsToShuffle = songsToShuffle + results[i]['_id'] + ',';
					}
				}
				songsToShuffle = songsToShuffle.substring(0, songsToShuffle.length - 1);
				var arrayOfIDs = songsToShuffle.split(',');
				var shuffledArray = functions.shuffleArray(arrayOfIDs);
				var i = 0;
				async.eachSeries(shuffledArray, function(shuffledSongID, callback) {
					var query = {};
					//If we don't use ObjectID - mongo returns a null value for the query
					query = {channel:channel,_id:ObjectId(shuffledSongID)};
					var dataToUse = {};
					dataToUse["sortOrder"] = parseInt((i+2) + '00000',10);
					runSQL('update','songs',query,dataToUse,db).then(res => {
						i++;
						callback();
					});
				}, function(err) {
					var userStr = '@' + userstate['display-name'] + ' -> ';
					var msgToSend = 'Songs shuffled!';
					twitchClient.say(channel, userStr + msgToSend);
					resolve(msgToSend);
				})
			}
		});
	});
}

var requestSongs = function(db,twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var userStr = '@' + userstate['display-name'] + ' -> ';
		var removeCommandFromSearchTerm = messageParams.splice(0,1);
		var searchTerm = messageParams.join(' ');
		if (searchTerm.slice(-1) == ',') {searchTerm = searchTerm.slice(0, -1);}
		if (searchTerm.includes(',') && !searchTerm.includes(' ')) {
			var songsToAdd = searchTerm.split(',');
			requestCommaListOfSongs(db,channel,userstate,songsToAdd).then(msgToSend => {
				twitchClient.say(channel,userStr + msgToSend + '!');
				resolve(msgToSend + '!');
			})
		} else {
			if (searchTerm) {
				requestSingleSong(db,channel,userstate,searchTerm).then(msgToSend => {
					twitchClient.say(channel,userStr + msgToSend + '!');
					resolve(msgToSend + '!');
				})
			} else {
				msgToSend = 'To request a song, type the following: !sr youtube URL, video ID, or the song name'
				twitchClient.say(channel,userStr + msgToSend + '!');
				reject(msgToSend + '!');
			}
		}
	});
}

var requestPlaylist = function(db,twitchClient,channel,userstate,messageParams) {
	return new Promise((resolve, reject) => {
		var userStr = '@' + userstate['display-name'] + ' -> ';
		var removeCommandFromSearchTerm = messageParams.splice(0,1);
		var searchTerm = messageParams.join(' ');
		getYouTubePlaylistIDFromChatMessage(searchTerm).then(playlistID => {
			var youTube = new YouTube();
			youTube.setKey(dbConstants.YouTubeAPIKey);
			youTube.addParam('maxResults','50');
			youTube.getPlayListsItemsById(playlistID, function(error, result) {
				if (error) {
					if (error['code'] == 404) {
						var msgToSend = 'Playlist not found!';
						twitchClient.say(channel,userStr + msgToSend);
						reject('Playlist not found!');
					} else {
						reject(error);
					}
				} else {
					var msgToSend = 'Gathering playlist data, please wait...';
					twitchClient.say(channel,userStr + msgToSend);
					var firstPageOfIDs = '';
					var totalResults = result['pageInfo']['totalResults'];
					var nextpageToken = result['nextPageToken'];
					for (x = 0; x < 51; x++) {
						if (result['items'][x]) {
							if (result['items'][x]['status']['privacyStatus'] == 'public') {
								firstPageOfIDs = firstPageOfIDs + result['items'][x]['contentDetails']['videoId'] + ',';
							}
						}
					}
					if (totalResults > 50) {
						buildFullYTPlaylistIdList(playlistID,nextpageToken,'').then(builtListOfIDs => {
							var listOfIDs = builtListOfIDs + firstPageOfIDs;
							var finalList = listOfIDs.substring(0, listOfIDs.length - 1); //remove last comma
							var arrayOfPlaylistSongIDs = finalList.split(',');
							getChannelSongNumberLimit(db,channel).then(songNumberLimit => {
								var randomList = functions.generateListOfRandomNumbers(songNumberLimit+10,arrayOfPlaylistSongIDs.length-1);
								var randomListOfSongsToAdd = '';
								for (y = 0; y < randomList.length; y++) {
									randomListOfSongsToAdd = randomListOfSongsToAdd + arrayOfPlaylistSongIDs[randomList[y]] + ',';
								}
								finalList = randomListOfSongsToAdd.substring(0, randomListOfSongsToAdd.length - 1);
								resolve(requestSongs(db,twitchClient,channel,userstate,['!sr',finalList]));
							})
						})
					} else {
						var finalList = firstPageOfIDs.substring(0, firstPageOfIDs.length - 1);
						resolve(requestSongs(db,twitchClient,channel,userstate,['!sr',finalList]));
					}
				}
			})
		}).catch(err => {
			twitchClient.say(channel,userStr + err);
			reject(err);
		});
	});
}

/* - - - - - HELPER FUNCTIONS - - - - - - */

var checkIfSongExists = function(db,channel,songToAdd) {
	return new Promise((resolve, reject) => {
		runSQL('select','songs',{channel:channel,songID:songToAdd},'',db).then(res => {
			if (res) {
				reject('failed exists');
			} else {
				resolve('');
			};
		}).catch(function(err) {
			reject(err);
		});
	});
}

var checkCacheTimeCheck = function(db,channel,songToAdd) {
	return new Promise((resolve, reject) => {
		runSQL('select','channels',{ChannelName:channel},'',db).then(res => {
			var duplicationCheckDateInMS = res[0]['duplicateSongDelay']*3600000;
			var query = {channel:channel,songID:songToAdd};
			runSQL('select','songcache',query,'',db).then(results => {
				if (results) {
					var whenRequested = results[0]['whenRequested'];
					var currentdate = new Date();
					var currentTimeInMS = currentdate.getTime();
					var timeCheck = currentTimeInMS - duplicationCheckDateInMS;
					if (whenRequested < timeCheck) {
						resolve('cache time is good');
					} else {
						reject('failed toosoon');
					}
				} else {
					resolve('good');
				}
			})
		})
	});
}

var checkCountryRestrictions = function(db,channel,allowedRegions) {
	return new Promise((resolve, reject) => {
		if (allowedRegions && allowedRegions.length != 0) {
			if (allowedRegions.includes('US')) {
				resolve('good');
			} else {
				reject('failed countryCheck');
			}
		} else {
			resolve('good');
		}
	});
}

var checkIfSongCanBeEmbeded = function(db,channel,isEmbeddable) {
	return new Promise((resolve, reject) => {
		if (isEmbeddable) {
			resolve('good');
		} else {
			reject('failed embedCheck');
		}
	});
}

var checkIfUserCanAddSong = function(db,channel,userstate) {
	return new Promise((resolve, reject) => {
		Promise.all([
			getChannelSongNumberLimit(db,channel),
			getNumberOfSongsInQueuePerUser(db,channel,userstate)
		]).then(res => {
			var channelSongNumberLimit = res[0];
			var numberOfSongsInQueuePerUser = res[1];
			if (numberOfSongsInQueuePerUser < channelSongNumberLimit) {
				resolve('good');
			} else {
				reject('failed limit');
			}
		}).catch(function(err) {
			reject('failed limit');
		});
	});
}

var checkIfSongIsTooLong = function(db,channel,songLength) {
	return new Promise((resolve, reject) => {
		getChannelMaxSongLength(db,channel).then(channelMaxSongLength => {
			if ((songLength.includes("H") || songLength.includes("M"))) {
				var minutes = songLength.replace('H',' ').split('M');
				minutes = minutes[0].split(' ');
				minutes = minutes[0].replace('PT','');
			} else {
				if (songLength == 'PT0S') {
					reject('failed length');
				} else {
					var minutes = 0;
				}
			}
			if ((channelMaxSongLength == 0) || (minutes <= channelMaxSongLength && channelMaxSongLength != 0) && !(songLength.includes("H"))) {
				resolve('good');
			} else {
				reject('failed length');
			}
		}).catch(function(err) {
			reject(err);
		});
	})
}

var addOrUpdateSongCache = function(db,channel,dataToAdd) {
	return new Promise((resolve, reject) => {
		runSQL('select','channels',{ChannelName:channel},'',db).then(res => {
			var duplicationCheckDateInMS = res[0]['duplicateSongDelay']*3600000;
			var query = {channel:channel,songID:dataToAdd['songID']};
			var currentdate = new Date();
			var currentTimeInMS = currentdate.getTime();
			runSQL('select','songcache',query,'',db).then(results => {
				if (results) {
					query = {channel:channel,songID:dataToAdd['songID']};
					dataToUse = {};
					dataToUse["whenRequested"] = currentdate;
					runSQL('update','songcache',query,dataToUse,db).then(results => {
						resolve('updated cache');
					});
				} else {
					runSQL('add','songcache',{},dataToAdd,db).then(results => {
						resolve('added to cache');
					});
				}
			})
		})
	});
}

var addSongToSonglistAndCache = function(db,channel,userstate,YTData) {
	return new Promise((resolve, reject) => {
		var dataToAdd = {};
		var currentdate = new Date();
		var datetime = currentdate.getTime();
		dataToAdd["songID"] = YTData[0]["songID"];
		dataToAdd["songTitle"] = YTData[0]["songTitle"];
		dataToAdd["songLength"] = YTData[0]["songLength"];
		dataToAdd["whoRequested"] = userstate["display-name"];
		dataToAdd["channel"] = channel;
		dataToAdd["whenRequested"] = currentdate;
		getNewSongSortOrder(db,channel).then(newSongSortOrder => {
			dataToAdd["sortOrder"] = newSongSortOrder;
			Promise.all([
				addOrUpdateSongCache(db,channel,dataToAdd),
				runSQL('add','songs',{},dataToAdd,db)
			]).then(res => {
				stats.updateUserSongRequestCounter(channel,userstate["username"],db);
				resolve('added');
			}).catch(function(err) {
				reject(err);
			});
		}).catch(function(err) {
			reject(err);
		});
	});
}

var addSongPromiseWrapper = function(db,channel,userstate,songToAdd,songStatusArray,callback) {
	return new Promise((resolve, reject) => {
		getYouTubeSongData(songToAdd).then(YTData => {
			Promise.all([
				checkIfUserCanAddSong(db,channel,userstate),
				checkIfSongExists(db,channel,songToAdd),
				checkCacheTimeCheck(db,channel,songToAdd),
				checkCountryRestrictions(db,channel,YTData[0]['allowedRegions']),
				checkIfSongIsTooLong(db,channel,YTData[0]['songLength']),
				checkIfSongCanBeEmbeded(db,channel,YTData[0]['isEmbeddable'])
			]).then(res => {
				addSongToSonglistAndCache(db,channel,userstate,YTData).then(res => {
					songStatusArray.push('PASSED');
					resolve([callback,YTData]);
				}).catch(function(err) {
					songStatusArray.push(err);
					resolve([callback,YTData]);
				});
			}).catch(function(err) {
				songStatusArray.push(err);
				resolve([callback,YTData]);
			});
		}).catch(function(err) {
			songStatusArray.push(err);
			resolve([callback,'']);
		});
	});
}

var buildMessageToSendForAddSong = function(db,channel,songStatusArray,numberOfSongsRequested,YTData) {
	return new Promise((resolve, reject) => {
		var channelDefaultCountry = 'US';
		var numberOfAddedSongs = songStatusArray.toString().match(/PASSED/g);
		var numberOfTooSoon = songStatusArray.toString().match(/failed toosoon/g);
		var numberOfLength = songStatusArray.toString().match(/failed length/g);
		var numberOfExists = songStatusArray.toString().match(/failed exists/g);
		var numberOfFailedIDs = songStatusArray.toString().match(/failed getYouTubeSongData/g);
		var unavailableInCountry = songStatusArray.toString().match(/failed countryCheck/g);
		var numberOfFailedEmbed = songStatusArray.toString().match(/failed embedCheck/g);
		if (numberOfAddedSongs) {
			var numberOfSongsAdded = numberOfAddedSongs.length;
			getChannelSongNumberLimit(db,channel).then(numberOfSongsPerChannel => {
				if (numberOfSongsRequested == numberOfSongsAdded || numberOfSongsAdded == numberOfSongsPerChannel) {
					//only triggers if all songs requested got added
					if (numberOfSongsAdded == 1) {
						//only one song requested, and added
						getNumberOfSongsInQueue(db,channel).then(numberOfSongsInQueue => {
							var msgToSend = 'The song ' + YTData[0]['songTitle'] + ' has been added to the queue as #' + numberOfSongsInQueue;
							resolve(msgToSend);
						})
					} else {
						//more than one song requested, and all added
						var msgToSend = numberOfSongsAdded + ' songs added';
						resolve(msgToSend);
					}
				} else {
					if (songStatusArray.includes('failed limit')) {
						if (numberOfSongsAdded > 0) {
							var msgToSend = numberOfSongsAdded + ' songs were added, but you reached the limit'
						} else {
							var msgToSend = 'Song request limit reached, please try again later'
						}
						resolve(msgToSend);
					} else {
						if (numberOfSongsAdded > 1) {
							var msgToSend = numberOfSongsAdded + ' songs were added, but ';
						} else {
							var msgToSend = numberOfSongsAdded + ' song was added, but ';
						}
						getFailedMessages(numberOfTooSoon,numberOfLength,numberOfExists,numberOfFailedIDs,numberOfSongsRequested,unavailableInCountry,numberOfFailedEmbed,YTData).then(res => {
							for (i = 0; i < res.length; i++) {
								if (i == 0) {
									msgToSend = msgToSend + res[i]
								} else if (i == res.length - 1) {
									msgToSend = msgToSend + ', and ' + res[i]
								} else {
									msgToSend = msgToSend + ', ' + res[i]
								}
							}
							resolve(msgToSend);
						})
					}
				}
			})
		} else {
			if (songStatusArray.includes('failed limit')) {
				var msgToSend = 'Song request limit reached, please try again later';
				resolve(msgToSend);
			} else {
				// if (numberOfSongsRequested == 1 && unavailableInCountry) {
				// 	resolve('The song you tried to request is unavailable for playback in: ' + channelDefaultCountry);
				// }
				var msgToSend = numberOfSongsRequested > 1 ? 'No songs were added because ' : '';
				getFailedMessages(numberOfTooSoon,numberOfLength,numberOfExists,numberOfFailedIDs,numberOfSongsRequested,unavailableInCountry,numberOfFailedEmbed,YTData).then(res => {
					for (i = 0; i < res.length; i++) {
						if (i == 0) {
							msgToSend = msgToSend + res[i]
						} else if (i == res.length - 1) {
							msgToSend = msgToSend + ', and ' + res[i]
						} else {
							msgToSend = msgToSend + ', ' + res[i]
						}
					}
					resolve(msgToSend);
				})
			}
		}
	})
}

var requestSingleSong = function(db,channel,userstate,songToAdd) {
	return new Promise((resolve, reject) => {
		var numberOfSongsAdded = 0;
		var numberOfSongsRequested = 1;
		var songStatusArray = [];
		getYouTubeVideoIDFromChatMessage(songToAdd).then(youTubeID => {
			addSongPromiseWrapper(db,channel,userstate,youTubeID,songStatusArray,'').then(res => {
				buildMessageToSendForAddSong(db,channel,songStatusArray,numberOfSongsRequested,res[1]).then(res => {
					resolve(res);
				}).catch(function(err) {
					resolve(err);
				});
			}).catch(function(err) {
				resolve(err);
			});
		}).catch(function(err) {
			resolve(err);
		});
	});
}

var requestCommaListOfSongs = function(db,channel,userstate,songsToAdd) {
	return new Promise((resolve, reject) => {
		var numberOfSongsRequested = songsToAdd.length;
		var songStatusArray = [];
		async.eachSeries(songsToAdd, function(songToAdd, callback) {
			getYouTubeVideoIDFromChatMessage(songToAdd).then(youTubeID => {
				addSongPromiseWrapper(db,channel,userstate,youTubeID,songStatusArray,callback).then(res => {
					res[0]();
				})
			})
		}, function(err) {
			buildMessageToSendForAddSong(db,channel,songStatusArray,numberOfSongsRequested,'').then(res => {
				resolve(res);
			})
		})
	});
}

var buildFullYTPlaylistIdList = function(playlistID,nextPageToken,newList) {
	return new Promise((resolve, reject) => {
		var youTube = new YouTube();
		youTube.setKey(dbConstants.YouTubeAPIKey);
		youTube.addParam('maxResults','50');
		youTube.addParam('pageToken',nextPageToken);
		youTube.getPlayListsItemsById(playlistID, function(error, result) {
			var tempList = '';
			for (x = 0; x < 51; x++) {
				if (result['items'][x]) {
					tempList = tempList + result['items'][x]['contentDetails']['videoId'] + ',';
				} else {
					break;
				}
			}
			newList = newList + tempList;
			if (result['nextPageToken']) {
				resolve(buildFullYTPlaylistIdList(playlistID,result['nextPageToken'],newList));
			} else {
				resolve(newList);
			}
		});
	});
}

var getChannelSongNumberLimit = function(db,channel) {
	return new Promise((resolve, reject) => {
		runSQL('select','channels',{ChannelName:channel},'',db).then(results => {
			if (results) {
				resolve(results[0]['songNumberLimit']);
			} else {
				reject('failed getChannelSongNumberLimit');
			};
		});
	});
}

var getChannelMaxSongLength = function(db,channel) {
	return new Promise((resolve, reject) => {
		runSQL('select','channels',{ChannelName:channel},'',db).then(results => {
			if (results) {
				resolve(results[0]['maxSongLength']);
			} else {
				reject('failed getChannelMaxSongLength');
			};
		});
	});
}

var getNumberOfSongsInQueue = function(db,channel) {
	return new Promise((resolve, reject) => {
		runSQL('select','songs',{channel:channel},'',db).then(results => {
			if (results) {
				resolve(results.length);
			} else {
				resolve(100000);
			}
		});
	});
}

var getNumberOfSongsInQueuePerUser = function(db,channel,userstate) {
	return new Promise((resolve, reject) => {
		runSQL('select','songs',{channel:channel},'',db).then(resultsTemp => {
			if (resultsTemp) {
				var numberOfSongsPerUser = 0;
				for (i = 0; i < resultsTemp.length; i++) {
					if (resultsTemp[i]['whoRequested'].toLowerCase() == userstate['display-name'].toLowerCase()) {
						numberOfSongsPerUser++;
					}
					if (i == (resultsTemp.length - 1)) {
						resolve(numberOfSongsPerUser);
					}
				}
			} else {
				resolve(0);
			}
		});
	});
}

var getYouTubeSongData = function(songToAdd) {
	return new Promise((resolve, reject) => {
		var youTube = new YouTube();
		youTube.setKey(dbConstants.YouTubeAPIKey);
		if (songToAdd.length == 11 && !songToAdd.includes(" ")) { //handles song requests
			youTube.getById(songToAdd, function(error, result) {
				if (result) {
					if (error) {
						reject(error);
					} else {
						if (result["items"][0] && (!result["pageInfo"]["totalResults"] == 0)) {
							var videoTitle = result["items"][0]["snippet"]["title"];
							var isEmbeddable = result["items"][0]["status"]["embeddable"];
							var videoLength = result["items"][0]["contentDetails"]["duration"];
							if (result["items"][0]["contentDetails"]["regionRestriction"]) {
								var allowedRegions = result["items"][0]["contentDetails"]["regionRestriction"]["allowed"];
							} else {
								allowedRegions = [];
							}
							resolve([{"songID": songToAdd,"songTitle": videoTitle,"songLength": videoLength,"isEmbeddable": isEmbeddable,"allowedRegions": allowedRegions}]);
						} else {
							reject('failed getYouTubeSongData');
						}
					}
				} else {
					reject('failed getYouTubeSongData');
				}
			});
		} else {
			reject('failed getYouTubeSongData');
		}
	});
}

var getYouTubePlaylistIDFromChatMessage = function(passedInfo) {
	return new Promise((resolve, reject) => {
		if ((passedInfo.length == 34 || passedInfo.length == 24 || passedInfo.length == 13) && !passedInfo.includes(" ")) {
			resolve(passedInfo);
		} else if (passedInfo.includes("http")) {
			var tempSplit = passedInfo.split('?');
			var query = functions.parseQuery(tempSplit[1]);
			var playlistID = query['list'];
			resolve(playlistID);
		} else if (passedInfo.indexOf('list=') > -1) {
			var query = functions.parseQuery(passedInfo);
			var playlistID = query['list'];
			resolve(playlistID);
		} else {
			reject('Invalid Playlist! To request a playlist, type the following: !pr PlaylistID or YouTube URL');
		}
	})
}

var getYouTubeVideoIDFromChatMessage = function(passedInfo) {
	return new Promise((resolve, reject) => {
		if (passedInfo.length == 11 && !passedInfo.includes(" ")) {
			resolve(passedInfo);
		} else if (passedInfo.includes("http")) {
			if (passedInfo.includes("://youtu.be")) {
				var vars = passedInfo.split('/');
				var finalVideoID = vars[3];
			} else {
				if (passedInfo.includes("?") && passedInfo.includes("v")) {
					var tempSplit = passedInfo.split('?');
					var query = functions.parseQuery(tempSplit[1]);
					var finalVideoID = query['v'];
				} else {
					var vars = passedInfo.split('/');
					var finalVideoID = vars[3];
				}
			}
			if (finalVideoID.length == 11) {
				resolve(finalVideoID);
			} else {
				reject('Invalid URL! To request a song, type the following: !sr youtube URL, video ID, or the song name');
			}
		} else if (passedInfo.indexOf('v=') > -1) {
			var tempSplit = passedInfo.split('?');
			var query = functions.parseQuery(tempSplit[1]);
			var videoID = query['v'];
			resolve(videoID);
		} else {
			var youTube = new YouTube();
			youTube.setKey(dbConstants.YouTubeAPIKey);
			youTube.search(passedInfo, 2, function(error, result) {
				var numberOfResults = result["pageInfo"]["totalResults"];
				if (numberOfResults > 0) {
					var videoID = result["items"][0]["id"]["videoId"];
					if (videoID) {
						resolve(videoID);
					} else {
						//videoID was not defined in the first result, so pull the second one
						//this happens when the search returns a channel first, rather than a video
						videoID = result["items"][1]["id"]["videoId"];
						if (videoID) {
							resolve(videoID);
						} else {
							reject('Song not found! To request a song, type the following: !sr youtube URL, video ID, or the song name');
						}
					}
				} else {
					reject('Song not found! To request a song, type the following: !sr youtube URL, video ID, or the song name');
				}
			})
		}
	})
}

var getFailedMessages = function(numberOfTooSoon,numberOfLength,numberOfExists,numberOfFailedIDs,numberOfSongsRequested,unavailableInCountry,numberOfFailedEmbed,YTData) {
	return new Promise((resolve, reject) => {
		var channelDefaultCountry = 'US';
		var msgArray = [];
		if (numberOfTooSoon) {
			if (numberOfTooSoon.length > 1) {
				msgArray.push(numberOfTooSoon.length + ' songs were played too recently');
			} else {
				if (numberOfSongsRequested > 1) {
					msgArray.push(numberOfTooSoon.length + ' song was played too recently');
				} else {
					msgArray.push('The song ' + YTData[0]['songTitle'] + ' was played too recently');
				}
			}
		}
		if (numberOfLength) {
			if (numberOfLength.length > 1) {
				msgArray.push(numberOfLength.length + ' songs are too long');
			} else {
				if (numberOfSongsRequested > 1) {
					msgArray.push(numberOfLength.length + ' song is too long')
				} else {
					msgArray.push('The song ' + YTData[0]['songTitle'] + ' is too long');
				}
			}
		}
		if (numberOfExists) {
			if (numberOfExists.length > 1) {
				msgArray.push(numberOfExists.length + ' songs already exist');
			} else {
				if (numberOfSongsRequested > 1) {
					msgArray.push(numberOfExists.length + ' song already exists');
				} else {
					msgArray.push('The song ' + YTData[0]['songTitle'] + ' already exists in the queue');
				}
			}
		}
		if (unavailableInCountry) {
			if (unavailableInCountry.length > 1) {
				msgArray.push(unavailableInCountry.length + ' songs were unavailable for playback in: ' + channelDefaultCountry);
			} else {
				if (numberOfSongsRequested > 1) {
					msgArray.push(unavailableInCountry.length + ' song was unavailable for playback in: ' + channelDefaultCountry);
				} else {
					msgArray.push('The song ' + YTData[0]['songTitle'] + ' is unavailable for playback in: ' + channelDefaultCountry);
				}
			}
		}
		if (numberOfFailedEmbed) {
			if (numberOfFailedEmbed.length > 1) {
				msgArray.push(numberOfFailedEmbed.length + ' songs were not allowed to be embeded');
			} else {
				if (numberOfSongsRequested > 1) {
					msgArray.push(numberOfFailedEmbed.length + ' song was not allowed to be embeded');
				} else {
					msgArray.push('The song ' + YTData[0]['songTitle'] + ' is not allowed to be embeded');
				}
			}
		}
		if (numberOfFailedIDs) {
			if (numberOfFailedIDs.length > 1) {
				msgArray.push(numberOfFailedIDs.length + ' IDs were invalid');
			} else {
				if (numberOfSongsRequested > 1) {
					msgArray.push(numberOfFailedIDs.length + ' ID was invalid');
				} else {
					msgArray.push('Invalid song ID');
				}
			}
		}
		if (msgArray[0]) {
			resolve(msgArray);
		} else {
			msgArray.push('Invalid song ID');
			resolve(msgArray);
		}
	})
}

var getNewSongSortOrder = function(db,channel) {
	return new Promise((resolve, reject) => {
		runSQL('select','songs',{channel:channel},'',db).then(results => {
			if (results) {
				//check sort order - determines the last song in the queue (largestsortorder) and adds to that number
				var largestSortOrder = 0;
				for (i = 0; i < results.length; i++) {
					if (largestSortOrder == 0) {
						largestSortOrder = results[i]['sortOrder'];
					} else {
						if (largestSortOrder < results[i]['sortOrder']) {
							largestSortOrder = results[i]['sortOrder'];
						}
					}
				}
				resolve(parseInt(largestSortOrder+100000,10));
			} else {
				resolve(100000);
			}
		});
	});
}

module.exports = {
	songlist: songlist,
	songcache: songcache,
	currentSong: currentSong,
	volume: volume,
	updateVolume: updateVolume,
	play: play,
	pause: pause,
	skip: skip,
	wrongSong: wrongSong,
	remove: remove,
	promote: promote,
	shuffle: shuffle,
	requestSongs: requestSongs,
	requestPlaylist: requestPlaylist
};