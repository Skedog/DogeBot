async function startSocket(socketURL,page,channelData) {
	const socket = io.connect(socketURL);
	socket.on('songs', async function(data) {
		if (data[0] == 'skipped') {
			if (page == 'currentsonginfo') {
				getNewSongInfo(); //currentsonginfo page
			}
			if (page == 'songs' || page == 'player' || page == 'moderation' || page == 'mobile') {
				const songlist = await loadSonglist(channelData,page);
				if (songlist) {
					dataTableStartSize = '5';
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
		} else if (data[0] == 'volumeupdated') {
			if (page == 'player') {
				if (typeof player != 'undefined') {
					player.setVolume(data[1]);
				}
			}
			updateOnScreenVolume(data[1]);
		} else if (data[0] == 'statuschange') {
			if (data[1] == 'pause') {
				if (page == 'player') {
					if (typeof player != 'undefined') {
						player.pauseVideo();
					}
				}
				$('.togglePlay').text('Play');
			} else if (data[1] == 'play') {
				if (page == 'player') {
					if (typeof player != 'undefined') {
						player.playVideo();
					}
				}
				$('.togglePlay').text('Pause');
			};
		} else if (data[0] == 'added' || data[0] == 'removed' || data[0] == 'promoted' || data[0] == 'shuffled') {
			if (page == 'songs' || page == 'player' || page == 'moderation' || page == 'mobile') {
				const songlist = await loadSonglist(channelData,page);
				if (songlist) {
					if (page == 'songs') {
						dataTableStartSize = '25';
					} else {
						dataTableStartSize = '5';
					};
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
					if (player.getVideoData()['video_id'] != songToPlay) {
						player.loadVideoById(songToPlay);
					}
				} else if (page == 'player') {
					loadPlayer();
				}
			}
			if (page == 'currentsonginfo') {
				getNewSongInfo(); //currentsonginfo page
			}
		}
	});

	socket.on('commands', async function(data) {
		if (data[0] == 'added' || data[0] == 'updated' || data[0] == 'deleted') {
			if (page == 'commands') {
				const channelName = await getChannelName(passedUser);
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
	})
};