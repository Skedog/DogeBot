var Chance = require('chance');

var isNumber = function(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

var getRandomItemFromArray = function(arrayOfMessages) {
	return new Promise((resolve, reject) => {
		var chance = new Chance();
		var randomNumber = chance.integer({min: 0, max: arrayOfMessages.length-1});
		resolve([parseInt(randomNumber)+1,arrayOfMessages[randomNumber].replace('&apos;',"'")]);
	})
}

var shuffleArray = function(array) {
	var currentIndex = array.length;
	while (0 !== currentIndex) {
		var randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		var temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}

var parseQuery = function(qstr) {
	var query = {};
	var a = (qstr[0] === '?' ? qstr.substr(1) : qstr).split('&');
	for (var i = 0; i < a.length; i++) {
		var b = a[i].split('=');
		query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
	}
	return query;
}

var generateListOfRandomNumbers = function(numberOfItemsInList,maxNumberToGenerateFrom) {
	var listOfNumbers = '';
	for (i = 0; i < numberOfItemsInList; i++) {
		if (listOfNumbers !== undefined) {
			for (x = 0; x < numberOfItemsInList-1; x++) {
				var randomNumber = getRandomInt(1,maxNumberToGenerateFrom);
				if (listOfNumbers.indexOf(randomNumber + ',') == -1) {
					listOfNumbers = listOfNumbers + randomNumber + ',';
					break;
				}
			}
		} else {
			listOfNumbers = getRandomInt(1,maxNumberToGenerateFrom) + ',';
		}
	}
	listOfNumbers = listOfNumbers.substring(0, listOfNumbers.length - 1);
	var randomNumberArray = listOfNumbers.split(',').sort(function(a, b){return a - b;});
	return randomNumberArray;
}

var getRandomInt = function(min, max) {
	var chance = new Chance();
	return chance.integer({min: min, max: max});
}

module.exports = {
	isNumber: isNumber,
	getRandomItemFromArray: getRandomItemFromArray,
	shuffleArray: shuffleArray,
	parseQuery: parseQuery,
	generateListOfRandomNumbers: generateListOfRandomNumbers,
	getRandomInt: getRandomInt
};