Twitch.init({clientId: '{{=it.apiKey}}'}, function(error, status) {

});

Twitch.getStatus(function(err, status) {
	if (status.authenticated) {
		var token = Twitch.getToken();
		var data = 'token=' + token;
		$.ajax({
			url: '{{=it.postURL}}',
			data: data,
			type: 'POST',
			success: function(data) {
				if (data == 'useradded' || data == 'userexists') {
					console.log(data);
				};
			}
		});
	};
});
$('.twitch-connect').click(function() {
	Twitch.login({
		scope: ['user_read']
	});
});
$('.twitch-connect2').click(function() {
	Twitch.logout(function(error) {
		console.log('loggedout');
	});
});