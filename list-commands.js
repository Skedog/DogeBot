var runSQL = require('./runSQL.js');
var permissions = require('./permissions.js');
var functions = require('./general-functions.js');

var add = function(db,twitchClient,channel,userstate,messageParams,results) {
	return new Promise((resolve, reject) => {
		var arrayOfMessages = results[0].listArray;
		var messageToAdd = messageParams.slice(2,messageParams.length).join(' ').replace("'","&apos;");
		if (arrayOfMessages) {
			arrayOfMessages.push(messageToAdd);
		} else {
			arrayOfMessages = [];
			arrayOfMessages.push(messageToAdd);
		}
		var query = {channel:channel,trigger:messageParams[0]};
		var dataToUse = {};
		dataToUse["listArray"] = arrayOfMessages;
		runSQL('update','commands',query,dataToUse,db).then(results => {
			var messageToSend = 'Added successfully as #' + arrayOfMessages.length + '!';
			resolve(messageToSend);
		}).catch(err => {
			reject(err);
		});
	});
}

var edit = function(db,twitchClient,channel,userstate,messageParams,results) {
	return new Promise((resolve, reject) => {
		var arrayOfMessages = results[0].listArray;
		var passedQuoteNumber = messageParams[2].replace('#',''), indexToEdit = passedQuoteNumber-1;
		if (functions.isNumber(indexToEdit)) {
			if (indexToEdit >= 0 && indexToEdit <= arrayOfMessages.length-1) {
				var newMessage = messageParams.slice(3,messageParams.length).join(' ').replace("'","&apos;");
				arrayOfMessages[indexToEdit] = newMessage;
				var query = {channel:channel,trigger:messageParams[0]};
				var dataToUse = {};
				dataToUse["listArray"] = arrayOfMessages;
				runSQL('update','commands',query,dataToUse,db).then(results => {
					var messageToSend = messageParams[0].slice(1) + ' #' + passedQuoteNumber  + ' has been updated!';
					resolve(messageToSend);
				}).catch(err => {
					reject(err);
				});
			};
		}
	});
}

var remove = function(db,twitchClient,channel,userstate,messageParams,results) {
	return new Promise((resolve, reject) => {
		var arrayOfMessages = results[0].listArray;
		var passedQuoteNumber = messageParams[2].replace('#',''), indexToRemove = passedQuoteNumber-1;
		if (functions.isNumber(indexToRemove)) {
			if (indexToRemove >= 1 && indexToRemove <= arrayOfMessages.length-1) {
				arrayOfMessages.splice(indexToRemove,1);
				var query = {channel:channel,trigger:messageParams[0]};
				var dataToUse = {};
				dataToUse["listArray"] = arrayOfMessages;
				runSQL('update','commands',query,dataToUse,db).then(results => {
					var messageToSend = messageParams[0].slice(1) + ' #' + passedQuoteNumber  + ' has been removed!';
					resolve(messageToSend);
				}).catch(err => {
					reject(err);
				});
			};
		}
	});
}

var getListCommandItem = function(db,twitchClient,channel,userstate,messageParams,results) {
	return new Promise((resolve, reject) => {
		var arrayOfMessages = results[0].listArray;
		if (arrayOfMessages) {
			if (messageParams[1]) {
				var passedIndex = messageParams[1].replace('#','');
				var indexToUse = passedIndex - 1;
				if (indexToUse <= arrayOfMessages.length - 1) {
					var messageToSend = '#' + (indexToUse+1) + ': ' + arrayOfMessages[indexToUse].replace('&apos;',"'")
					resolve(messageToSend);
				} else {
					reject('Not a valid ' + results[0].trigger);
				};
			} else {
				functions.getRandomItemFromArray(arrayOfMessages).then(res => {
					var messageToSend = '#' + res[0] + ': ' + res[1]
					resolve(messageToSend);
				}).catch(err => {
					reject(err);
				});
			}
		}
	});
}

module.exports = {
	add: add,
	edit: edit,
	remove: remove,
	getListCommandItem: getListCommandItem
};