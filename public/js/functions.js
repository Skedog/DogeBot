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

function buildDataTable(elementToUse, startSize, dataToUse) {
	$(elementToUse).DataTable().destroy();
	if (dataToUse) {
		$(elementToUse + ' tbody').html(dataToUse);
	}
	$(elementToUse).on('length.dt', function(e, settings, len) {
		document.cookie = page + '=' + len;
	});
	const numberOfTDs = $(elementToUse + ' tbody tr:first > td').length;
	if (startSize === '-1') {
		$(elementToUse).DataTable({
			"lengthMenu": [[-1, 5, 10, 25], ["All", 5, 10, 25]]
		});
	} else {
		$(elementToUse).DataTable({
			"lengthMenu": [[5, 10, 25, -1], [5, 10, 25, "All"]],
			'pageLength': parseInt(startSize, 10)
		});
	}
	$('.songinfo').hide();
	$(elementToUse).show();
	if (page === 'player' || page === 'songs' || page === 'moderation') {
		$('.dataTables_empty').text('No songs in songlist!');
	} else if (page === 'songcache') {
		$('.dataTables_empty').text('No songs in cache!');
	} else if (page === 'blacklist') {
		$('.dataTables_empty').text('No songs in blacklist!');
	} else if (page === 'commands') {
		$('.dataTables_empty').text('No commands added!');
	}
	$('.gear').hide();
}

function showLoader(item) {
	item.html('<div class="gear"><div class="center"></div><div class="tooth"></div><div class="tooth"></div><div class="tooth"></div><div class="tooth"></div></div>');
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

async function removeNotification(channel, idToRemove) {
	let dataToReturn;
	await $.ajax({
		url: '/removenotification',
		data: 'channel=' + channel + '&id=' + idToRemove,
		type: 'POST',
		success: function(data) {
			dataToReturn = data;
		}
	});
	return dataToReturn;
}

Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,10);
});

async function loadFormattedChatlogs(channel, date) {
	let dataToReturn;
	const d = new Date();
	await $.ajax({
		url: '/getchatlogs',
		data: 'channel=' + channel + '&passedDate=' + date,
		type: 'POST',
		success: function(data) {
			dataToReturn = data;
		}
	});
	return dataToReturn;
}

async function loadListCommandItems(channel, passedCommand) {
	let dataToReturn;
	await $.ajax({
		url: '/getlistcommanditems',
		data: 'channel=' + channel + '&command=' + passedCommand,
		type: 'POST',
		success: function(data) {
			dataToReturn = data;
		}
	});
	return dataToReturn;
}