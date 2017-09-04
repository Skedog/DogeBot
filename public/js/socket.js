async function startSocket(socketURL, page, channelData) {

	const channelName = await getChannelName(passedUser);
	const socket = io.connect(socketURL);

	socket.on('connect', function(socket2) {
		socket.emit('room', stripHash(channelName));
	});

	socket.on('songs', async function(data) {
		if (data[0] == 'skipped') {
			handleSkippedSocket(data, page, channelData);
		} else if (data[0] == 'volumeupdated') {
			handleVolumeUpdatedSocket(data, page, channelData);
		} else if (data[0] == 'statuschange') {
			handleStatusChangeSocket(data, page, channelData);
		} else if (data[0] == 'added' || data[0] == 'removed' || data[0] == 'promoted' || data[0] == 'shuffled') {
			handleSonglistChangeSocket(data, page, channelData);
		}
	});

	socket.on('blacklist', async function(data) {
		if (data[0] == 'added' || data[0] == 'removed') {
			handleBlacklistChangeSocket(data, page, channelData);
		}
	});

	socket.on('commands', async function(data) {
		if (data[0] == 'added' || data[0] == 'updated' || data[0] == 'deleted') {
			handleCommandChangeSocket(data, page, channelData);
		}
	})
};

async function handleSkippedSocket(data, page, channelData) {
	if (page == 'currentsonginfo') {
		getNewSongInfo(); //currentsonginfo page
	}
	if (page == 'songs' || page == 'player' || page == 'moderation' || page == 'mobile') {
		const songlist = await loadFormattedSonglist(channelData,page);
		if (songlist) {
			dataTableStartSize = '25';
			buildDataTable(songlist,'.datatable',dataTableStartSize);
			$('.nosongs').hide();
			const currentVolume = await getVolume(channelData);
			updateOnScreenVolume(currentVolume);
		} else {
			$('.dataTables_wrapper').hide();
			$('.nosongs').show();
			$('.currentsong').html('');
			$('.currentvolume').html('');
			$('.nosongs').html("Currently no songs in the queue!");
		};
	}
	if (page == 'player' || page == 'moderation') {
		applyMusicStatus(channelData);
		if (typeof player != 'undefined') {
			player.loadVideoById(data[1]);
		}
	}
}

async function handleVolumeUpdatedSocket(data, page, channelData) {
	if (page == 'player') {
		if (typeof player != 'undefined') {
			player.setVolume(data[1]);
		}
	}
	updateOnScreenVolume(data[1]);
}

async function handleStatusChangeSocket(data, page, channelData) {
	if (data[1] == 'pause') {
		if (page == 'player') {
			if (typeof player != 'undefined') {
				player.pauseVideo();
			}
		}
		$('.togglePlay').html('<i class="fa fa-play" title="Play"></i>');
	} else if (data[1] == 'play') {
		if (page == 'player') {
			if (typeof player != 'undefined') {
				player.playVideo();
			}
		}
		$('.togglePlay').html('<i class="fa fa-pause" title="Pause"></i>');
	};
}

async function handleSonglistChangeSocket(data, page, channelData) {
	if (page == 'songs' || page == 'player' || page == 'moderation' || page == 'mobile') {
		const songlist = await loadFormattedSonglist(channelData,page);
		if (songlist) {
			dataTableStartSize = '25';
			if ($('.datatable').length) {
				buildDataTable(songlist,'.datatable',dataTableStartSize);
			};
			$('.nosongs').hide();
			const currentVolume = await getVolume(channelData);
			updateOnScreenVolume(currentVolume);
		} else {
			$('.dataTables_wrapper').hide();
			$('.nosongs').show();
			$('.currentsong').html('');
			$('.currentvolume').html('');
			$('.nosongs').html("Currently no songs in the queue!");
		};
		const songToPlay = await getFirstSongInQueue(channelData);
		if (typeof player != 'undefined') {
			if (player.getVideoData()['video_id'] != songToPlay['songID']) {
				player.loadVideoById(songToPlay['songID']);
			}
		} else if (page == 'player') {
			loadPlayer();
		}
	}
	if (page == 'currentsonginfo') {
		getNewSongInfo(); //currentsonginfo page
	}
}

async function handleBlacklistChangeSocket(data, page, channelData) {
	if (page == 'blacklist') {
		const blacklist = await loadFormattedSongBlacklist(channelData,page);
		if (blacklist) {
			dataTableStartSize = '25';
			if ($('.datatable').length) {
				buildDataTable(blacklist,'.datatable',dataTableStartSize);
			};
			$('.nosongs').hide();
		} else {
			$('.dataTables_wrapper').hide();
			$('.nosongs').show();
			$('.nosongs').html("Currently no songs in the blacklist!");
		};
	}
}

async function handleCommandChangeSocket(data, page, channelData) {
	if (page == 'commands') {
		let commandsData = await getCommands(channelName);
		if (commandsData) {
			dataTableStartSize = '25';
			buildDataTable(commandsData,'.datatable',dataTableStartSize);
		} else {
			$('.datatable tbody').hide();
			$('.commandssection').html("You haven't added any commands yet!");
		};
	};
}