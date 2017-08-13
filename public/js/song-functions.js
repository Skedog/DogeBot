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
	await $.ajax({
		url: '/getsonglist',
		data: data,
		type: 'POST',
		success: function(data) {
			if (data != '') {
				dataToReturn = data[0]['songID'];
			} else {
				dataToReturn = undefined;
			};
		}
	});
	return dataToReturn;
}

async function loadSonglist(data,page) {
	let dataToReturn;
	await $.ajax({
		url: '/getsonglist',
		data: data,
		type: 'POST',
		success: function(data) {
			if (data != '') {
				var contentData = '';
				$.each(data, function(key, value) {
					if (key == 0) {
						$('.currentsong').html('<strong>Song Title:</strong> ' + data[0]['songTitle'] + '<br><strong>Requested:</strong> ' + data[0]['whoRequested']);
					}
					if (page == 'moderation') {
						if (key == 0 || key == 1) {
							contentData = contentData + '<tr><td>' + (key + 1) + '</td><td><a href="https://youtu.be/' + data[key]['songID'] + '" target="_blank">' + data[key]['songTitle'] + '</a></td><td>' + data[key]['whoRequested'] + '</td><td>&nbsp;</td><td><input type="button" value="X" id="' + (key + 1) + '" class="removeButton blue-styled-button mini" /></td></tr>';
						} else {
							contentData = contentData + '<tr><td>' + (key + 1) + '</td><td><a href="https://youtu.be/' + data[key]['songID'] + '" target="_blank">' + data[key]['songTitle'] + '</a></td><td>' + data[key]['whoRequested'] + '</td><td><input type="button" value="&uarr;" id="' + data[key]['songID'] + '" class="promoteButton blue-styled-button mini" /></td><td><input type="button" value="X" id="' + (key + 1) + '" class="removeButton blue-styled-button mini" /></td></tr>';
						}
					} else if (page == 'player') {
						contentData = contentData + '<tr><td>' + (key + 1) + '</td><td><a href="https://youtu.be/' + data[key]['songID'] + '" target="_blank">' + data[key]['songTitle'] + '</a></td><td>' + data[key]['whoRequested'] + '</td></tr>';
					} else {
						contentData = contentData + '<tr><td>' + (key + 1) + '</td><td>' + data[key]['songTitle'] + '</td><td><a href="https://youtu.be/' + data[key]['songID'] + '" target="_blank">' + data[key]['songID'] + '</a></td><td>' + data[key]['whoRequested'] + '</td></tr>';
					};
				});
				dataToReturn = contentData;
			} else {
				dataToReturn = false;
			};
		}
	});
	return dataToReturn;
}

async function loadSongCache(data) {
	let dataToReturn = '';
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
		$('.togglePlay').text('Play');
	} else {
		if (typeof player != 'undefined') {
			player.playVideo();
		};
		$('.togglePlay').text('Pause');
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