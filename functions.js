const Chance = require('chance');

function isNumber(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

function getRandomItemFromArray(arrayOfMessages) {
	const chance = new Chance();
	const randomNumber = chance.integer({min: 0, max: arrayOfMessages.length - 1});
	return [parseInt(randomNumber, 10) + 1, arrayOfMessages[randomNumber].replace('&apos;', '\'')];
}

function stripHash(passedStr) {
	return passedStr.replace(/#/g, '');
}

function shuffleArray(array) {
	let currentIndex = array.length;
	while (currentIndex !== 0) {
		const randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		const temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}

function parseQuery(qstr) {
	const query = {};
	const a = (qstr[0] === '?' ? qstr.substr(1) : qstr).split('&');
	for (let i = 0; i < a.length; i++) {
		const b = a[i].split('=');
		query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
	}
	return query;
}

function generateListOfRandomNumbers(numberOfItemsInList, maxNumberToGenerateFrom) {
	let listOfNumbers;
	for (let i = 0; i < numberOfItemsInList; i++) {
		if (listOfNumbers === undefined) {
			listOfNumbers = getRandomInt(1, maxNumberToGenerateFrom) + ',';
		} else {
			for (let x = 0; x < numberOfItemsInList - 1; x++) {
				const randomNumber = getRandomInt(1, maxNumberToGenerateFrom);
				if (listOfNumbers.indexOf(randomNumber + ',') === -1) {
					listOfNumbers = listOfNumbers + randomNumber + ',';
					break;
				}
			}
		}
	}
	listOfNumbers = listOfNumbers.substring(0, listOfNumbers.length - 1);
	const randomNumberArray = listOfNumbers.split(',').sort((a, b) => {
		return a - b;
	});
	return randomNumberArray;
}

function getRandomInt(min, max) {
	const chance = new Chance();
	return chance.integer({min, max});
}

function buildUserString(props) {
	let userStr;
	if (props.messageParams[1] && !props.ignoreMessageParamsForUserString) {
		userStr = props.messageParams[1] + ' -> ';
	} else {
		userStr = '@' + props.userstate['display-name'] + ' -> ';
	}
	return userStr;
}

function chunkArray(myArray, chunkSize) {
	const results = [];
	while (myArray.length) {
		results.push(myArray.splice(0, chunkSize));
	}
	return results;
}

module.exports = {
	isNumber,
	getRandomItemFromArray,
	shuffleArray,
	parseQuery,
	generateListOfRandomNumbers,
	getRandomInt,
	buildUserString,
	stripHash,
	chunkArray
};
