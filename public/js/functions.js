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
	return passedStr.replace(/#/g, '');
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
	$('.datatable').DataTable().destroy();
	$(elementToUse + ' tbody').html(passedData);
	const numberOfTDs = $(elementToUse + ' tbody tr:first > td').length;
	if (startSize == '5') {
		$(elementToUse).DataTable({
			"lengthMenu": [[5, 10, 25, -1], [5, 10, 25, "All"]]
		});
	} else {
		$(elementToUse).DataTable({
			"lengthMenu": [[25, 50, -1], [25, 50, "All"]]
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
		url: '/dashboardstats',
		data: channelData,
		type: 'POST',
		success: function(data) {
			/*numberOfSongs, numberOfChatMessages[0].counter, numberOfCommands, numberOfChatUsers*/
			temp = '<div class="statbox">';
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
			dataToReturn = temp;
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