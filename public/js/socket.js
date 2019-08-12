async function startSocket(socketURL, page, channelData, channelName) {
	const socket = io.connect(socketURL, {
		reconnection: true,
		reconnectionDelay: 1000,
		reconnectionDelayMax: 5000,
		reconnectionAttempts: 99999
	});

	socket.on('connect', function(socket2) {
		socket.emit('room', stripHash(channelName));
	});

	socket.on('songs', async function(data) {
		if (data[0] === 'skipped') {
			handleSkippedSocket(data, page, channelData);
		} else if (data[0] === 'twitchSkip') {
			if (page === 'player') {
				const songlist = await loadSocketData(channelData, page, 'formattedsonglist');
				if (songlist.length === 0) {
					const currentChannel = channelData.slice(8);
					loadNextSong(currentChannel);
				}
			}
		} else if (data[0] === 'volumeupdated') {
			handleVolumeUpdatedSocket(data, page, channelData);
		} else if (data[0] === 'statuschange') {
			handleStatusChangeSocket(data, page, channelData);
		} else if (data[0] === 'added' || data[0] === 'removed' || data[0] === 'promoted' || data[0] === 'shuffled') {
			handleSonglistChangeSocket(data, page, channelData);
		}
	});

	socket.on('blacklist', async function(data) {
		if (data[0] === 'added' || data[0] === 'removed') {
			handleBlacklistChangeSocket(data, page, channelData);
		}
	});

	socket.on('commands', async function(data) {
		if (data[0] === 'added' || data[0] === 'updated' || data[0] === 'deleted') {
			handleCommandChangeSocket(data, page, channelData);
		}
	});

	socket.on('notification', async function(data) {
		$('.notifications').append('<li><a href="#"><span class="close" id="' + data[1] + '"><i class="fa fa-times"></i></span>' + data[0] + '</a></li>');
		$('.notifications-link .notification-counter').html($('.notifications li').length);
		$('.notifications p').remove();
		const notificationInterval = setInterval(flashNotificationBell, 500);
	});
};

async function handleSkippedSocket(data, page, channelData) {
	if (page === 'currentsonginfo') {
		const firstSongInQueue = await loadSocketData(channelData, page, 'firstsonginsonglist');
		$('.songtitle').text(firstSongInQueue.songTitle);
	}
	if (page === 'songs' || page === 'player' || page === 'moderation' || page === 'mobile') {
		const songlist = await loadSocketData(channelData, page, 'formattedsonglist');
		if (songlist) {
			if (readCookie(page)) {
				dataTableStartSize = readCookie(page);
			} else {
				dataTableStartSize = '25';
			}
			buildDataTable('.datatable', dataTableStartSize, songlist);
			$('.nosongs').hide();
			const userData = await loadUserData(channelData);
			updateOnScreenVolume(userData.channelInfo[0].volume);
			const songToPlay = await loadSocketData(channelData, page, 'firstsonginsonglist');
			if (typeof player !== 'undefined') {
				if (player.getVideoData().video_id !== songToPlay.songID) {
					player.loadVideoById(songToPlay.songID);
				}
			} else if (page === 'player') {
				loadPlayer();
			}
			const formattedfirstsong = await loadSocketData(channelData, page, 'formattedfirstsong');
			$('.currentsong').html(formattedfirstsong);
		} else {
			$('.currentsong').html('');
			$('.currentvolume').html('');
			$('.datatable tbody').html('<tr class="odd"><td colspan="4" class="tac">No songs in songlist!</td></tr>');
		};
		const formattedfirstsong = await loadSocketData(channelData, page, 'formattedfirstsong');
		$('.currentsong').html(formattedfirstsong);
	}
}

async function handleVolumeUpdatedSocket(data, page, channelData) {
	if (page === 'player') {
		if (typeof player !== 'undefined') {
			player.setVolume(data[1]);
		}
	}
	updateOnScreenVolume(data[1]);
}

async function handleStatusChangeSocket(data, page, channelData) {
	if (data[1] === 'pause') {
		if (page === 'player') {
			if (typeof player !== 'undefined') {
				player.pauseVideo();
			}
		}
		$('.togglePlay').html('<i class="fa fa-play" title="Play"></i>');
	} else if (data[1] === 'play') {
		if (page === 'player') {
			if (typeof player != 'undefined') {
				player.playVideo();
			}
		}
		$('.togglePlay').html('<i class="fa fa-pause" title="Pause"></i>');
	};
}

async function handleSonglistChangeSocket(data, page, channelData) {
	if (page === 'songs' || page === 'player' || page === 'moderation' || page === 'mobile') {
		const songlist = await loadSocketData(channelData, page, 'formattedsonglist');
		if (songlist) {
			if (readCookie(page)) {
				dataTableStartSize = readCookie(page);
			} else {
				dataTableStartSize = '25';
			}
			buildDataTable('.datatable', dataTableStartSize, songlist);
			$('.nosongs').hide();
			const userData = await loadUserData(channelData);
			updateOnScreenVolume(userData.channelInfo[0].volume);
		} else {
			$('.currentsong').html('');
			$('.currentvolume').html('');
			$('.datatable tbody').html('<tr class="odd"><td colspan="4" class="tac">No songs in songlist!</td></tr>');
			const currentChannel = channelData.slice(8);
			loadNextSong(currentChannel);
		};
		const songToPlay = await loadSocketData(channelData, page, 'firstsonginsonglist');
		if (typeof player !== 'undefined') {
			if (player.getVideoData().video_id !== songToPlay.songID) {
				player.loadVideoById(songToPlay.songID);
			}
		} else if (page === 'player') {
			loadPlayer();
		}
		const formattedfirstsong = await loadSocketData(channelData, page, 'formattedfirstsong');
		$('.currentsong').html(formattedfirstsong);
	}
	if (page === 'currentsonginfo') {
		const firstSongInQueue = await loadSocketData(channelData, page, 'firstsonginsonglist');
		$('.songtitle').text(firstSongInQueue.songTitle);
	}
}

async function handleBlacklistChangeSocket(data, page, channelData) {
	if (page == 'blacklist') {
		const blacklist = await loadSocketData(channelData, page, 'blacklist');
		if (blacklist) {
			if (readCookie(page)) {
				dataTableStartSize = readCookie(page);
			} else {
				dataTableStartSize = '25';
			}
			if ($('.datatable').length) {
				buildDataTable('.datatable', dataTableStartSize, blacklist);
			};
			$('.nosongs').hide();
		} else {
			$('.datatable tbody').html('<tr class="odd"><td colspan="4" class="tac">No songs in blacklist!</td></tr>');
		};
	}
}

async function handleCommandChangeSocket(data, page, channelData) {
	if (page === 'commands') {
		const commandsData = await loadSocketData(channelData, page, 'commands');
		if (commandsData) {
			if (readCookie(page)) {
				dataTableStartSize = readCookie(page);
			} else {
				dataTableStartSize = '25';
			}
			buildDataTable('.datatable', dataTableStartSize, commandsData);
		} else {
			$('.datatable tbody').html('<tr class="odd"><td colspan="4" class="tac">No commands added!</td></tr>');
		};
	};
}