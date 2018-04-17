const URLSplit = window.location.pathname.split('/');
const page = URLSplit[1];
const getUrl = window.location;
const urlUser = URLSplit[2];

function setNavShowingSection(page, channelName) {
	let changedOne = false;
	// Loop through all the nav items, and determine the "active" one
	$('.main-nav ul li a').each(function(index, el) {
		if ('/' + page == $(this).attr('href') || '/' + page + '/' + stripHash(channelName) == $(this).attr('href') || $(this).attr('href') == '/' && page == 'getting-started') {
			if ($(this).parent().parent().is(":hidden")) {
				changeNavIconState($(this).parent().parent());
				changedOne = true;
			};
			$(this).addClass('current-page');
		}
	});
	$('.doc-nav ul li a').each(function(index, el) {
		if (($(this).attr('href') == '/' && page == 'getting-started') || '/' + page == $(this).attr('href')) {
			if ($(this).parent().parent().is(":hidden")) {
				changeNavIconState($(this).parent().parent());
				changedOne = true;
			};
			$(this).addClass('current-page');
		}
	});
	// If one was not found, change the icon for the first nav section
	if (!changedOne) {
		changeNavIconState($('.left-bar .main-nav ul:first-of-type'));
		changeNavIconState($('.left-bar .doc-nav ul:first-of-type'));
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

function flashNotificationBell() {
	if ($('.notifications-link i').hasClass('fa-bell-o')) {
		$('.notifications-link i').removeClass('fa-bell-o');
		$('.notifications-link i').addClass('fa-bell');
	} else {
		$('.notifications-link i').removeClass('fa-bell');
		$('.notifications-link i').addClass('fa-bell-o');
	}
}

async function setupClickHandlers(channelName) {
	// Handle click of join/leave button
	$('body').on('click', '.botStatusBtn', async function(e) {
		e.preventDefault();
		if ($(this).text() == 'Join Channel') {
			const joinResponse = await joinChannel(channelName);
			if (joinResponse == 'joined') {
				$('.botStatusBtn').text('Leave Channel');
				$('.messagesFromBot').html('<p>Joined your channel!</p>').fadeIn("fast");
				setTimeout(function(){
					$('.messagesFromBot').fadeOut("slow");
				},2000);
			}
		} else {
			const leaveResponse = await leaveChannel(channelName);
			if (leaveResponse == 'parted') {
				$('.botStatusBtn').text('Join Channel');
				$('.messagesFromBot').html('<p>Left your channel!</p>').fadeIn("fast");
				setTimeout(function(){
					$('.messagesFromBot').fadeOut("slow");
				},2000);
			}
		}
	});

	// Handle click of menu button to toggle showing left bar
	let toggleMe = true;
	$('.nav-toggle-button').click(function(e) {
		e.preventDefault();
		if (toggleMe) {
			toggleMe = false;
			$('#left').css({
				width: '100%',
				transform: 'translate(0, 0)'
			});
		} else {
			toggleMe = true;
			$('#left').css({
				transform: 'translateX(-100%)'
			});
		};
	});

	// Handle clicks outside the notification section to close it
	$('html').click(function() {
		$('.notifications-div').hide();
	});

	// Handle notification panel toggling
	$('.notifications-link a').click(function(e) {
		e.stopPropagation();
		e.preventDefault();
		$('.notifications-div').toggle();
	});
	$('body').on('click', '.notifications a', async function(e) {
		e.stopPropagation();
	});

	// Handle clicks of the left bar
	$('.main-nav h4 a').click(function(e) {
		e.preventDefault();
		changeNavIconState($(this).parent().next());
	});

	// Handle click of the doc left bar
	$('.doc-nav h4 a').click(function(e) {
		e.preventDefault();
		changeNavIconState($(this).parent().next());
	});

	// Handle click of 'x' for notifications panel
	$('body').on('click', '.notifications .close', async function(e) {
		e.stopPropagation();
		const idToRemove = $(this).attr('id');
		e.preventDefault();
		const notificationRemoved = await removeNotification(channelName, idToRemove);
		if (notificationRemoved === 'removed') {
			$(this).parent().parent().remove();
			$('.notifications-link .notification-counter').html($('.notifications li').length);
			if ($('.notifications li').length === 0) {
				$('.notifications').html('<p>Currently no notifications</p>');
			}
		}
	});
}


$(document).ready(function() {
	const URLChannel = $('.urlChannel').text();
	const loggedInChannel = $('.loggedInChannelName').text();
	const channelData = 'channel=#' + URLChannel;

	// Build URL for socket and connect
	const socketURL = getUrl.protocol + "//" + getUrl.host + "/";
	startSocket(socketURL, page, channelData, URLChannel);

	// Setup all the click handlers
	setupClickHandlers(URLChannel);

	// On resize check if leftbar should be removed
	$(window).on('resize', debounce(function() {
		if ($(window).width() > 960) {
			$('#left').removeAttr('style');
		}
	}, 100));

	// Hide all the showing nav dropdowns
	$('.main-nav h4 a i').each(function(index, el) {
		if ($(this).hasClass('fa-plus')) {
			$(this).parent().parent().next().hide();
		}
	});

	// Handle setup for doc section
	if (window.location.href.includes('docs.') || window.location.href.includes('stats.')) {
		$('.doc-nav h4 a i').each(function(index, el) {
			if ($(this).hasClass('fa-plus')) {
				$(this).parent().parent().next().hide();
			}
		});
		if (page == '') {
			setNavShowingSection('getting-started', URLChannel);
		} else if (page === 'commands') {
			setNavShowingSection('default-commands', URLChannel);
		} else if (page === 'channel') {
			setNavShowingSection('', URLChannel);
		} else {
			setNavShowingSection(page, URLChannel);
		}
		$('body').addClass('documentation');
	} else {
		// Show only the "active" nav section
		setNavShowingSection(page, URLChannel);
	};
});