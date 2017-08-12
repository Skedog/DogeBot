let userDetails = decodeURIComponent(readCookie("userDetails")).split(',');
if (typeof userDetails[2] != 'undefined') {
	$.ajax({
		url: '/loggedinnav',
		type: 'GET',
		success: function(data) {
			$('.navbar-nav').html(data);
		}
	});
} else {
	$.ajax({
		url: '/nav',
		type: 'GET',
		success: function(data) {
			$('.navbar-nav').html(data);
		}
	});
};

function updateTextVolume(currentVolume) {
	$('.currentvolume').html('<strong>Current Volume: </strong>' + currentVolume);
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
							contentData = contentData + '<tr><td>' + (key + 1) + '</td><td><a href="https://youtu.be/' + data[key]['songID'] + '" target="_blank">' + data[key]['songTitle'] + '</a></td><td>' + data[key]['whoRequested'] + '</td><td></td><td><input type="button" value="X" id="' + (key + 1) + '" class="removeButton blue-styled-button mini" /></td></tr>';
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

async function getCommands(channelName) {
	let channelData = await buildChannelDataString(channelName);
	let dataToReturn = '';
	await $.ajax({
		url: '/getcommands',
		data: channelData,
		type: 'POST',
		success: function(data) {
			if (data != '') {
				var contentData = '';
				for (let item of data) {
					contentData = contentData + '<tr><td>' + item['trigger'] + '</td><td>' + item['chatmessage'] + '</td><td>' + item['commandcounter'] + '</td><td>' + item['permissionsLevel'] + '</td></tr>';
				}
				dataToReturn = contentData;
			} else {
				dataToReturn = false;
			};
		}
	});
	return dataToReturn;
}

function getDefaultCommands(channelName) {
	return new Promise((resolve, reject) => {
		buildChannelDataString(channelName).then(channelData => {
			$.ajax({
				url: '/getdefaultcommands',
				data: channelData,
				type: 'POST',
				success: function(data) {
					if (data != '') {
						var contentData = '';
						var permissionData = '';
						$.each(data, function(key, value) {
							permissionData = '';
							$.each(data[key]['permissionsPerChannel'], function(key2, value2) {
								if (value2['channel'] == channelName) {
									permissionData = permissionData + value2['permissionLevel'];
								};
							});
							var trigger = data[key]['trigger'];
							if (!data[key]['isAlias']) {
								contentData = contentData + '<tr><td>' + channelName + '</td><td>' + trigger + '</td><td>' + permissionData + '</td></tr>';
							};
						});
						resolve(contentData);
					} else {
						resolve(false);
					};
				}
			});
		});
	});
}

function buildDataTable(passedData,elementToUse,startSize) {
	$('.datatable').DataTable().destroy();
	$(elementToUse + ' tbody').html(passedData);
	if (startSize == '25') {
		$(elementToUse).DataTable({
			"lengthMenu": [[25, 50, -1], [25, 50, "All"]]
		});
	} else if (startSize == '5') {
		$(elementToUse).DataTable({
			"lengthMenu": [[5, 10, 25, -1], [5, 10, 25, "All"]]
		});
	} else if (startSize == 'All') {
		$(elementToUse).DataTable({
			"lengthMenu": [[-1, 5, 10, 25], ["All", 5, 10, 25]],
			"columns": [{ "orderable": false },{ "orderable": false },{ "orderable": false },{ "orderable": false },{ "orderable": false }]
		});
	}
	$('.songinfo').hide();
	$(elementToUse).show();
}

async function joinChannel(channelName) {
	let channelData = await buildChannelDataString(channelName);
	let dataToReturn = '';
	await $.ajax({
		url: '/joinchannel',
		data: channelData,
		type: 'POST',
		success: function(data) {
			dataToReturn = data;
		}
	});
	return dataToReturn;
}

async function leaveChannel(channelName) {
	let channelData = await buildChannelDataString(channelName);
	let dataToReturn = '';
	await $.ajax({
		url: '/partchannel',
		data: channelData,
		type: 'POST',
		success: function(data) {
			dataToReturn = data;
		}
	});
	return dataToReturn;
}

async function checkIfInChannel(channelName) {
	let channelData = await buildChannelDataString(channelName);
	let dataToReturn = '';
	await $.ajax({
		url: '/checkifinchannel',
		data: channelData,
		type: 'POST',
		success: function(data) {
			dataToReturn = data;
		}
	});
	return dataToReturn;
};

function getChannelName(urlUser) {
	if (urlUser != 'undefined') {
		passedUser = urlUser;
		return urlUser;
	} else {
		passedUser = userDetails[2];
		return userDetails[2];
	};
};

function buildChannelDataString(channelName) {
	if (channelName.includes('#')) {
		return 'channel=' + channelName;
	} else {
		return 'channel=#' + channelName;
	};
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

function checkForSonglistChanges(channelData,songlist,dataTableStartSize,page) {
	this['checkSkippedSongsInterval'] = setInterval(function() {
		loadSonglist(channelData,page).then(songlistReload => {
			if (songlist != songlistReload) {
				buildDataTable(songlistReload,'.datatable',dataTableStartSize);
				songlist = songlistReload;
			}
		});
	}, 1000);
}

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
		if (typeof player != "undefined") {
			player.pauseVideo();
		};
		$('.togglePlay').text('Play');
	} else {
		if (typeof player != "undefined") {
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

var passedUser = ''; //this is needed to make the window resize function below work
var passedPage = ''; //this is needed to make the window resize function below work
var dataTableStartSize = '';
var isCache = false;
var isCommands = false;

async function startPageLoad(cookieChannel) {
	let channelName = await getChannelName(cookieChannel);
}

$(document).ready(function() {
	let socketURL;
	const getUrl = window.location;
	socketURL = getUrl .protocol + "//" + getUrl.host + "/";
	const socket = io.connect(socketURL);
	socket.on('songs', async function(data) {
		if (data[0] == 'skipped') {
			const channelName = await getChannelName(passedUser);
			const channelData = await buildChannelDataString(channelName);
			const URLSplit = window.location.pathname.split('/');
			const page = URLSplit[1];
			if (page == 'currentsonginfo') {
				getNewSongInfo(); //currentsonginfo page
			}
			const songlist = await loadSonglist(channelData,page);
			if (typeof player != "undefined") {
				player.loadVideoById(data[1]);
			}
			if (songlist) {
				dataTableStartSize = '5';
				buildDataTable(songlist,'.datatable',dataTableStartSize);
			};
			applyMusicStatus(channelData);
		} else if (data[0] == 'volumeupdated') {
			if (typeof player != "undefined") {
				player.setVolume(data[1]);
			}
			updateTextVolume(data[1]);
		} else if (data[0] == 'statuschange') {
			if (data[1] == 'pause') {
				if (typeof player != "undefined") {
					player.pauseVideo();
				}
				$('.togglePlay').text('Play');
			} else if (data[1] == 'play') {
				if (typeof player != "undefined") {
					player.playVideo();
				}
				$('.togglePlay').text('Pause');
			};
		} else if (data[0] == 'added' || data[0] == 'removed' || data[0] == 'promoted') {
			const channelName = await getChannelName(passedUser);
			const channelData = await buildChannelDataString(channelName);
			const URLSplit = window.location.pathname.split('/');
			const page = URLSplit[1];
			const songlist = await loadSonglist(channelData,page);
			if (songlist) {
				let firstSongInQueue = songlist.split('youtu.be/');
				firstSongInQueue = firstSongInQueue[1].split('" target');
				if (typeof player != "undefined") {
					player.loadVideoById(firstSongInQueue[0]);
				}
				if (page == 'songs') {
					dataTableStartSize = '25';
				} else {
					dataTableStartSize = '5';
				};
				if ($('.datatable').length) {
					buildDataTable(songlist,'.datatable',dataTableStartSize);
				};
			} else {
				$('.dataTables_wrapper').hide();
				$('.songinfo').show();
			};
			getNewSongInfo(); //currentsonginfo page
		}
	});

	socket.on('commands', async function(data) {
		if (data[0] == 'added' || data[0] == 'updated' || data[0] == 'deleted') {
			const channelName = await getChannelName(passedUser);
			let commandsData = await getCommands(channelName);
			if (commandsData) {
				dataTableStartSize = '25';
				buildDataTable(commandsData,'.datatable',dataTableStartSize);
			} else {
				$('.datatable tbody').hide();
				$('.commandssection').html("You haven't added any commands yet!");
			};
		}
	})

	if ($( window ).width() < 767) {
		$('.datatable').DataTable().destroy();
	}
	async function init() {
		let channelName = await getChannelName(passedUser);
		let inChannel = await checkIfInChannel(channelName);
		if (inChannel) {
			$('.botStatusBtn').text('Leave Channel');
		} else {
			$('.botStatusBtn').text('Join Channel');
		};
		$('body').on('click', '.botStatusBtn', async function(e) {
			e.preventDefault();
			if ($(this).text() == 'Join Channel') {
				let channelName = await getChannelName(passedUser);
				let joinResponse = await joinChannel(channelName);
				if (joinResponse == 'joined') {
					$('.botStatusBtn').text('Leave Channel');
					$('.messagesFromBot').html('<p>Joined your channel!</p>').fadeIn("fast");
					setTimeout(function(){
						$('.messagesFromBot').fadeOut("slow");
					},2000);
				}
			} else {
				let channelName = await getChannelName(passedUser);
				let leaveResponse = await leaveChannel(channelName);
				if (leaveResponse == 'parted') {
					$('.botStatusBtn').text('Join Channel');
					$('.messagesFromBot').html('<p>Left your channel!</p>').fadeIn("fast");
					setTimeout(function(){
						$('.messagesFromBot').fadeOut("slow");
					},2000);
				}
			}
		});
		$( window ).resize(async function() {
			if ($( window ).width() > 767) {
				const channelName = getChannelName(passedUser);
				const channelData = buildChannelDataString(channelName);
				const loggedInChannel = userDetails[2];
				if (isCache) {
					const songCache = await loadSongCache(channelData);
					if (songCache) {
						buildDataTable(songCache,'.datatable',dataTableStartSize);
					} else {
						$('.datatable tbody').hide();
						$('.songcache').html("Currently no songs in the cache!");
					};
				} else if (isCommands) {
					const commandsData = await getCommands(channelName);
					if (commandsData) {
						dataTableStartSize = '25';
						buildDataTable(commandsData,'.datatable',dataTableStartSize);
					} else {
						$('.datatable tbody').hide();
						$('.commandssection').html("You haven't added any commands yet!");
					};
				} else {
					const songlist = await loadSonglist(channelData,passedPage);
					if (songlist) {
						buildDataTable(songlist,'.datatable',dataTableStartSize);
						checkForSonglistChanges(channelData,songlist,dataTableStartSize,passedPage);
					} else {
						$('.datatable tbody').hide();
						$('.songlist').html("Currently no songs in the queue!");
					};
				};
		    } else {
		    	$('.datatable').DataTable().destroy();
		    }
		});
	}
	init();
});