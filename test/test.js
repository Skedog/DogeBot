var assert = require('assert');
var expect = require("chai").expect;
var functions = require('.././general-functions.js');
var database = require('.././database.js');
var twitch = require('.././twitch.js');
var permissions = require('.././permissions.js');
var chat = require('.././chat-commands.js');
var maintenance = require('.././maintenance-functions.js');

var userstate = [];
userstate['username'] = 'skedogbot';
userstate['display-name'] = 'skedogbot';
userstate['mod'] = false;
userstate['subscriber'] = false;


// - - - - - - GENERAL FUNCTIONS - - - - - - - -//


it('should test getRandomItemFromArray()', function() {
	var arrayToSearch = ["test3","test2","test4","test5","test6","test1"];
	functions.getRandomItemFromArray(arrayToSearch).then(randomItem => {
		assert(arrayToSearch.includes(randomItem[1]));
	});
});

it('should test parseQuery()', function() {
	var queryToParse = "v=-PMd1PaI3M0&list=PLS84tqhbWDgNj3NnBMEN3DxM0n_cEiJCM";
	var songID = '-PMd1PaI3M0';
	assert(functions.parseQuery(queryToParse)["v"] == songID);
});


// - - - - - - DATABASE FUNCTIONS - - - - - - - -//

it('should test database.connect()', function() {
	database.connect().then(db => {
		assert(db);
	});
});

it('should test database.getDbConstants()', function() {
	return database.connect().then(db => {
		return database.getDbConstants(db).then(dbConstants => {
			assert(Object.keys(dbConstants).length == 5);
		});
	});
});


// - - - - - - TWITCH FUNCTIONS - - - - - - - -//

it('should test twitch.connect()', function() {
	return database.connect().then(db => {
		return database.getDbConstants(db).then(dbConstants => {
			return twitch.connect(db,dbConstants).then(res => {
				assert(res);
			});
		});
	});
});

it('should test twitch.joinStartupChannels()', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return twitch.connect(db,dbConstants).then(res => {
			return twitch.joinStartupChannels(db,dbConstants).then(res => {
				assert(res);
			});
		});
	});
});

it('should test twitch.monitorChat()', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return twitch.connect(db,dbConstants).then(res => {
			twitchClient.on("chat", function(channel, userstate, message, self) {
				expect(message).to.equal('hello world');
			});
			twitchClient.say('#ygtskedogtest','hello world');
		});
	});
});


// - - - - - - COMMAND TIMER FUNCTIONS - - - - - - - -//

it('should test chat.setDelayTimerPerChannel()', function() {
	return chat.setDelayTimerPerChannel('#ygtskedogtest');
});


it('should test chat.checkAndSetCommandDelayTimer()', function() {
	return chat.setDelayTimerPerChannel('#ygtskedogtest').then(res => {
		return chat.checkAndSetCommandDelayTimer('#ygtskedogtest','!testing',3);
	});
});


// - - - - - - COMMAND FUNCTIONS - - - - - - - -//

it('should test !commands', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!commands','!commands').then(res => {
			expect(res).to.equal('The commands for this channel are available here: http://skedogbot.com/commands?channel=ygtskedogtest');
		});
	});
});

it('should test !commands add, edit, permissions and remove', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		userstate['mod'] = true;
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!commands add !testcommand this is a test','!commands').then(res => {
			expect(res).to.equal('skedogbot -> The command !testcommand has been added!');
			return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!commands edit !testcommand this is a test edit','!commands').then(res => {
				expect(res).to.equal('skedogbot -> The command !testcommand has been updated!');
				return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!commands perms !testcommand 3','!commands').then(res => {
					expect(res).to.equal('skedogbot -> The command !testcommand permissions have been updated!');
					return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!commands delete !testcommand','!commands').then(res => {
						expect(res).to.equal('skedogbot -> The command !testcommand has been deleted!');
					})
				})
			})
		});
	});
});

it('should test !regulars', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!regulars','!regulars').then(res => {
			expect(res).to.be.undefined;
		});
	});
});

it('should test !regulars add and remove', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!regulars add skedogbot','!regulars').then(res => {
			expect(res).to.equal('skedogbot -> skedogbot has been added as a regular!');
			return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!regulars remove skedogbot','!regulars').then(res => {
				expect(res).to.equal('skedogbot -> skedogbot has been removed as a regular!');
			});
		});
	});
});

