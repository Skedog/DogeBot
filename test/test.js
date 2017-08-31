const assert = require('assert');
const expect = require("chai").expect;
const functions = require('.././functions.js');
const database = require('.././database.js');
const twitch = require('.././twitch.js');
const permissions = require('.././permissions.js');
const chat = require('.././chat-commands.js');
const maintenance = require('.././maintenance.js');
const express = require('.././express.js');
const socket = require('.././socket.js');

let dbConstants;
let twitchClient;
let props;

const userstate = [];
userstate.username = 'skedogbot';
userstate['display-name'] = 'skedogbot';
userstate.mod = true;
userstate.subscriber = false;


// - - - - - - GENERAL FUNCTIONS - - - - - - - -//

it('test start the app', async function() {
	dbConstants = await database.connect();
 	twitchClient = await twitch.connectToTwitch();
 	await socket.start(express.server);
 	assert(dbConstants);
 	props = {
		channel: '#ygtskedogtest',
		userstate,
		twitchClient
	};
});

it('test getRandomItemFromArray()', async function() {
	const arrayToSearch = ["test3","test2","test4","test5","test6","test1"];
	const randomItem = functions.getRandomItemFromArray(arrayToSearch);
	assert(arrayToSearch.includes(randomItem[1]));
});

it('test parseQuery()', function() {
	const queryToParse = "v=-PMd1PaI3M0&list=PLS84tqhbWDgNj3NnBMEN3DxM0n_cEiJCM";
	const songID = '-PMd1PaI3M0';
	assert(functions.parseQuery(queryToParse)["v"] == songID);
});


// - - - - - - DATABASE FUNCTIONS - - - - - - - -//

it('test database.getDbConstants()', function() {
	assert(Object.keys(dbConstants).length == 5);
});


// - - - - - - COMMAND FUNCTIONS - - - - - - - -//

it('test !commands', async function() {
	props.messageParams = ['!commands'];
	props.permissionLevelNeeded = await permissions.commandPermissionLevel(props);
	await permissions.canUserCallCommand(props);
	const res = await chat.callCommand(props);
	expect(res).to.equal('@skedogbot -> The commands for this channel are available here: http://localhost:3000/commands/ygtskedogtest');
});

it('test !commands add, edit, permissions and delete', async function() {
	let res;

	props.messageParams = ['!commands', 'add', '!testcommand', 'this', 'is', 'a', 'test'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@skedogbot -> The command !testcommand has been added!');

	props.messageParams = ['!commands', 'edit', '!testcommand','this', 'is', 'a', 'test', 'edit'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@skedogbot -> The command !testcommand has been updated!');

	props.messageParams = ['!commands', 'perms', '!testcommand','3'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@skedogbot -> The command !testcommand permissions have been updated!');

	props.messageParams = ['!commands', 'delete', '!testcommand'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@skedogbot -> The command !testcommand has been deleted!');
});

it('test !regulars add and remove', async function() {
	props.messageParams = ['!regulars', 'add', 'skedogbot'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@skedogbot -> skedogbot has been added as a regular!');

	props.messageParams = ['!regulars', 'remove', 'skedogbot'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@skedogbot -> skedogbot has been removed as a regular!');
});

it('test !uptime', async function() {
	this.timeout(10000);
	props.messageParams = ['!uptime'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@skedogbot -> ygtskedogtest is offline!');
});

it('test !followage', async function() {
	props.messageParams = ['!followage'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@skedogbot -> skedogbot is not following! BibleThump');
});

it('test !game', async function() {
	props.messageParams = ['!game'];
	res = await chat.callCommand(props);
	expect(res).to.equal('@skedogbot -> The current game is Battlefield 4!');
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
	expect(res).to.have.string('The winner is');
});

it('test !bf4stats', async function() {
	this.timeout(10000);
	props.messageParams = ['!bf4stats', 'TwitchYgTSkedog'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('TwitchYgTSkedog has played');
});

it('test !8ball', async function() {
	props.messageParams = ['!8ball'];
	res = await chat.callCommand(props);
	expect(res).to.have.string(' ');
});

it('test !lastseen', async function() {
	props.messageParams = ['!lastseen', 'skedogbot'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('was last seen');
});

it('test !firstseen', async function() {
	props.messageParams = ['!firstseen', 'skedogbot'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('was first seen');
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

it('test !removesongs skedogbot', async function() {
	props.messageParams = ['!removesongs', 'skedogbot'];
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
	props.messageParams = ['!sr', '8i-tonOhzSg,3pKGYqCK5yg,Jwux_c8cIQ8,z--CnoHrkds,KX8U8guRLSk,KX8U8guRlSk,kqUpnHEdjn0'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@skedogbot -> 1 song was added, but 1 song is too long, 2 songs already exist, 1 song was unavailable for playback in: US, 1 song was not allowed to be embedded, and 1 ID was invalid!');
});

it('test !sr multi all get added', async function() {
	this.timeout(10000);
	props.messageParams = ['!sr', 'https://www.youtube.com/watch?v=EMfNB3fakB8&feature=youtu.be,https://www.youtube.com/watch?v=zO3J12uQIXI,https://www.youtube.com/watch?v=V5-AQTPFJSg,https://www.youtube.com/watch?v=OmnDEUD9NyI&feature=youtu.be,https://www.youtube.com/watch?v=3OC2aPCuzjo&feature=youtu.be'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@skedogbot -> 5 songs added!');
});

it('test !pr over 50 songs', async function() {
	this.timeout(50000);

	// Remove all songs
	props.messageParams = ['!removesongs', 'skedogbot'];
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
	expect(res).to.have.string('@skedogbot -> 10 songs added!');
});

it('test !pr under 50 songs', async function() {
	this.timeout(50000);

	// Remove all songs
	props.messageParams = ['!removesongs', 'skedogbot'];
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
	expect(res).to.have.string('@skedogbot -> 10 songs added!');
});

it('test !shuffle', async function() {
	this.timeout(5000);
	props.messageParams = ['!shuffle'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@skedogbot -> Songs shuffled!');
});

it('test !promote', async function() {
	this.timeout(5000);
	props.messageParams = ['!promote','3'];
	res = await chat.callCommand(props);
	expect(res).to.have.string('@skedogbot -> Song #3 has been promoted!');
});

// - - - - - - PERMISSIONS FUNCTIONS - - - - - - - -//

it('test permissions', async function() {
	props.messageParams = ['!commands', 'add'];
	props.permissionLevelNeeded = await permissions.commandPermissionLevel(props);
	expect(props.permissionLevelNeeded).to.equal(3);
	const canUserCall = await permissions.canUserCallCommand(props);
	expect(canUserCall).to.equal(true);
});