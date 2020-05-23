const assert = require('assert');
const expect = require('chai').expect;
const functions = require('.././functions.js');
const database = require('.././database.js');
const twitch = require('.././twitch.js');
const permissions = require('.././permissions.js');
const chat = require('.././chat-commands.js');
const maintenance = require('.././maintenance.js');
const express = require('.././express.js');
const socket = require('.././socket.js');
const cache = require('.././cache.js');

let dbConstants;
let twitchClient;
let props;

const userstate = [];
userstate.username = 'dogebot';
userstate['display-name'] = 'dogebot';
userstate.mod = true;
userstate.subscriber = false;


// - - - - - - GENERAL FUNCTIONS - - - - - - - -//

it('test start the app', async function() {
	this.timeout(5000);
	dbConstants = await database.connect();
 	twitchClient = await twitch.connectToTwitch();
 	await socket.start(express.server);
 	await cache.start();
 	assert(dbConstants);
 	props = {
		channel: '#ygtskedogtest',
		userstate,
		twitchClient
	};
});

it('test getRandomItemFromArray()', async function() {
	const arrayToSearch = ['test3','test2','test4','test5','test6','test1'];
	const randomItem = functions.getRandomItemFromArray(arrayToSearch);
	assert(arrayToSearch.includes(randomItem[1]));
});

it('test parseQuery()', function() {
	const queryToParse = 'v=-PMd1PaI3M0&list=PLS84tqhbWDgNj3NnBMEN3DxM0n_cEiJCM';
	const songID = '-PMd1PaI3M0';
	assert(functions.parseQuery(queryToParse)['v'] == songID);
});


// - - - - - - DATABASE FUNCTIONS - - - - - - - -//

it('test database.getDbConstants()', function() {
	assert(Object.keys(dbConstants).length === 8);
});


// - - - - - - COMMAND FUNCTIONS - - - - - - - -//

it('test !commands', async function() {
	props.messageParams = ['!commands'];
	props.permissionLevelNeeded = await permissions.commandPermissionLevel(props);
	await permissions.canUserCallCommand(props);
	const res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> The commands for this channel are available here: http://localhost:3000/commands/ygtskedogtest');
});

