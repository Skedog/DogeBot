const URLSplit = window.location.pathname.split('/');
const page = URLSplit[1];
const getUrl = window.location;
const urlUser = URLSplit[2];

let userDetails = decodeURIComponent(readCookie("userDetails")).split(',');
const channelName = getChannelName(urlUser);
const channelData = buildChannelDataString(channelName);
// If user is logged in
if (typeof userDetails[2] != 'undefined') {
	$.ajax({
		url: '/loggedinnav',
		type: 'GET',
		success: function(data) {
			$('.navbar-nav').html(data);
			getChannelStatus();
		}
	});
	if (page != 'logout') {
		$.ajax({
			url: '/leftbar',
			type: 'GET',
			success: function(data) {
				$('.left-bar-container').html(data);
				$('.main-nav h4 a i').each(function(index, el) {
					if ($(this).hasClass('fa-plus')) {
						$(this).parent().parent().next().hide();
					}
				});
				setNavShowingSection(page);
				$('.main-nav h4 a').click(function(e) {
					e.preventDefault();
					changeNavIconState($(this).parent().next());
				});
			}
		});
	}
} else {
	if (window.location.href.includes('docs.')) {
		$.ajax({
			url: '/docnav',
			type: 'GET',
			success: function(data) {
				$('.left-bar-container').html(data);
				$('.doc-nav h4 a i').each(function(index, el) {
					if ($(this).hasClass('fa-plus')) {
						$(this).parent().parent().next().hide();
					}
				});
				$('.doc-nav h4 a').click(function(e) {
					e.preventDefault();
					changeNavIconState($(this).parent().next());
				});
				if (page == '') {
					setNavShowingSection('getting-started');
				} else {
					setNavShowingSection(page);
				}
				$('body').addClass('documentation');
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
		setTimeout(function() {
			$('.inner-content-wrapper').width('100%');
		}, 100);
	}
};

async function getChannelStatus() {
	let inChannel = await checkIfInChannel(channelName);
	if (inChannel) {
		$('.botStatusBtn').text('Leave Channel');
	} else {
		$('.botStatusBtn').text('Join Channel');
	};
}

async function startPageLoad(cookieChannel) {
	let channelName = await getChannelName(cookieChannel);
}

function setNavShowingSection(page) {
	let changedOne = false;
	$('.left-bar .main-nav ul li a').each(function(index, el) {
		if ($(this).attr('href') == '/currentsonginfo') {
			if (channelName === userDetails[2]) {
				$(this).attr('href',$(this).attr('href') + '/' + stripHash(channelName) + '?showText=true');
			} else {
				$(this).attr('href',$(this).attr('href') + '/' + stripHash(userDetails[2]) + '?showText=true');
			}
		} else if ($(this).attr('href') == '/moderation') {
			if (channelName === userDetails[2]) {
				$(this).attr('href',$(this).attr('href') + '/' + stripHash(channelName));
			};
		};
		if ('/' + page == $(this).attr('href') || '/' + page + '/' + stripHash(channelName) == $(this).attr('href')) {
			if ($(this).parent().parent().is(":hidden")) {
				changeNavIconState($(this).parent().parent());
				changedOne = true;
			};
			$(this).addClass('current-page');
		}
	});
	$('.left-bar .doc-nav ul li a').each(function(index, el) {
		if (($(this).attr('href') == '/' && page == 'getting-started') || '/' + page == $(this).attr('href')) {
			if ($(this).parent().parent().is(":hidden")) {
				changeNavIconState($(this).parent().parent());
				changedOne = true;
			};
			$(this).addClass('current-page');
		}
	})
	if (!changedOne) {
		changeNavIconState($('.left-bar .main-nav ul:first-of-type'));
	}
}

function changeNavIconState(itemToChange) {
	itemToChange.toggle();
	let currentIcon = itemToChange.prev().children('a').children('i');
	if (currentIcon.hasClass('fa-minus')) {
		currentIcon.removeClass('fa-minus');
		currentIcon.addClass('fa-plus');
	} else {
		currentIcon.removeClass('fa-plus');
		currentIcon.addClass('fa-minus');
	}
}

async function init() {
	let socketURL;
	await getChannelStatus();
	socketURL = getUrl.protocol + "//" + getUrl.host + "/";
	startSocket(socketURL,page,channelData);
	if (!page || page == 'login' || page == 'logout' || page == 'default-commands') {
		$('body').addClass('home');
	};
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

	let toggleMe = true;
	$(window).on('resize', debounce(function() {
		if ($(window).width() > 1138) {
			$('.left-bar').removeAttr('style');
		}
	}, 200));
	$('.navstatus').click(function(e) {
		e.preventDefault();
		if (toggleMe) {
			toggleMe = false;
			$('.left-bar').css({
				transform: 'translate(0, 0)'
			});
		} else {
			toggleMe = true;
			$('.left-bar').css({
				transform: 'translate(-285px, 0)'
			});
		};
	});
}
init();