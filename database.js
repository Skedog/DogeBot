const mongo = require('mongodb').MongoClient;
const log = require('npmlog');

class Database {
	async connect() {
		const _this = this;
		const mongoConfig = JSON.parse(process.env.APP_CONFIG);
		const dbStr = 'mongodb://' + mongoConfig.mongo.user + ':' + process.env.MONGO_PASSWORD + '@' + mongoConfig.mongo.hostString;
		try {
			const conn = await mongo.connect(dbStr);
			module.exports.db = conn;
			log.info('Connected to database');
			return _this.constants();
		} catch (err) {
			throw new Error(err);
		}
	}

	async select(props) {
		try {
			const result = await module.exports.db.collection(props.table).find(props.query, {sort: [['sortOrder', 'asc'], ['_id', 'asc']]}).toArray();
			if (result.length > 0) {
				return result;
			}
			return;
		} catch (err) {
			throw new Error(err);
		}
	}

	async selectone(props) {
		try {
			const result = await module.exports.db.collection(props.table).findOne(props.query);
			if (result.length > 0) {
				return result;
			}
			return;
		} catch (err) {
			throw new Error(err);
		}
	}

	async add(props) {
		try {
			await module.exports.db.collection(props.table).insert(props.dataToUse);
			return 'added';
		} catch (err) {
			throw new Error(err);
		}
	}

	async update(props) {
		try {
			await module.exports.db.collection(props.table).update(props.query, {$set: props.dataToUse});
			return 'updated';
		} catch (err) {
			throw new Error(err);
		}
	}

	async updateall(props) {
		try {
			await module.exports.db.collection(props.table).update(props.query, {$set: props.dataToUse}, {multi: true});
			return 'updated';
		} catch (err) {
			throw new Error(err);
		}
	}

	async removefield(props) {
		try {
			await module.exports.db.collection(props.table).update(props.query, {$unset: props.dataToUse}, {multi: true});
			return 'updated';
		} catch (err) {
			throw new Error(err);
		}
	}

	async delete(props) {
		try {
			await module.exports.db.collection(props.table).deleteOne(props.query);
			return 'deleted';
		} catch (err) {
			throw new Error(err);
		}
	}

	async deleteall(props) {
		try {
			await module.exports.db.collection(props.table).deleteMany(props.query);
			return 'deleted';
		} catch (err) {
			throw new Error(err);
		}
	}

	async constants() {
		const props = {table: 'globalConstants'};
		const constants = await this.select(props);
		const dbArray = {
			twitchOauthPass: constants[0].twitchOauthPass,
			twitchClientID: constants[0].twitchClientID,
			twitchTestClientID: constants[0].twitchTestClientID,
			YouTubeAPIKey: constants[0].YouTubeAPIKey,
			discordAPIKey: constants[0].discordAPIKey
		};
		return dbArray;
	}
}

module.exports = new Database();
