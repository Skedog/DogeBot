const URLSplit = window.location.pathname.split('/');
const page = URLSplit[1];
const getUrl = window.location;
const urlUser = URLSplit[2];

async function getChannelStatus(channelName) {
	let inChannel = await checkIfInChannel(channelName);
	if (inChannel) {
		$('.botStatusBtn').text('Leave Channel');
	} else {
		$('.botStatusBtn').text('Join Channel');
	};
}

function setNavShowingSection(page, channelName) {
	let changedOne = false;
	// Loop through all the nav items, and determine the "active" one
	$('.left-bar .main-nav ul li a').each(function(index, el) {
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
	});
	// If one was not found, change the icon for the first nav section
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

async function init(channelName) {
	let socketURL;
	const channelData = 'channel=#' + channelName;

	// Get status of bot in channel and update button
	await getChannelStatus(channelName);

	// Build URL for socket and connect
	socketURL = getUrl.protocol + "//" + getUrl.host + "/";
	startSocket(socketURL,page,channelData,channelName);

	// Add home class to pages that don't need the left bar
	if (!page || page == 'login' || page == 'logout' || getUrl.host.includes('docs.')) {
		$('body').addClass('home');
	};

	// If no leftbar content is loaded, set the content width to be fullscreen
	if ($('.left-bar-container').is(':empty')) {
		$('.inner-content-wrapper').width('100%');
	};

	// Setup all the click handlers
	setupClickHandlers(channelName);

	// On resize check if leftbar should be removed
	$(window).on('resize', debounce(function() {
		if ($(window).width() > 1138) {
			$('.left-bar').removeAttr('style');
		}
	}, 200));

	// Hide all the showing nav dropdowns
	$('.main-nav h4 a i').each(function(index, el) {
		if ($(this).hasClass('fa-plus')) {
			$(this).parent().parent().next().hide();
		}
	});

	// Show only the "active" nav section
	setNavShowingSection(page, channelName);

	// Handle setup for doc section
	if (window.location.href.includes('docs.')) {
		$('.doc-nav h4 a i').each(function(index, el) {
			if ($(this).hasClass('fa-plus')) {
				$(this).parent().parent().next().hide();
			}
		});
		if (page == '') {
			setNavShowingSection('getting-started', channelName);
		} else {
			setNavShowingSection(page, channelName);
		}
		$('body').addClass('documentation');
	};

	// Setup notification panel
	setupNotificationPanel(channelName);

	// Return channelData so individual pages can use that data to load content
	return channelData;

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

	// Handle clicks outside the notification section to close it
	$('html').click(function() {
		$('.notifications-div').hide();
	});

	// Handle notification panel toggling
	$('.notifications-link a').click(function(e) {
		e.stopPropagation();
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
		const notificationRemoved = await removeNotification(channel, idToRemove);
		if (notificationRemoved === 'removed') {
			$(this).parent().parent().remove();
			$('.notifications-link .notification-counter').html($('.notifications li').length);
			if ($('.notifications li').length === 0) {
				$('.notifications').html('<p>Currently no notifications</p>');
			}
		}
	});
}

async function setupNotificationPanel(channel) {
	// Load notifications from the database
	const notifications = await getNotifications();

	// Loop through all the notifications
	for (const notification of notifications) {
		// If channel hasn't dismissed this notification, show it
		if (!notification.exclusionList.includes(channel)) {
			$('ul.notifications').append('<li><a href="#"><span class="close" id="' + notification._id + '"><i class="fa fa-times"></i></span>' + notification.message + '</a></li>');
		}
	};

	// If no notifications, show default message
	if ($('.notifications li').length === 0) {
		$('.notifications').html('<p>Currently no notifications</p>');
	}

	// Update number of notifications
	$('.notifications-link .notification-counter').html($('.notifications li').length);
}