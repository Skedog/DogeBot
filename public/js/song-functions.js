function updateOnScreenVolume(currentVolume) {
	$('.currentvolume').html('<strong>Current Volume: </strong>' + currentVolume);
	$('#volumeInput').val(currentVolume);
	$('#volumeRange').val(currentVolume);
}

async function promoteSong(songToPromote,channelName,loggedInChannel) {
	let dataToReturn;
	await $.ajax({
		url: '/promotesong',
		data: 'songToPromote=' + songToPromote + '&channel=' + channelName + '&loggedInChannel=' + loggedInChannel,
		type: 'POST',
		success: function(data) {
			dataToReturn = data;
		}
	});
	return dataToReturn;
};

async function getFirstSongInQueue(data) {
	let dataToReturn;
	let songlist;
	songlist = await loadSonglist(data);
	if (songlist) {
		dataToReturn = songlist[0];
	} else {
		dataToReturn = undefined;
	}
	return dataToReturn;
}

async function loadSonglist(data) {
	let dataToReturn;
	await $.ajax({
		url: '/getsonglist',
		data: data,
		type: 'POST',
		success: function(data) {
			dataToReturn = data;
		}
	});
	return dataToReturn;
}

async function loadFormattedSonglist(data,page) {
	let dataToReturn;
	let songlist;
	songlist = await loadSonglist(data);
	if (songlist != '') {
		var contentData = '';
		$.each(songlist, function(key, value) {
			if (key == 0) {
				let currentSongTitle = songlist[0]['songTitle'];
				let currentSongWhoRequested = songlist[0]['whoRequested'];
				$('.currentsong').html('<strong>Song Title:</strong> ' + currentSongTitle + '<br><strong>Requested:</strong> ' + currentSongWhoRequested);
			}
			if (page == 'moderation') {
				if (key == 0 || key == 1) {
					contentData = contentData + '<tr><td>' + (key + 1) + '</td><td><a href="https://youtu.be/' + songlist[key]['songID'] + '" target="_blank">' + songlist[key]['songTitle'] + '</a></td><td>' + songlist[key]['whoRequested'] + '</td><td><div class="moderationBtns"><input type="button" value="X" id="' + (key + 1) + '" class="removeButton blue-styled-button mini" /></div></td></tr>';
				} else {
					contentData = contentData + '<tr><td>' + (key + 1) + '</td><td><a href="https://youtu.be/' + songlist[key]['songID'] + '" target="_blank">' + songlist[key]['songTitle'] + '</a></td><td>' + songlist[key]['whoRequested'] + '</td><td><div class="moderationBtns"><input type="button" value="&uarr;" id="' + songlist[key]['songID'] + '" class="promoteButton blue-styled-button mini" /><input type="button" value="X" id="' + (key + 1) + '" class="removeButton blue-styled-button mini" /></div></td></tr>';
				}
			} else if (page == 'player') {
				contentData = contentData + '<tr><td>' + (key + 1) + '</td><td><a href="https://youtu.be/' + songlist[key]['songID'] + '" target="_blank">' + songlist[key]['songTitle'] + '</a></td><td>' + songlist[key]['whoRequested'] + '</td></tr>';
			} else {
				contentData = contentData + '<tr><td>' + (key + 1) + '</td><td>' + songlist[key]['songTitle'] + '</td><td><a href="https://youtu.be/' + songlist[key]['songID'] + '" target="_blank">' + songlist[key]['songID'] + '</a></td><td>' + songlist[key]['whoRequested'] + '</td></tr>';
			};
		});
		dataToReturn = contentData;
	} else {
		dataToReturn = false;
	};
	return dataToReturn;
}

async function loadFormattedSongCache(data) {
	let dataToReturn;
	await $.ajax({
		url: '/getsongcache',
		data: data,
		type: 'POST',
		success: function(data) {
			if (data != '') {
				var contentData = '';
				$.each(data, function(key, value) {
					contentData = contentData + '<tr><td>' + (key + 1) + '</td><td>' + data[key]['songTitle'] + '</td><td><a href="https://youtu.be/' + data[key]['songID'] + '" target="_blank">' + data[key]['songID'] + '</a></td></tr>';
				});
				dataToReturn = contentData;
			} else {
				dataToReturn = false;
			};
		}
	});
	return dataToReturn;
}

