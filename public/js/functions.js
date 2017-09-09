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

function stripHash(passedStr) {
	if (passedStr) {
		return passedStr.replace(/#/g, '');
	}
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
	if (urlUser != undefined && urlUser != 'undefined') {
		passedUser = urlUser;
		return urlUser;
	} else {
		passedUser = userDetails[2];
		return userDetails[2];
	};
};

function buildChannelDataString(channelName) {
	if (channelName) {
		if (channelName.includes('#')) {
			return 'channel=' + channelName;
		} else {
			return 'channel=#' + channelName;
		};
	} else {
		return 'channel=#' + channelName;
	}
}

function buildDataTable(passedData,elementToUse,startSize) {
	$('.datatable').on('length.dt', function(e, settings, len) {
		document.cookie = page + '=' + len;
	});
	$('.datatable').DataTable().destroy();
	$(elementToUse + ' tbody').html(passedData);
	const numberOfTDs = $(elementToUse + ' tbody tr:first > td').length;
	if (startSize === '-1') {
		$(elementToUse).DataTable({
			"lengthMenu": [[-1, 5, 10, 25], ["All", 5, 10, 25]]
		});
	} else {
		$(elementToUse).DataTable({
			"lengthMenu": [[5, 10, 25, -1], [5, 10, 25, "All"]],
			'pageLength': startSize
		});
	}
	/*if (startSize == '25') {
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
	}*/
	$('.songinfo').hide();
	$(elementToUse).show();
}

function showLoader(item) {
	item.html('<div class="gear"><div class="center"></div><div class="tooth"></div><div class="tooth"></div><div class="tooth"></div><div class="tooth"></div></div>');
}

async function loadDashboard(channelData) {
	let dataToReturn = '';
	await $.ajax({
		url: '/topchatters',
		data: channelData,
		type: 'POST',
		success: function(data) {
			if (data) {
				temp = '<div class="topchatters">';
					temp = temp + '<h3>Top Chatters</h3>';
					temp = temp + '<p>1) ' + data[0].userName + ' - ' + data[0].numberOfChatMessages + ' messages</p>';
					temp = temp + '<p>2) ' + data[1].userName + ' - ' + data[1].numberOfChatMessages + ' messages</p>';
					temp = temp + '<p>3) ' + data[2].userName + ' - ' + data[2].numberOfChatMessages + ' messages</p>';
					temp = temp + '<p>4) ' + data[3].userName + ' - ' + data[3].numberOfChatMessages + ' messages</p>';
					temp = temp + '<p>5) ' + data[4].userName + ' - ' + data[4].numberOfChatMessages + ' messages</p>';
				temp = temp + '</div>';
				dataToReturn = temp;
			}
		}
	});
	await $.ajax({
		url: '/dashboardstats',
		data: channelData,
		type: 'POST',
		success: function(data) {
			if (data !== 'no stats') {
				/*numberOfSongs, numberOfChatMessages[0].counter, numberOfCommands, numberOfChatUsers*/
				temp = '<div class="statbox-container">'
					temp = temp + '<div class="statbox">';
						temp = temp + '<h3>' + data[0].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '</h3>';
						temp = temp + '<p># of <a href="/songs">Songs in Queue</a></p>';
					temp = temp + '</div>';
					temp = temp + '<div class="statbox">';
						temp = temp + '<h3>' + data[2].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '</h3>';
						temp = temp + '<p># of <a href="/commands">Commands</a></p>';
					temp = temp + '</div>';
					temp = temp + '<div class="statbox">';
						temp = temp + '<h3>' + data[3].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '</h3>';
						temp = temp + '<p># of Users Seen</p>';
					temp = temp + '</div>';
					temp = temp + '<div class="statbox">';
						temp = temp + '<h3>' + data[1].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '</h3>';
						temp = temp + '<p># of Chat Messages Seen</p>';
					temp = temp + '</div>';
				temp = temp + '</div>';
				dataToReturn = dataToReturn + temp;
			}
		}
	});
	return dataToReturn;
}

function hideLoader(item) {
	item.html('');
}

function debounce(func, wait, immediate) {
	let timeout;
	return function() {
		const context = this, args = arguments;
		const later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		const callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	}
}

async function getChatlogs(data, dateStart, dateEnd) {
	let dataToReturn;
	await $.ajax({
		url: '/getchatlogs',
		data: data + '&timestampStart=' + dateStart + '&timestampEnd=' + dateEnd,
		type: 'POST',
		success: function(data) {
			dataToReturn = data;
		}
	});
	return dataToReturn;
}

Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };

Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,10);
});

async function loadChatlogs(data,page,date) {
	date.setHours(0,0,0,0);
	const dateStart = date.getUnixTime();
	date.setHours(23,59,59,999);
	const dateEnd = date.getUnixTime();
	let dataToReturn = '';
	let chatlogs;
	chatlogs = await getChatlogs(data,dateStart,dateEnd);
	if (chatlogs != '') {
		dataToReturn = '<div class="chatlogs">';
		$.each(chatlogs, function(key, value) {
			const d = chatlogs[key].timestamp;
			const localTestDate = new Date(d).toLocaleString();
			const displayName = chatlogs[key].userstate['display-name'];
			const username = chatlogs[key].userstate.username;
			let color = chatlogs[key].userstate.color;
			if (!color) {
				color = '#428bca'
			}
			const message = chatlogs[key].message;
			dataToReturn += '<div class="chat-message">';
				dataToReturn += '<span class="date">' + localTestDate + '</span>';
				if (displayName) {
					dataToReturn += '<span class="displayName" style="color:' + color + '">' + displayName + ':</span>';
				} else {
					dataToReturn += '<span class="displayName" style="color:' + color + '">' + username + ':</span>';
				}
				dataToReturn += '<span class="message">' + message + '</span>';
			dataToReturn += '</div>';
		});
		dataToReturn += '</div>';
	} else {
		dataToReturn = '<p>No chat logs to be found, go say hello or pick a different date above!</p>'
	};
	return dataToReturn;
}