it('test !commands add, edit, permissions and delete', async function() {
	let res;

	props.messageParams = ['!commands', 'add', '!testcommand', 'this', 'is', 'a', 'test'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> The command !testcommand has been added!');

	props.messageParams = ['!commands', 'edit', '!testcommand','this', 'is', 'a', 'test', 'edit'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> The command !testcommand has been updated!');

	props.messageParams = ['!commands', 'perms', '!testcommand','subscribers'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> The command !testcommand permissions have been updated!');

	props.messageParams = ['!commands', 'perms', '!cs','subscribers'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> The command !cs permissions have been updated!');

	props.messageParams = ['!commands', 'perms', '!cs','everyone'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> The command !cs permissions have been updated!');

	props.messageParams = ['!commands', 'delete', '!testcommand'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> The command !testcommand has been deleted!');
});

it('test $(list) commands', async function() {
	let res;

	props.messageParams = ['!commands', 'add', '!testlistcommand', '$(list)'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> The command !testlistcommand has been added!');

	props.messageParams = ['!testlistcommand', 'add', 'first list item'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> Added successfully as #1!');

	props.messageParams = ['!testlistcommand', 'add', 'second list item'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> Added successfully as #2!');

	props.messageParams = ['!testlistcommand', 'edit', '2', 'second list item edit'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> testlistcommand #2 has been updated!');

	props.messageParams = ['!testlistcommand', 'delete', '2'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> testlistcommand #2 has been removed!');

	props.messageParams = ['!testlistcommand', 'delete', '2'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> testlistcommand doesn\'t have a #2!');

	props.messageParams = ['!testlistcommand', 'delete', '1'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> You can\'t remove the last item in a list. You can however delete the command with !delcom !testlistcommand');

	props.messageParams = ['!commands', 'delete', '!testlistcommand'];
	res = await chat.callCommand(props);
});

it('test !regulars add and remove', async function() {
	props.messageParams = ['!regulars', 'add', 'dogebot'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> dogebot has been added as a regular!');

	props.messageParams = ['!regulars', 'remove', 'dogebot'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> dogebot has been removed as a regular!');
});

it('test !uptime', async function() {
	this.timeout(10000);
	props.messageParams = ['!uptime'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> ygtskedogtest is offline!');
});

it('test !followage', async function() {
	props.messageParams = ['!followage'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@dogebot -> dogebot is not following! BibleThump');
});

it('test !game', async function() {
	props.messageParams = ['!game'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('current game is');
});

it('test !game Battlefield 4', async function() {
	this.timeout(5000);
	props.messageParams = ['!game','Battlefield','4'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('has been updated');
});

it('test !title', async function() {
	props.messageParams = ['!title'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('The title is');
});

it('test !title testeroni', async function() {
	this.timeout(5000);
	props.messageParams = ['!title','testeroni'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('has been updated');
});

it('test !viewers', async function() {
	this.timeout(10000);
	props.messageParams = ['!viewers'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('currently has');
});

it('test !winner', async function() {
	this.timeout(10000);
	props.messageParams = ['!winner'];
	res = await chat.callCommand(props);
	expect(res).to.have.string(' ');
});

// This API is now dead
// it('test !bf4stats YgTSkedog', async function() {
// 	this.timeout(10000);
// 	props.messageParams = ['!bf4stats', 'YgTSkedog'];
// 	res = await chat.callCommand(props);
// 	expect(res).to.have.string('YgTSkedog has played');
// });

it('test !8ball', async function() {
	props.messageParams = ['!8ball'];
	res = await chat.callCommand(props);
	expect(res).to.have.string(' ');
});

it('test !shoutout ygtskedogtest', async function() {
	props.messageParams = ['!shoutout','ygtskedogtest'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('You can follow');
});

it('test !lastseen', async function() {
	props.messageParams = ['!lastseen', 'dogebot'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('was last seen');
});

it('test !firstseen', async function() {
	props.messageParams = ['!firstseen', 'dogebot'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('was first seen');
});

it('test !disablecom !commands', async function() {
	props.messageParams = ['!disablecom', '!commands'];
	res = await chat.callCommand(props);
	props.messageParams = ['!commands'];
	try {
		await chat.isCommandEnabled(props);
	} catch(err) {
		return;
	}
	throw new Error('Should have thrown an error');
});

it('test !enablecom !commands', async function() {
	props.messageParams = ['!enablecom', '!commands'];
	res = await chat.callCommand(props);
	props.messageParams = ['!commands'];
	res = await chat.isCommandEnabled(props);
	expect(res).to.be.undefined;
});

it('test !disablecom !testing', async function() {
	props.messageParams = ['!disablecom', '!testing'];
	res = await chat.callCommand(props);
	props.messageParams = ['!testing'];
	try {
		await chat.isCommandEnabled(props);
	} catch(err) {
		return;
	}
	throw new Error('Should have thrown an error');
});

it('test !enablecom !testing', async function() {
	props.messageParams = ['!enablecom', '!testing'];
	res = await chat.callCommand(props);
	props.messageParams = ['!testing'];
	res = await chat.isCommandEnabled(props);
	expect(res).to.be.undefined;
});

it('test !songlist', async function() {
	props.messageParams = ['!songlist'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('The song list is available');
});

it('test !songcache', async function() {
	props.messageParams = ['!songcache'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('The song cache is available');
});

it('test !currentsong', async function() {
	props.messageParams = ['!currentsong'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('requested');
});

it('test !volume', async function() {
	props.messageParams = ['!volume'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('The current volume is');
});

it('test !volume 50', async function() {
	props.messageParams = ['!volume', '50'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('The volume has been updated');
});

it('test !play', async function() {
	props.messageParams = ['!play'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('Music is now playing!');
});

it('test !pause', async function() {
	props.messageParams = ['!pause'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('Music has been paused!');
});

it('test !removesongs dogebot', async function() {
	props.messageParams = ['!removesongs', 'dogebot'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('Songs removed!');
});

it('test maintenance.clearSongCache', function() {
	const propsForClearSongCache = {
		channel: '#ygtskedogtest'
	};
	return maintenance.clearSongCache(propsForClearSongCache);
});

it('test !sr skedog speedpaint', async function() {
	props.messageParams = ['!sr', 'skedog', 'speedpaint'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('The song SkeDog Fanart Speedpaint has been added to the queue');
});

it('test !sr multi', async function() {
	this.timeout(5000);
	props.messageParams = ['!sr', '8i-tonOhzSg,z--CnoHrkds,QeBaxc4Cglo'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('3 songs added!');
});

it('test !sr multi fails', async function() {
	this.timeout(10000);
	props.messageParams = ['!sr', '6Gd87JmkAkE,8i-tonOhzSg,3pKGYqCK5yg,Jwux_c8cIQ8,z--CnoHrkds,KX8U8guRLSk,kqUpnHEdjn0'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@dogebot -> 1 song was added, but 1 song is too long, 2 songs already exist, 1 song was unavailable for playback in your country, 1 song was not allowed to be embedded, and 1 ID was invalid!');
});

it('test !sr multi all get added', async function() {
	this.timeout(10000);
	props.messageParams = ['!sr', 'https://www.youtube.com/watch?v=9-NU7yOSElE,https://www.youtube.com/watch?v=zO3J12uQIXI,https://www.youtube.com/watch?v=V5-AQTPFJSg,https://www.youtube.com/watch?v=OmnDEUD9NyI,https://www.youtube.com/watch?v=3OC2aPCuzjo'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@dogebot -> 5 songs added!');
});

it('test !removesong 3', async function() {
	props.messageParams = ['!removesong', '3'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('has been removed');
});

it('test !removesongs 1,2', async function() {
	props.messageParams = ['!removesongs', '1,2'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('Songs removed');
});

it('test !pr over 50 songs', async function() {
	this.timeout(50000);

	// Remove all songs
	props.messageParams = ['!removesongs', 'dogebot'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('Songs removed!');

	// Clear the cache
	const propsForClearSongCache = {
		channel: '#ygtskedogtest'
	};
	maintenance.clearSongCache(propsForClearSongCache);

	// Request Playlist
	props.messageParams = ['!pr', 'PLS84tqhbWDgPUo7otgCVerT5jz54QypU4'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@dogebot -> 10 songs added!');
});

it('test !pr under 50 songs', async function() {
	this.timeout(50000);

	// Remove all songs
	props.messageParams = ['!removesongs', 'dogebot'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('Songs removed!');

	// Clear the cache
	const propsForClearSongCache = {
		channel: '#ygtskedogtest'
	};
	maintenance.clearSongCache(propsForClearSongCache);

	// Request Playlist
	props.messageParams = ['!pr', 'https://www.youtube.com/watch?v=8QpUGCXwOks&list=PLtzah_dj5hUXk--M73cM1oq8twaKW_Axe'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@dogebot -> 10 songs added!');
});

it('test !shuffle', async function() {
	this.timeout(5000);
	props.messageParams = ['!shuffle'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@dogebot -> Songs shuffled!');
});

it('test !promote 3', async function() {
	this.timeout(5000);
	props.messageParams = ['!promote','3'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@dogebot -> Song #3 has been promoted!');
});

it('test !skipsong', async function() {
	this.timeout(5000);
	props.messageParams = ['!skipsong'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('has been skipped');
});

it('test !sr QeBaxc4Cglo', async function() {
	this.timeout(5000);
	props.messageParams = ['!sr', 'QeBaxc4Cglo'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@dogebot -> The song Alison Wonderland x Fishing x Leaderboy - Get Ready (Tasker\'s Illegitimate Rmx) [FREE DL] has been added to the queue');
});

it('test !blacklist add AzHqv4wXghI', async function() {
	this.timeout(5000);
	props.messageParams = ['!blacklist', 'add', 'AzHqv4wXghI'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@dogebot -> The song What a strange phone... has been added to the blacklist!');
});

it('test !blacklist remove AzHqv4wXghI', async function() {
	this.timeout(5000);
	props.messageParams = ['!blacklist', 'remove', 'AzHqv4wXghI'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@dogebot -> The song What a strange phone... has been removed from the blacklist!');
});

it('test !promote QeBaxc4Cglo', async function() {
	this.timeout(5000);
	props.messageParams = ['!promote','QeBaxc4Cglo'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@dogebot -> Song "QeBaxc4Cglo" has been promoted!');
});

it('test !wrongsong', async function() {
	this.timeout(5000);
	props.messageParams = ['!wrongsong'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('has been removed');
});

it('test !srp', async function() {
	this.timeout(5000);
	props.messageParams = ['!srp', 'Buckethead Siege Engine'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('has been added to the queue and has been promoted');
	// Remove the song we just added to ensure the rest of the tests don't have problems
	props.messageParams = ['!removesong', '2'];
	tempRes = await chat.callCommand(props);
});

it('test !mute', async function() {
	this.timeout(5000);
	props.messageParams = ['!mute'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('has been muted');
});

it('test !unmute', async function() {
	this.timeout(5000);
	props.messageParams = ['!unmute'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('has been unmuted');
});

// - - - - - - PERMISSIONS FUNCTIONS - - - - - - - -//

it('test permissions', async function() {
	props.messageParams = ['!commands', 'add'];
	props.permissionLevelNeeded = await permissions.commandPermissionLevel(props);
	expect(props.permissionLevelNeeded).to.equal(300);
	const canUserCall = await permissions.canUserCallCommand(props);
	expect(canUserCall).to.equal(true);
});

// - - - - - - POINTS FUNCTIONS - - - - - - - -//

it('test !points', async function() {
	props.messageParams = ['!points'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('You currently have');
});

it('test !points dogebot', async function() {
	props.messageParams = ['!points','dogebot'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('dogebot currently has');
});

it('test !points gift ygtskedogtest 1', async function() {
	props.messageParams = ['!points','gift','ygtskedogtest','1'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('You don\'t have enough points to do that!');
});

it('test !points gift dogebot 1', async function() {
	props.messageParams = ['!points','gift','dogebot','1'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('You can\'t give yourself points!');
});

it('test !points gift ygtskedogtest 1', async function() {

	// Set these to be the 'channel owner' to test a 'success' case
	userstate.username = 'ygtskedogtest';
	userstate['display-name'] = 'ygtskedogtest';

	props.messageParams = ['!points','gift','ygtskedogtest','1'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('ygtskedogtest sent ygtskedogtest 1 point(s)!');

	// Reset this to 'default' for future tests
	userstate.username = 'dogebot';
	userstate['display-name'] = 'dogebot';
});

it('test !points remove ygtskedogtest 1', async function() {
	props.messageParams = ['!points','remove','ygtskedogtest','1'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('Removed 1 point(s) from ygtskedogtest!');
});

it('test !gamble 0', async function() {
	props.messageParams = ['!gamble','0'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('Please pick a number of points greater than 0 to gamble, or use !gamble all');
});

it('test !gamble -10', async function() {
	props.messageParams = ['!gamble','-10'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('Please pick a number of points greater than 0 to gamble, or use !gamble all');
});

it('test !gamble 10', async function() {
	props.messageParams = ['!gamble','10'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('You don\'t have enough points to do that!');
});

it('test !gamble 50', async function() {

	// Set these to be the 'channel owner' to test a 'success' case
	userstate.username = 'ygtskedogtest';
	userstate['display-name'] = 'ygtskedogtest';

	props.messageParams = ['!gamble','50'];
	res = await chat.callCommand(props);
	expect(res).to.have.string(' points, ');

	// Reset this to 'default' for future tests
	userstate.username = 'dogebot';
	userstate['display-name'] = 'dogebot';
});