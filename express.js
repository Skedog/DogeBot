const database = require('./database.js');
const constants = require('./constants.js');
const express = require('express'), app = express(), doT = require('express-dot');
const server = require('http').createServer(app);
// const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const request = require('async-request');
const functions = require('./functions.js');
const expressFunctions = require('./express-functions.js');
const port = process.env.PORT ? process.env.PORT: 3000;
const socket = require('./socket.js');
const songs = require('./songs.js');
const log = require('npmlog');

async function start() {
	// await setupSocket();
	setupApp();
	await setupRoutes();
	server.listen(port, function () {
		log.info('Web server running on port ' + port)
	});
};

function setupApp() {
	app.set('views', __dirname+'/views');
	app.set('view engine', 'dot');
	app.engine('html', doT.__express);
	app.use('/css',express.static(__dirname+'/public/css'));
	app.use('/img',express.static(__dirname+'/public/img'));
	app.use('/js',express.static(__dirname+'/public/js'));
	app.use('/favicon.ico', express.static('public/img/favicon.ico'));
	// app.use(expressFunctions.allowCrossDomain());
	app.use(cookieParser());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
}

async function setupRoutes() {
	app.get('/', [expressFunctions.wwwRedirect,expressFunctions.checkUserLoginStatus], async (req, res) => {
		const dbConstants = await database.constants();
		if (constants.testMode) {
			templateData = {title: "SkedogBot",apiKey: dbConstants.twitchTestClientID,postURL: constants.testPostURL};
		} else {
			templateData = {title: "SkedogBot",apiKey: dbConstants.twitchClientID,postURL: constants.postURL};
		}
		res.render('index.html', templateData);
	});

	app.get('/login', async (req, res) => {
		const dbConstants = await database.constants();
		let templateData;
		if (constants.testMode) {
			templateData = {title: "Logging in...",apiKey: dbConstants.twitchTestClientID,postURL: constants.testPostURL};
		} else {
			templateData = {title: "Logging in...",apiKey: dbConstants.twitchClientID,postURL: constants.postURL};
		}
		res.render('login.html', templateData);
	});

	app.get('/logout', function(req, res){
		res.render('logout.html', {title: "Logging out..."});
	});

	app.get('/dashboard', [expressFunctions.checkUserLoginStatus], async (req, res, next) => {
		next()
	}, function (req, res) {
		res.redirect('/logout');
	});

	app.get('/commands/:channel*?', [expressFunctions.renderPageWithChannel,expressFunctions.checkUserLoginStatus], async (req, res, next) => {
		next()
	}, function (req, res) {
		res.redirect('/logout');
	});

	app.get('/songs/:channel*?', [expressFunctions.renderPageWithChannel,expressFunctions.checkUserLoginStatus], async (req, res, next) => {
		next()
	}, function (req, res) {
		res.redirect('/logout');
	})

	app.get('/songcache/:channel*?', [expressFunctions.renderPageWithChannel,expressFunctions.checkUserLoginStatus], async (req, res, next) => {
		next()
	}, function (req, res) {
		res.redirect('/logout');
	})

	app.get('/player/:channel*?', [expressFunctions.renderPageWithChannel,expressFunctions.checkUserLoginStatus], async (req, res, next) => {
		next()
	}, function (req, res) {
		res.redirect('/logout');
	})

	app.get('/mobile', [expressFunctions.checkUserLoginStatus], async (req, res, next) => {
		next()
	}, function (req, res) {
		res.redirect('/logout');
	})

	app.get('/song-settings', [expressFunctions.checkUserLoginStatus], async (req, res, next) => {
		next()
	}, function (req, res) {
		res.redirect('/logout');
	})

	app.get('/moderation/:channel*?', async(req, res) => {
		const results = await expressFunctions.checkModStatus(req);
		if (results) {
			res.render('moderation.html');
		} else {
			res.redirect('/dashboard');
		}
	}, function (req, res) {
		res.redirect('/logout');
	})

	app.get('/contact', async(req, res) => {
		res.render('contact.html', {title: "Contact"});
	});

	app.get('/currentsonginfo/:channel*?', function(req, res){
		res.render('currentsonginfo.html', {showText: req.query.showText,layout:false});
	});

	app.get('/nav', async (req, res) => {
		res.render('nav.html', {layout:false});
	});

	app.get('/loggedinnav', async (req, res) => {
		let details;
		if (req.cookies.userDetails) {
			const userDetails = req.cookies.userDetails.split(',');
			if (userDetails[1] != 'null') {
				details = {
					layout:false,
					channelLogo:userDetails[1],
					channelToPass:userDetails[2].substring(1)
				}
			} else {
				details = {
					layout:false,
					channelLogo:'/img/default-user-logo.png',
					channelToPass:userDetails[2].substring(1)
				}
			}
		} else {
			//cookie not found, not logged in?
			res.redirect('/logout');
		}
		res.render('loggedinnav.html', details);
	});

	app.post('/getsonglist', async(req, res) => {
		const propsForSelect = {
			table: 'songs',
			query: {channel:req.body.channel}
		}
		const results = await database.select(propsForSelect);
		res.send(results);
	});

	app.post('/getsongcache', async(req, res) => {
		const propsForSelect = {
			table: 'songcache',
			query: {channel:req.body.channel}
		}
		const results = await database.select(propsForSelect);
		res.send(results);
	});

	app.post('/getmusicstatus', async (req, res) => {
		const results = await expressFunctions.getChannelInfo(req);
		if (results) {
			res.send(results);
		}
	});

	app.post('/getvolume', async (req, res) => {
		const results = await expressFunctions.getChannelInfo(req);
		if (results) {
			res.send(results);
		}
	});

	app.post('/getsettings', async (req, res) => {
		const results = await expressFunctions.getChannelInfo(req);
		if (results) {
			res.send(results);
		}
	});

	app.post('/checkifinchannel', async (req, res) => {
		const results = await expressFunctions.getChannelInfo(req);
		if (results) {
			res.send(results[0]['inChannel']);
		} else {
			res.send(false);
		}
	});

	app.post('/updatemusicstatus', async (req, res) => {
		const results = await expressFunctions.checkModStatus(req);
		if (results) {
			let fakeUserstate = [];
			fakeUserstate['display-name'] = 'skippedfromweb';
			if (req.body.musicStatus == 'play') {
				const propsForPlay = {
					channel: req.body.channel,
					userstate: fakeUserstate,
					messageParams: ['!play']
				}
				await songs.play(propsForPlay);
				res.send('');
			} else if (req.body.musicStatus == 'pause') {
				const propsForPause = {
					channel: req.body.channel,
					userstate: fakeUserstate,
					messageParams: ['!pause']
				}
				await songs.pause(propsForPause);
				res.send('');
			}
		} else {
			res.send('error');
		}
	});

	app.post('/updatesettings', async(req, res) => {
		const results = await expressFunctions.checkModStatus(req);
		if (results) {
			let dataToUse = {};
			dataToUse["duplicateSongDelay"] = parseInt(req.body.duplicateSongDelay,10);
			dataToUse["songNumberLimit"] = parseInt(req.body.songNumberLimit);
			dataToUse["maxSongLength"] = parseInt(req.body.maxSongLength);
			const propsForUpdate = {
				table: 'channels',
				query: {ChannelName:req.body.channel},
				dataToUse: dataToUse
			}
			await database.update(propsForUpdate);
			res.send('updated');
		} else {
			res.send('error');
		}
	});

	app.post('/promotesong', async(req, res) => {
		const results = await expressFunctions.checkModStatus(req);
		if (results) {
			dataToUse = {};
			let channel;
			if (req.params.channel) {
				if (req.body.loggedInChannel.includes('#')) {
					channel = req.body.loggedInChannel;
				} else {
					channel = '#' + req.body.loggedInChannel;
				}
			} else {
				if (req.body.channel.includes('#')) {
					channel = req.body.channel;
				} else {
					channel = '#' + req.body.channel;
				}
			}
			const messageParams = ['',req.body.songToPromote];
			let fakeUserstate = [];
			fakeUserstate['display-name'] = 'skippedfromweb';
			const propsForPromote = {
				channel: channel,
				messageParams: messageParams,
				userstate: fakeUserstate
			}
			await songs.promote(propsForPromote);
			res.send('song promoted');
		} else {
			res.send('error');
		}
	});

	app.post('/removesong', async(req, res) => {
		const results = await expressFunctions.checkModStatus(req);
		if (results) {
			let channel;
			if (req.params.channel) {
				if (req.params.channel.includes('#')) {
					channel = req.params.channel
				} else {
					channel = '#' + req.params.channel
				}
			} else {
				if (req.body.channel.includes('#')) {
					channel = req.body.channel
				} else {
					channel = '#' + req.body.channel
				}
			}
			const messageParams = ['',req.body.songToRemove];
			let fakeUserstate = [];
			fakeUserstate['display-name'] = 'skippedfromweb';
			const propsForRemove = {
				channel: channel,
				messageParams: messageParams,
				userstate: fakeUserstate
			}
			await songs.remove(propsForRemove);
			res.send('song removed');
		} else {
			res.send('error');
		}
	})

	app.post('/updatevolume', async (req, res) => {
		const results = await expressFunctions.checkModStatus(req);
		if (results) {
			const messageParams = ['',req.body.volume];
			let fakeUserstate = [];
			fakeUserstate['display-name'] = 'skippedfromweb';
			const propsForVolumeUpdate = {
				channel: req.body.channel,
				messageParams: messageParams,
				userstate: fakeUserstate
			}
			await songs.updateVolume(propsForVolumeUpdate);
			res.send('');
		} else {
			res.send('error');
		}
	});

	app.post('/handlelogin', async (req, res) => {
		//this whole post request is for handling initial logins
		const token = req.body.token;
		res.cookie('token', token, {maxAge: 2629746000}); // set the token as a cookie
		const getUserDetails = await request('https://api.twitch.tv/kraken/user/?oauth_token=' + token);
		body = JSON.parse(getUserDetails.body);
		const props = {
			userEmail: body.email,
			twitchUserID: body._id,
			userLogo: body.logo,
			ChannelName: body.name,
			token: token
		}
		const userDetails = props.userEmail + ',' + props.userLogo + ',#' + props.ChannelName + ',' + props.twitchUserID;
		// set the userDetails as a cookie
		res.cookie('userDetails', userDetails, {maxAge: 2629746000});
		const returnVal = await expressFunctions.handleLogin(props);
		res.send(returnVal);
	});

	app.post('/getcommands', async (req, res) => {
		const propsForSelect = {
			table: 'commands',
			query: {channel:req.body.channel}
		}
		const results = await database.select(propsForSelect);
		res.send(results);
	});

	app.post('/loadnextsong', async (req, res) => {
		const results = await expressFunctions.checkModStatus(req);
		if (results) {
			let fakeUserstate = [];
			fakeUserstate['display-name'] = 'skippedfromweb';
			const propsForSkip = {
				channel: req.body.channel,
				userstate: fakeUserstate,
				messageParams: ['!skipsong']
			}
			await songs.skip(propsForSkip);
			const propsForSelect = {
				table: 'songs',
				query: {channel:req.body.channel}
			}
			const songResults = await database.select(propsForSelect);
			if (songResults) {
				res.send(songResults[0]['songID']);
			}
		};
	});
}

module.exports.server = server;
module.exports.start = start;
// app.listen('3000', '0.0.0.0');