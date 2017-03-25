var data = 'channel=skedogbot';
$.ajax({
	url: '{{=it.postURL}}/getcommands',
	data: data,
	type: 'POST',
	success: function(data) {
		console.log(data);
		var contentData = '';
		$.each(data, function(key, value) {
			contentData = contentData + data[key]['trigger'] + ' ------- ' + data[key]['chatmessage'] + '<br />';
		});
		$('.wrapper').html(contentData);
	}
});