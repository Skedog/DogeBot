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

const URLSplit = window.location.pathname.split('/');
const page = URLSplit[1];
const getUrl = window.location;
const urlUser = URLSplit[2];
const channelName = getChannelName(urlUser);
const channelData = buildChannelDataString(channelName);

async function startPageLoad(cookieChannel) {
	let channelName = await getChannelName(cookieChannel);
}

async function init() {
	let inChannel = await checkIfInChannel(channelName);
	if (inChannel) {
		$('.botStatusBtn').text('Leave Channel');
	} else {
		$('.botStatusBtn').text('Join Channel');
	};
	let socketURL;
	socketURL = getUrl.protocol + "//" + getUrl.host + "/";
	startSocket(socketURL,page,channelData);
	$('body').on('click', '.botStatusBtn', async function(e) {
		e.preventDefault();
		if ($(this).text() == 'Join Channel') {
			let joinResponse = await joinChannel(channelName);
			if (joinResponse == 'joined') {
				$('.botStatusBtn').text('Leave Channel');
				$('.messagesFromBot').html('<p>Joined your channel!</p>').fadeIn("fast");
				setTimeout(function(){
					$('.messagesFromBot').fadeOut("slow");
				},2000);
			}
		} else {
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
}
init();