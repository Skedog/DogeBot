function updateOnScreenVolume(currentVolume) {
	$('.currentvolume').html('<strong>Current Volume: </strong>' + currentVolume);
	$('#volumeInput').val(currentVolume);
	$('#volumeRange').val(currentVolume);
}

async function loadSocketData(channelData, page, dataToGet) {
	let dataToReturn;
	await $.ajax({
		url: '/getsocketdata',
		data: channelData + '&dataToGet=' + dataToGet + '&page=' + page,
		type: 'POST',
		success: function(data) {
			dataToReturn = data;
		}
	});
	return dataToReturn;
}

async function loadUserData(channelData) {
	let dataToReturn;
	await $.ajax({
		url: '/getUserData',
		data: channelData,
		type: 'POST',
		success: function(data) {
			dataToReturn = data;
		}
	});
	return dataToReturn;
}

function removeSong(songToRemove, channelName) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: '/removesong',
			data: 'songToRemove=' + songToRemove + '&channel=' + channelName,
			type: 'POST',
			success: function(data) {
				resolve(data);
			}
		});
	});
};

function promoteSong(songToPromote,channelName) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: '/promotesong',
			data: 'songToPromote=' + songToPromote + '&channel=' + channelName,
			type: 'POST',
			success: function(data) {
				resolve(data);
			}
		});
	});
};

async function updateVolume(channel, newVol) {
	let dataToReturn = '';
	if (!channel.includes('#')) {
		channel = '#' + channel;
	}
	await $.ajax({
		url: '/updatevolume',
		data: 'channel=' + channel + '&volume=' + newVol,
		type: 'POST',
		success: function(data) {
			dataToReturn = newVol;
		}
	});
	return dataToReturn;
}

async function getMusicStatus(channel) {
	let dataToReturn = '';
	await $.ajax({
		url: '/getUserData',
		data: 'channel=' + channel,
		type: 'POST',
		success: function(data) {
			if (data) {
				dataToReturn = data.channelInfo[0].musicStatus;
			}
		}
	})
	return dataToReturn;
}

async function applyMusicStatus(musicStatus) {
	if (musicStatus === 'pause') {
		if (typeof player !== 'undefined') {
			player.pauseVideo();
		};
		$('.togglePlay').html('<i class="fa fa-play" title="Play"></i>');
	} else {
		if (typeof player !== 'undefined') {
			player.playVideo();
		};
		$('.togglePlay').html('<i class="fa fa-pause" title="Pause"></i>');
	};
}


async function updateMusicStatus(channel, musicStatus) {
	if (!channel.includes('#')) {
		channel = '#' + channel;
	}
	await $.ajax({
		url: '/updatemusicstatus',
		data: 'channel=' + channel + '&musicStatus=' + musicStatus,
		type: 'POST'
	});
	return;
}

async function volumeBtnClick(volumnBtn, currentVolume) {
	const direction = volumnBtn.attr('id');
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

async function loadNextSong(channel) {
	if (!channel.includes('#')) {
		channel = '#' + channel;
	}
	let dataToUse;
	if (typeof player !== 'undefined') {
		player.loadVideoById(null);
	}
	await $.ajax({
		url: '/loadnextsong',
		data: 'channel=' + channel,
		type: 'POST',
		success: function(data) {
			dataToUse = data;
		}
	});
	if (dataToUse !== 'empty') {
		if (typeof player !== 'undefined') {
			player.loadVideoById(dataToUse);
		}
	};
	defaultPlaylistCheck(channel);
}

async function defaultPlaylistCheck(channel) {
	if (!channel.includes('#')) {
		channel = '#' + channel;
	}
	let dataToUse;
	await $.ajax({
		url: '/defaultPlaylistCheck',
		data: 'channel=' + channel,
		type: 'POST',
		success: function(data) {
			dataToUse = data;
		}
	});
}

async function shuffleSongs(channel) {
	if (!channel.includes('#')) {
		channel = '#' + channel;
	}
	let dataToUse;
	await $.ajax({
		url: '/shufflesongs',
		data: 'channel=' + channel,
		type: 'POST',
		success: function(data) {
			dataToUse = data;
		}
	});
}

function handlePlayPauseClick(item, channel) {
	item.click(async function(e) {
		e.preventDefault();
		if ($(this).html().trim() === '<i class="fa fa-pause" title="Pause"></i>') {
			await updateMusicStatus(channel, 'pause');
			$(this).html('<i class="fa fa-play" title="Play"></i>');
			if (typeof player !== 'undefined') {
				player.pauseVideo();
			}
		} else {
			await updateMusicStatus(channel, 'play');
			$(this).html('<i class="fa fa-pause" title="Pause"></i>');
			if (typeof player !== 'undefined') {
				player.playVideo();
			}
		};
	});
}

function handleVolumeClick(item, channel) {
	item.click(async function(e) {
		e.preventDefault();
		const currentVolume = $('.currentvolume').text().replace('Current Volume: ', '');
		let newVol = await volumeBtnClick($(this), currentVolume);
		await updateVolume(channel, newVol);
		if (typeof player !== 'undefined') {
			player.setVolume(newVol);
		}
		updateOnScreenVolume(newVol);
	});
}

function handleSkipClick(item, channel) {
	item.click(function(e) {
		e.preventDefault();
		loadNextSong(channel);
	});
}

function handleShuffleClick(item, channel) {
	item.click(async function(e) {
		e.preventDefault();
		await shuffleSongs(channel);
	});
}