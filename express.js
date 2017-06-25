var log = require('npmlog');
var runSQL = require('./runSQL.js');
const constants = require('./constants.js');
const twitch = require('./twitch.js');

var express = require('express'), app = express(), doT = require('express-dot'), pub = __dirname+'/public', view = __dirname+'/views';
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var checkUserLogin = require('./user-login.js');
var async = require('async');

const url = require('url');


var start = function(dbAndConstants) {
	return new Promise((resolve, reject) => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		connect(db,dbConstants).then(res => {
			resolve(res);
		}).catch(err => {
			reject(err);
		});
	}).catch(err => {
		reject(err);
	});
}

var connect = function(db,dbConstants) {
	return new Promise((resolve, reject) => {
		serverPort = process.env.PORT ? process.env.PORT: 8000;
		var allowCrossDomain = function(req, res, next) {
			if (constants.testMode) {
				res.header('Access-Control-Allow-Origin', constants.testPostURL);
			} else {
				res.header('Access-Control-Allow-Origin', constants.postURL);
			}
			res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
			res.header('Access-Control-Allow-Headers', 'Content-Type');
			next();
		};

		function parallel(middlewares) {
			return function (req, res, next) {
				async.each(middlewares, function (mw, cb) {
					mw(req, res, cb);
				}, next);
			};
		};

		var wwwRedirect = function(req, res, next) {
		    if (req.headers.host.slice(0, 4) === 'www.') {
		        var newHost = req.headers.host.slice(4);
		        return res.redirect(301, req.protocol + '://' + newHost + req.originalUrl);
		    }
		    next();
		};

		app.set('views', __dirname+'/views');
		app.set('view engine', 'dot');
		app.set('trust proxy', true);
		app.engine('html', doT.__express);
		app.use('/css',express.static(__dirname+'/public/css'));
		app.use('/img',express.static(__dirname+'/public/img'));
		app.use('/js',express.static(__dirname+'/public/js'));

		app.use(parallel([
			allowCrossDomain,
			cookieParser(),
			bodyParser.json(),
			bodyParser.urlencoded({ extended: true })
		]));

		var renderPageWithChannel = function (req, res, next) {
			var templateData = {passedUser: req.channel};
			var pageToRender = req.originalUrl.split('/');
			res.render(pageToRender[1] + '.html', templateData);
		}

		var checkUserLoginStatus = function (req, res, next) {
			var token = req.cookies.token;
			if (req.cookies.userDetails) {
				var userDetails = req.cookies.userDetails.split(',');
				var currentChannel = userDetails[2];
				var twitchUserID = userDetails[3];
				checkUserLogin(db,token,twitchUserID).then(isLoggedIn => {
					templateData = {};
					var pageToRender = req.originalUrl.slice(1).split('?');
					res.render(pageToRender[0] + '.html', templateData);
				}).catch(function(err) {
					next();
				});
			} else {
				var currentChannel = '';
				next();
			}
		}

		var checkUserModStatus = function(req) {
			return new Promise((resolve, reject) => {
				if (req.cookies.userDetails) {
					var userDetails = req.cookies.userDetails.split(',');
					if (req.channel != undefined) {
						var channelToCheckMods = req.channel; //from URL, never has #
					} else if (req.body.channel != undefined) {
						var channelToCheckMods = req.body.channel.substring(1); //has #, needs to be removed
					} else {
						var channelToCheckMods = userDetails[2].substring(1); //has #, needs to be removed
					}
					var twitchUserID = userDetails[3];
					if (!!twitchUserID) {
						runSQL('select','channels',{twitchUserID:parseInt(twitchUserID)},'',db).then(results => { //select logged in channel to get username
							if (results) {
								loggedInChannel = results[0]['ChannelName'].substring(1);
								twitchClient.mods(channelToCheckMods).then(modRes => {
									var a = modRes.indexOf(loggedInChannel);
									if (a > -1) {
										if (req.originalUrl.includes('/')) {
											resolve(req.originalUrl.split('/'));
										} else {
											resolve(req.originalUrl);
										}
									} else {
										if (channelToCheckMods == loggedInChannel) {
											if (req.originalUrl.includes('/')) {
												resolve(req.originalUrl.split('/'));
											} else {
												resolve(req.originalUrl);
											}
										} else {
											//username isn't in the mod list, they are not a mod
											resolve('');
										}
									};
								}).catch(function(err) {
									reject(err);
								});
							}
						})
					}
				} else {
					resolve('');
				}
			});
		}


		app.param('channel', function(req, res, next, channel) {
			req.channel = channel;
			next();
		})

		app.get('/', [wwwRedirect], function(req, res){
			token = req.cookies.token;
			if (req.cookies.userDetails) {
				var userDetails = req.cookies.userDetails.split(',');
				var currentChannel = userDetails[2];
				var twitchUserID = userDetails[3];
				checkUserLogin(db,token,twitchUserID).then(isLoggedIn => {
					res.redirect('/dashboard');
				}).catch(function(err) {
					res.redirect('/logout');
				});
			} else {
				var currentChannel = '';
				if (token) {
					res.redirect('/logout');
				} else {
					var templateData = {};
					if (constants.testMode) {
						templateData = {title: "SkedogBot",apiKey: dbConstants.twitchTestClientID,postURL: constants.testPostURL};
					} else {
						templateData = {title: "SkedogBot",apiKey: dbConstants.twitchClientID,postURL: constants.postURL};
					}
					res.render('index.html', templateData);
				}
			}
		});

		app.get('/dashboard', [checkUserLoginStatus], function (req, res, next) {
			next()
		}, function (req, res) {
			res.redirect('/logout');
		})

		app.get('/player', [checkUserLoginStatus], function (req, res, next) {
			next()
		}, function (req, res) {
			res.redirect('/logout');
		})

		app.get('/mobile', [checkUserLoginStatus], function (req, res, next) {
			next()
		}, function (req, res) {
			res.redirect('/logout');
		})

		app.get('/song-settings', [checkUserLoginStatus], function (req, res, next) {
			next()
		}, function (req, res) {
			res.redirect('/logout');
		})

		app.get('/moderation/:channel*?', function(req, res){
			checkUserModStatus(req).then(results => {
				if (results) {
					res.render(results[1] + '.html',{passedUser: req.channel});
				} else {
					res.redirect('/dashboard');
				}
			}).catch(function(err) {
				log.error(err);
			});
		}, function (req, res) {
			res.redirect('/logout');
		})

		app.post('/removesong', function(req, res) {
			checkUserModStatus(req).then(results => {
				if (results) {
					dataToUse = {};
					var query2 = {channel:req.body.channel,songID:req.body.songToRemove};
					runSQL('delete','songs',query2,dataToUse,db).then(results => {
						res.send('song removed');
					});
				} else {
					res.send('error');
				}
			}).catch(function(err) {
				res.send('error');
			});
		})

		app.get('/commands/:channel*?', [renderPageWithChannel,checkUserLoginStatus], function (req, res, next) {
			next()
		}, function (req, res) {
			res.redirect('/logout');
		})

		app.get('/loggedinnav', function(req, res){
			res.render('loggedinnav.html', {layout:false});
		});

		app.get('/songs/:channel*?', [renderPageWithChannel,checkUserLoginStatus], function (req, res, next) {
			next()
		}, function (req, res) {
			res.redirect('/logout');
		})

		app.get('/songcache/:channel*?', [renderPageWithChannel,checkUserLoginStatus], function (req, res, next) {
			next()
		}, function (req, res) {
			res.redirect('/logout');
		})

		app.get('/contact', function(req, res){
			var templateData = {title: "Contact"};
			res.render('contact.html', templateData);
		});

		app.get('/currentsonginfo', function(req, res){
			var templateData = {passedUser: req.query.channel,showText: req.query.showText,layout:false};
			res.render('currentsonginfo.html', templateData);
		});

		app.post('/getcurrentsongforobs', function(req, res) {
			runSQL('select','songs',{channel:req.body.channel},'',db).then(results => {
				res.send(results);
			});
		});

		app.get('/login', function(req, res){
			var templateData = {};
			if (constants.testMode) {
				templateData = {title: "Logging in...",apiKey: dbConstants.twitchTestClientID,postURL: constants.testPostURL};
			} else {
				templateData = {title: "Logging in...",apiKey: dbConstants.twitchClientID,postURL: constants.postURL};
			}
			res.render('login.html', templateData);
		});
		app.get('/loggedinnav', function(req, res){
			res.render('loggedinnav.html', {layout:false});
		});
		app.get('/nav', function(req, res){
			res.render('nav.html', {layout:false});
		});
		app.get('/logout', function(req, res){
			res.render('logout.html', {title: "Logging out..."});
		});

		app.get('/error', function(req, res){
			res.render('index.html', {title: "Error Logging in"});
		});

		app.post('/getcommands', function(req, res) {
			runSQL('select','commands',{channel:req.body.channel},'',db).then(results => {
				res.send(results);
			});
		});

		app.post('/getdefaultcommands', function(req, res) {
			var query = {};
			runSQL('select','defaultCommands',query,'',db).then(results => {
				res.send(results);
			});
		});

		app.post('/getsonglist', function(req, res) {
			var query = {channel:req.body.channel};
			runSQL('select','songs',query,'',db).then(results => {
				res.send(results);
			});
		});

		app.post('/getsongcache', function(req, res) {
			var query = {channel:req.body.channel};
			runSQL('select','songcache',query,'',db).then(results => {
				res.send(results);
			});
		});

		app.post('/getvolume', function(req, res) {
			var query = {ChannelName:req.body.channel};
			runSQL('select','channels',query,'',db).then(results => {
				res.send(results);
			});
		});

		app.post('/getsettings', function(req, res) {
			var query = {ChannelName:req.body.channel};
			runSQL('select','channels',query,'',db).then(results => {
				res.send(results);
			});
		});

		app.post('/getmusicstatus', function(req, res) {
			var query = {ChannelName:req.body.channel};
			runSQL('select','channels',query,'',db).then(results => {
				res.send(results);
			});
		});

		app.post('/updatesettings', function(req, res) {
			var dataToUse = {};
			dataToUse["duplicateSongDelay"] = parseInt(req.body.duplicateSongDelay,10);
			dataToUse["songNumberLimit"] = parseInt(req.body.songNumberLimit);
			dataToUse["maxSongLength"] = parseInt(req.body.maxSongLength);
			runSQL('update','channels',{ChannelName:req.body.channel},dataToUse,db).then(results => {
				res.send('updated');
			});
		});

		app.post('/updatevolume', function(req, res) {
			var query = {ChannelName:req.body.channel};
			var dataToUse = {};
			dataToUse["volume"] = req.body.volume;
			runSQL('update','channels',query,dataToUse,db).then(results => {
				res.send('');
			});
		});

		app.post('/updatemusicstatus', function(req, res) {
			var query = {ChannelName:req.body.channel};
			var dataToUse = {};
			dataToUse["musicStatus"] = req.body.musicStatus;
			runSQL('update','channels',query,dataToUse,db).then(results => {
				res.send('');
			});
		});

		app.post('/joinchannel', function(req, res) {
			twitch.joinSingleChannel(req.body.channel).then(results => {
				res.send('joined');
			})
		});

		app.post('/partchannel', function(req, res) {
			twitchClient.part(req.body.channel).then(function(data) {
				var query = {ChannelName:req.body.channel};
				var dataToUse = {};
				dataToUse["inChannel"] = false;
				runSQL('update','channels',query,dataToUse,db);
				res.send('parted');
			}).catch(function(err) {
				res.send(err);
			});
		});

		app.post('/checkchannelstatus', function(req, res) {
			var query = {ChannelName:req.body.channel};
			runSQL('select','channels',query,'',db).then(results => {
				if (results) {
					res.send(results[0]['inChannel']);
				} else {
					res.send(false);
				}
			});
		});

		app.post('/loadnextsong', function(req, res) {
			var query = {channel:req.body.channel};
			runSQL('select','songs',query,'',db).then(results => {
				if (results) {
					var songToRemove = results[0]['_id'];
					var dataToUse = {};
					var query = {};
					var songToReturn = '';
					if (results[1] !== undefined) {
						var songToUpdateSortOrder = results[1]['_id'];
						songToReturn = results[1]['songID'];
						dataToUse = {};
						query = {channel:req.body.channel,_id:songToUpdateSortOrder};
						dataToUse["sortOrder"] = 100000;
						runSQL('update','songs',query,dataToUse,db).then(results => {}); //update command
					}
					dataToUse = {};
					var query2 = {channel:req.body.channel,_id:songToRemove};
					runSQL('delete','songs',query2,dataToUse,db).then(results => {}); //update command

					dataToUse = {};
					query = {ChannelName:req.body.channel};
					dataToUse["tempSortVal"] = 199999;
					runSQL('update','channels',query,dataToUse,db).then(results => {}); //update command

					if (songToReturn) {
						res.send(songToReturn);
					} else {
						res.send('empty');
					}
				}
			});
		});

		app.post('/handlelogin', function(req, res) {
			//this whole post request is for handling initial logins
			var token = req.body.token;
			res.cookie('token', token, {maxAge: 2629746000}); // set the token as a cookie
			twitchClient.api({
				url: "https://api.twitch.tv/kraken/user/?oauth_token=" + token,
				method: "GET"
			}, function(err, res2, body) {
				var userEmail = body.email;
				var twitchUserID = body._id;
				var userLogo = body.logo;
				var ChannelName = body.name;
				var userDetails = userEmail + ',' + userLogo + ',#' + ChannelName + ',' + twitchUserID;
				// set the userDetails as a cookie
				res.cookie('userDetails', userDetails, {maxAge: 2629746000});
				//add session to the db
				var sessionData = {};
				sessionData["twitchUserID"] = twitchUserID;
				sessionData["token"] = token;
				runSQL('add','sessions',{},sessionData,db).then(results => {});
				//handle user adding and updating
				runSQL('select','channels',{twitchUserID:twitchUserID},'',db).then(results => {
					if (!results) {
						//channel doesn't exist, add it
						var dataToUse = {};
						var userToAdd = '#' + ChannelName.toLowerCase();
						dataToUse["ChannelName"] = userToAdd;
						dataToUse["ChannelEmail"] = userEmail;
						dataToUse["ChannelLogo"] = userLogo;
						dataToUse["twitchUserID"] = twitchUserID;
						dataToUse["volume"] = 30;
						dataToUse["musicStatus"] = 'pause';
						dataToUse["tempSortVal"] = 199999;
						dataToUse["inChannel"] = false; //starts off with the bot not in this channel
						dataToUse["maxSongLength"] = 12; //stored in minutes - max length per song
						dataToUse["songNumberLimit"] = 10; //how many songs per user
						dataToUse["duplicateSongDelay"] = 20; //stored in hours - hours before allowing duplicate song
						runSQL('add','channels',{},dataToUse,db).then(results => {
							runSQL('select','defaultCommands',{},'',db).then(results => {
								if (results) {
									var newData = [];
									for (var i = results.length - 1; i >= 0; i--) {
										switch(results[i]['trigger']) {
											case "!promote":
											case "!removesong":
											case "!pause":
											case "!play":
											case "!skipsong":
											case "!regular":
											case "!commands":
											case "!volume":
											case "!shuffle":
											case "!lastseen":
											case "!firstseen":
												newData = [{"channel": userToAdd,"permissionLevel": 3}];
												break;
											default:
												newData = [{"channel": userToAdd,"permissionLevel": 0}];
												break;
										}
										var query = {};
										var dataToUse = {};
										var currentList = results[i].permissionsPerChannel;
										if (currentList instanceof Array) {
											Array.prototype.push.apply(currentList, newData);
											query = {trigger:results[i].trigger};
											dataToUse["permissionsPerChannel"] = currentList;
											runSQL('update','defaultCommands',query,dataToUse,db).then(res => {});
										}
									}
								}
								res.send('useradded');
							});
						});
					} else {
						userToUpdate = '#' + ChannelName;
						if (results[0].ChannelName.toLowerCase() != userToUpdate.toLowerCase()) {
							//this should only fire if a user has changed their username on Twitch
							//we need to update all the tables that contain the username
							dataToUse = {};
							dataToUse["channel"] = userToUpdate;
							runSQL('updateall','commands',{channel:results[0].ChannelName},dataToUse,db);
							runSQL('updateall','regulars',{channel:results[0].ChannelName},dataToUse,db);
							runSQL('updateall','chatusers',{channel:results[0].ChannelName},dataToUse,db);
							runSQL('updateall','songs',{channel:results[0].ChannelName},dataToUse,db);
							runSQL('updateall','songcache',{channel:results[0].ChannelName},dataToUse,db);

							var query = {};
							var dataToUse = {};
							query = {permissionsPerChannel: { $elemMatch: { channel: results[0].ChannelName}}};
							dataToUse = {"permissionsPerChannel.$.channel" : userToUpdate};
							runSQL('updateall','defaultCommands',query,dataToUse,db);
						}
						var dataToUse = {};
						dataToUse["ChannelEmail"] = userEmail;
						dataToUse["ChannelLogo"] = userLogo;
						dataToUse["ChannelName"] = userToUpdate;
						runSQL('update','channels',{twitchUserID:twitchUserID},dataToUse,db).then(results => {
							res.send('userupdated');
						});
					}
				});
			});
		});
		app.listen(serverPort, '0.0.0.0');
		resolve('Web server running on port ' + serverPort);
	});
};

module.exports = {
	start: start,
	connect: connect
};