function removeSong(songToRemove,channelName,loggedInChannel) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: '/removesong',
			data: 'songToRemove=' + songToRemove + '&channel=' + channelName + '&loggedInChannel=' + loggedInChannel,
			type: 'POST',
			success: function(data) {
				resolve(data);
			}
		});
	});
};

function promoteSong(songToPromote,channelName,loggedInChannel) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: '/promotesong',
			data: 'songToPromote=' + songToPromote + '&channel=' + channelName + '&loggedInChannel=' + loggedInChannel,
			type: 'POST',
			success: function(data) {
				resolve(data);
			}
		});
	});
};

async function getVolume(channelData) {
	let dataToReturn = '';
	await $.ajax({
		url: '/getvolume',
		data: channelData,
		type: 'POST',
		success: function(data) {
			dataToReturn = data[0]['volume'];
		}
	})
	return dataToReturn;
}

async function updateVolume(channelData,newVol) {
	let dataToReturn = '';
	await $.ajax({
		url: '/updatevolume',
		data: channelData + '&volume=' + newVol,
		type: 'POST',
		success: function(data) {
			dataToReturn = newVol;
		}
	});
	return dataToReturn;
}

async function getMusicStatus(channelData) {
	let dataToReturn = '';
	await $.ajax({
		url: '/getmusicstatus',
		data: channelData,
		type: 'POST',
		success: function(data) {
			dataToReturn = data;
		}
	})
	return dataToReturn;
}

async function applyMusicStatus(channelData) {
	let musicStatus = await getMusicStatus(channelData);
	if (musicStatus[0]['musicStatus'] == 'pause') {
		if (typeof player != 'undefined') {
			player.pauseVideo();
		};
		$('.togglePlay').html('<i class="fa fa-play" title="Play"></i>');
	} else {
		if (typeof player != 'undefined') {
			player.playVideo();
		};
		$('.togglePlay').html('<i class="fa fa-pause" title="Pause"></i>');
	};
}


async function updateMusicStatus(channelData,musicStatus) {
	await $.ajax({
		url: '/updatemusicstatus',
		data: channelData + '&musicStatus=' + musicStatus,
		type: 'POST'
	});
	return;
}

async function volumeBtnClick(volumnBtn) {
	const direction = volumnBtn.attr('id');
	const currentVolume = await getVolume(channelData);
	let newVol;
	if (direction == 'up') {
		if (currentVolume < 90) {
			newVol = Number(currentVolume) + 10;
		} else {
			newVol = 100;
		};
	} else {
		if (currentVolume > 10) {
			newVol = currentVolume - 10;
		} else {
			newVol = 10;
		};
	};
	return newVol;
}

async function loadNextSong() {
	let dataToUse;
	await $.ajax({
		url: '/loadnextsong',
		data: channelData,
		type: 'POST',
		success: function(data) {
			dataToUse = data;
		}
	});
	if (dataToUse != 'empty') {
		if (typeof player != 'undefined') {
			player.loadVideoById(dataToUse);
		}
	};
}

function handlePlayPauseClick(item) {
	item.click(async function(e) {
		e.preventDefault();
		if ($(this).html() == '<i class="fa fa-pause" title="Pause"></i>') {
			await updateMusicStatus(channelData,'pause');
			$(this).html('<i class="fa fa-play" title="Play"></i>');
			player.pauseVideo();
		} else {
			await updateMusicStatus(channelData,'play');
			$(this).html('<i class="fa fa-pause" title="Pause"></i>');
			player.playVideo();
		};
	});
}

function handleVolumeClick(item) {
	item.click(async function(e) {
		e.preventDefault();
		let newVol = await volumeBtnClick($(this));
		await updateVolume(channelData,newVol);
		if (player) {
			player.setVolume(newVol);
		}
		updateOnScreenVolume(newVol);
	});
}

function handleSkipClick(item) {
	item.click(function(e) {
		e.preventDefault();
		loadNextSong();
	});
}