it('should test !uptime', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!uptime','!uptime').then(res => {
			expect(res).to.have.string('isn\'t currently streaming!');
		});
	});
});

it('should test !followage', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!followage','!followage').then(res => {
			expect(res).to.have.string('isn\'t following ygtskedogtest');
		});
	});
});

it('should test !game', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!game','!game').then(res => {
			expect(res).to.have.string('is currently playing');
		});
	});
});

it('should test !viewers', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!viewers','!viewers').then(res => {
			expect(res).to.have.string('currently');
		});
	});
});

it('should test !winner', function() {
	this.timeout(5000);
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!winner','!winner').then(res => {
			expect(res).to.have.string('The winner is');
		});
	});
});

it('should test !qotd', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!qotd','!qotd').then(res => {
			expect(res).to.have.string(' ');
		});
	});
});

it('should test !bf4stats', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!bf4stats TwitchYgTSkedog','!bf4stats').then(res => {
			expect(res).to.have.string('k/d and is rank');
		});
	});
});

it('should test !8ball', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!8ball testing','!8ball').then(res => {
			expect(res).to.have.string(' ');
		});
	});
});

it('should test !lastseen', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!lastseen skedogbot','!lastseen').then(res => {
			expect(res).to.have.string('was last seen');
		});
	});
});

it('should test !firstseen', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!firstseen skedogbot','!firstseen').then(res => {
			expect(res).to.have.string('was first seen');
		});
	});
});

it('should test !songlist', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!songlist','!songlist').then(res => {
			expect(res).to.have.string('The song list is available');
		});
	});
});

it('should test !songcache', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!songcache','!songcache').then(res => {
			expect(res).to.have.string('The song cache is available');
		});
	});
});

it('should test !currentsong', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!currentsong','!currentsong').then(res => {
			expect(res).to.have.string('requested');
		});
	});
});

it('should test !volume', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!volume','!volume').then(res => {
			expect(res).to.have.string('The current volume is:');
		});
	});
});

it('should test !volume 50', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!volume 50','!volume').then(res => {
			expect(res).to.have.string('The volume has been updated');
		});
	});
});

it('should test !play', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!play','!play').then(res => {
			expect(res).to.have.string('Music is now playing!');
		});
	});
});

it('should test !pause', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!pause','!pause').then(res => {
			expect(res).to.have.string('Music has been paused!');
		});
	});
});

it('should test !removesongs skedogbot', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!removesongs skedogbot','!removesongs').then(res => {
			expect(res).to.have.string('Songs removed!');
		});
	});
});

it('should test maintenance.clearSongCache()', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return maintenance.clearSongCache(db,'#ygtskedogtest');
	});
});

it('should test !sr skedog speedpaint', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!sr skedog speedpaint','!sr').then(res => {
			expect(res).to.have.string('The song SkeDog Fanart Speedpaint has been added to the queue');
		});
	});
});

it('should test !sr multi', function() {
	this.timeout(10000);
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!sr 8i-tonOhzSg,z--CnoHrkds,QeBaxc4Cglo','!sr').then(res => {
			expect(res).to.have.string('3 songs added!');
		});
	});
});

it('should test !sr multi fails', function() {
	this.timeout(10000);
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!removesong 2','!removesong').then(res => {
			return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!sr 8i-tonOhzSg,3pKGYqCK5yg,Jwux_c8cIQ8,z--CnoHrkds,KX8U8guRLSk,KX8U8guRlSk,kqUpnHEdjn0','!sr').then(res => {
				expect(res).to.have.string('1 song was added, but 1 song was played too recently, 1 song is too long, 1 song already exists, 1 song was unavailable for playback in: US, 1 song was not allowed to be embeded, and 1 ID was invalid!');
			});
		});
	});
});

