const database = require('./database.js');
const Chance = require('chance');

function isNumber(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

function getRandomItemFromArray(arrayOfMessages) {
	let chance = new Chance();
	let randomNumber = chance.integer({min: 0, max: arrayOfMessages.length-1});
	return [parseInt(randomNumber)+1,arrayOfMessages[randomNumber].replace('&apos;',"'")];
}

function shuffleArray(array) {
	let currentIndex = array.length;
	while (0 !== currentIndex) {
		const randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		const temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}

function parseQuery(qstr) {
	let query = {};
	const a = (qstr[0] === '?' ? qstr.substr(1) : qstr).split('&');
	for (let i = 0; i < a.length; i++) {
		const b = a[i].split('=');
		query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
	}
	return query;
}

function generateListOfRandomNumbers(numberOfItemsInList,maxNumberToGenerateFrom) {
	let listOfNumbers;
	for (i = 0; i < numberOfItemsInList; i++) {
		if (listOfNumbers !== undefined) {
			for (let x = 0; x < numberOfItemsInList-1; x++) {
				const randomNumber = getRandomInt(1,maxNumberToGenerateFrom);
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
	const randomNumberArray = listOfNumbers.split(',').sort(function(a, b){return a - b;});
	return randomNumberArray;
}

function getRandomInt(min, max) {
	const chance = new Chance();
	return chance.integer({min: min, max: max});
}

function buildUserString(props) {
	//props.ignoreMessageParamsForUserString = true;
	let userStr;
	if (props.messageParams[1] && !props.ignoreMessageParamsForUserString) {
		userStr = props.messageParams[1] + ' -> ';
	} else {
		userStr = '@' + props.userstate['display-name'] + ' -> ';
	}
	return userStr;
}

module.exports = {
	isNumber: isNumber,
	getRandomItemFromArray: getRandomItemFromArray,
	shuffleArray: shuffleArray,
	parseQuery: parseQuery,
	generateListOfRandomNumbers: generateListOfRandomNumbers,
	getRandomInt: getRandomInt,
	buildUserString: buildUserString
};