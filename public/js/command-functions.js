async function getCommands(channelName) {
	let channelData = await buildChannelDataString(channelName);
	let dataToReturn = '';
	await $.ajax({
		url: '/getcommands',
		data: channelData,
		type: 'POST',
		success: function(data) {
			if (data != '') {
				let contentData = '';
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
						let contentData = '';
						let permissionData = '';
						$.each(data, function(key, value) {
							permissionData = '';
							$.each(data[key]['permissionsPerChannel'], function(key2, value2) {
								if (value2['channel'] == channelName) {
									permissionData = permissionData + value2['permissionLevel'];
								};
							});
							const trigger = data[key]['trigger'];
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