it('should test !sr multi all get added', function() {
	this.timeout(10000);
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!removesongs skedogbot','!removesongs').then(res => {
			return maintenance.clearSongCache(db,'#ygtskedogtest').then(res => {
				return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!sr https://www.youtube.com/watch?v=EMfNB3fakB8&feature=youtu.be,https://www.youtube.com/watch?v=zO3J12uQIXI,https://www.youtube.com/watch?v=V5-AQTPFJSg,https://www.youtube.com/watch?v=OmnDEUD9NyI&feature=youtu.be,https://www.youtube.com/watch?v=3OC2aPCuzjo&feature=youtu.be','!sr').then(res => {
					expect(res).to.have.string('5 songs added!');
				});
			});
		});
	});
});

it('should test !pr over 50 songs', function() {
	this.timeout(50000);
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!removesongs skedogbot','!removesongs').then(res => {
			return maintenance.clearSongCache(db,'#ygtskedogtest').then(res => {
				return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!pr PLS84tqhbWDgPUo7otgCVerT5jz54QypU4','!pr').then(res => {
					expect(res).to.have.string('10 songs added!');
				});
			});
		});
	});
});

it('should test !pr under 50 songs', function() {
	this.timeout(50000);
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!removesongs skedogbot','!removesongs').then(res => {
			return maintenance.clearSongCache(db,'#ygtskedogtest').then(res => {
				return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!pr https://www.youtube.com/watch?v=8QpUGCXwOks&list=PLtzah_dj5hUXk--M73cM1oq8twaKW_Axe','!pr').then(res => {
					expect(res).to.have.string('10 songs added!');
				});
			});
		});
	});
});

it('should test !shuffle', function() {
	this.timeout(50000);
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!shuffle','!shuffle').then(res => {
			expect(res).to.have.string('Songs shuffled!');
		});
	});
});


// - - - - - - PERMISSIONS FUNCTIONS - - - - - - - -//

it('should test permissions.getCommandPermissionLevel()', function() {
	return database.start().then(dbAndConstants => {
		var db = dbAndConstants[0];
		var dbConstants = dbAndConstants[1];
		return permissions.getCommandPermissionLevel(db,'!skipsong',[],'#ygtskedogtest').then(res => {
			expect(res).to.equal(3);
			return permissions.getCommandPermissionLevel(db,'!commands',[],'#ygtskedogtest').then(res => {
				expect(res).to.equal(0);
				return permissions.getCommandPermissionLevel(db,'!commands',['!commands','add'],'#ygtskedogtest').then(res => {
					expect(res).to.equal(3);
					return permissions.getCommandPermissionLevel(db,'!volume',[],'#ygtskedogtest').then(res => {
						expect(res).to.equal(0);
						return permissions.getCommandPermissionLevel(db,'!volume',['!volume','50'],'#ygtskedogtest').then(res => {
							expect(res).to.equal(3);
						});
					});
				});
			});
		});
	});
});

it('should test permissions.getUserPermissionLevel()', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		return permissions.getUserPermissionLevel(db,'#skedogbot',userstate).then(res => {
			expect(res).to.equal(4); //check for channel owner
			userstate['mod'] = true;
			return permissions.getUserPermissionLevel(db,'#ygtskedogtest',userstate).then(res => {
				expect(res).to.equal(3); //check if mod
				userstate['mod'] = false;
				userstate['subscriber'] = true;
				return permissions.getUserPermissionLevel(db,'#ygtskedogtest',userstate).then(res => {
					expect(res).to.equal(2); //check if subscriber
					userstate['subscriber'] = false;
					return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!regulars add skedogbot','!regulars').then(res => {
						expect(res).to.equal('skedogbot -> skedogbot has been added as a regular!');
						return permissions.getUserPermissionLevel(db,'#ygtskedogtest',userstate).then(res => {
							expect(res).to.equal(1); //check if regular
							return chat.callCommand(db,{say:function() {}},'#ygtskedogtest',userstate,'!regulars remove skedogbot','!regulars').then(res => {
								expect(res).to.equal('skedogbot -> skedogbot has been removed as a regular!');
							});
						});
					});
				});
			});
		});
	});
});

it('should test permissions.canUserCallCommand()', function() {
	return database.start().then(dbAndConstants => {
		db = dbAndConstants[0];
		dbConstants = dbAndConstants[1];
		userstate['mod'] = true;
		return permissions.canUserCallCommand(db,userstate,3,'#ygtskedogtest').then(res => {
			expect(res).to.equal(true);
		});
	});
});