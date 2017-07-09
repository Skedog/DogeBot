function isNumeric(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
};

function getUrlVars() {
	var vars = [], hash;
	if (window.location.href.indexOf('#')) {
		var hashes = window.location.href.slice(window.location.href.indexOf('#') + 1).split('&');
	} else {
		var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	};
	for(var i = 0; i < hashes.length; i++)
	{
		hash = hashes[i].split('=');
		vars.push(hash[0]);
		vars[hash[0]] = hash[1];
	}
	return vars;
};

function readCookie(cname) {
	var name = cname + "=";
	var ca = document.cookie.split(';');
	for(var i = 0; i <ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length,c.length);
		}
	}
	return "";
}

var userDetails = decodeURIComponent(readCookie("userDetails")).split(',');
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

function loadSonglist(data,page) {
	return new Promise((resolve, reject) => {
		$.ajax({
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
						console.log(page);
						if (page == 'moderation') {
							contentData = contentData + '<tr><td>' + (key + 1) + '</td><td><a href="https://youtu.be/' + data[key]['songID'] + '" target="_blank">' + data[key]['songTitle'] + '</a></td><td>' + data[key]['whoRequested'] + '</td><td><input type="button" value="X" id="' + data[key]['songID'] + '" class="removeButton blue-styled-button mini" /></td></tr>';
						} else if (page == 'player') {
							contentData = contentData + '<tr><td>' + (key + 1) + '</td><td><a href="https://youtu.be/' + data[key]['songID'] + '" target="_blank">' + data[key]['songTitle'] + '</a></td><td>' + data[key]['whoRequested'] + '</td></tr>';
						} else {
							contentData = contentData + '<tr><td>' + (key + 1) + '</td><td>' + data[key]['songTitle'] + '</td><td><a href="https://youtu.be/' + data[key]['songID'] + '" target="_blank">' + data[key]['songID'] + '</a></td><td>' + data[key]['whoRequested'] + '</td></tr>';
						};
					});
					resolve(contentData);
				} else {
					resolve(false);
				};
			}
		});
	});
}

function loadSongCache(data) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: '/getsongcache',
			data: data,
			type: 'POST',
			success: function(data) {
				if (data != '') {
					var contentData = '';
					$('.datatable').DataTable().destroy();
					$.each(data, function(key, value) {
						contentData = contentData + '<tr><td>' + (key + 1) + '</td><td>' + data[key]['songTitle'] + '</td><td><a href="https://youtu.be/' + data[key]['songID'] + '" target="_blank">' + data[key]['songID'] + '</a></td></tr>';
					});
					resolve(contentData);
				} else {
					resolve(false);
				};
			}
		});
	});
}

function getCommands(channelName) {
	return new Promise((resolve, reject) => {
		buildChannelDataString(channelName).then(channelData => {
			$.ajax({
				url: '/getcommands',
				data: channelData,
				type: 'POST',
				success: function(data) {
					if (data != '') {
						var contentData = '';
						$.each(data, function(key, value) {
							contentData = contentData + '<tr><td>' + data[key]['trigger'] + '</td><td>' + data[key]['chatmessage'] + '</td><td>' + data[key]['commandcounter'] + '</td><td>' + data[key]['permissionsLevel'] + '</td></tr>';
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
			"lengthMenu": [[-1, 5, 10, 25], ["All", 5, 10, 25]]
		});
	}
	$(elementToUse).show();
}

function joinChannel(channelName) {
	return new Promise((resolve, reject) => {
		buildChannelDataString(channelName).then(channelData => {
			$.ajax({
				url: '/joinchannel',
				data: channelData,
				type: 'POST',
				success: function(data) {
					resolve(data);
				}
			});
		});
	});
}

function leaveChannel(channelName) {
	return new Promise((resolve, reject) => {
		buildChannelDataString(channelName).then(channelData => {
			$.ajax({
				url: '/partchannel',
				data: channelData,
				type: 'POST',
				success: function(data) {
					resolve(data);
				}
			});
		});
	});
}

function checkIfInChannel(channelName) {
	return new Promise((resolve, reject) => {
		buildChannelDataString(channelName).then(channelData => {
			$.ajax({
				url: '/checkchannelstatus',
				data: channelData,
				type: 'POST',
				success: function(data) {
					resolve(data);
				}
			});
		});
	});
};

function getChannelName(urlUser) {
	return new Promise((resolve, reject) => {
		if (urlUser != 'undefined') {
			passedUser = urlUser;
			resolve(urlUser);
		} else {
			passedUser = userDetails[2];
			resolve(userDetails[2]);
		};
	});
};

function buildChannelDataString(channelName) {
	return new Promise((resolve, reject) => {
		if (channelName.includes('#')) {
			resolve('channel=' + channelName);
		} else {
			resolve('channel=#' + channelName);
		};
	});
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

function getVolume(channelData) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: '/getvolume',
			data: channelData,
			type: 'POST',
			success: function(data) {
				resolve(data[0]['volume']);
			}
		})
	});
}

function updateVolume(channelData,newVol) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: '/updatevolume',
			data: channelData + '&volume=' + newVol,
			type: 'POST',
			success: function(data) {
				resolve(newVol);
			}
		});
	});
}

function getMusicStatus(channelData) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: '/getmusicstatus',
			data: channelData,
			type: 'POST',
			success: function(data) {
				resolve(data);
			}
		})
	});
}


function updateMusicStatus(channelData,musicStatus) {
	$.ajax({
		url: '/updatemusicstatus',
		data: channelData + '&musicStatus=' + musicStatus,
		type: 'POST'
	});
}

var passedUser = ''; //this is needed to make the window resize function below work
var passedPage = ''; //this is needed to make the window resize function below work
var dataTableStartSize = '';
var isCache = false;

$(document).ready(function() {
	setTimeout(function() {
		if ($( window ).width() < 767) {
			$('.datatable').DataTable().destroy();
		}
	}, 100);
	$( window ).resize(function() {
		if ($( window ).width() > 767) {
			getChannelName(passedUser).then(channelName => {
				buildChannelDataString(channelName).then(channelData => {
					var loggedInChannel = userDetails[2];
					if (isCache) {
						loadSongCache(channelData).then(songCache => {
							if (songCache) {
								buildDataTable(songCache,'.datatable',dataTableStartSize);
							} else {
								$('.datatable tbody').hide();
								$('.songcache').html("Currently no songs in the cache!");
							};
						});
					} else {
						loadSonglist(channelData,passedPage).then(songlist => {
							if (songlist) {
								buildDataTable(songlist,'.datatable',dataTableStartSize);
								checkForSonglistChanges(channelData,songlist,dataTableStartSize,passedPage);
							} else {
								$('.datatable tbody').hide();
								$('.songlist').html("Currently no songs in the queue!");
							};
						});
					};
				});
			});
	    } else {
	    	$('.datatable').DataTable().destroy();
	    }
	});
});