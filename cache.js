const log = require('npmlog');

async function start() {
	const NodeCache = require('node-cache');
	const botCache = new NodeCache({stdTTL: 300, checkperiod: 0});
	module.exports.botCache = botCache;
	log.info('Cache created');
}

async function set(cacheName, val, time = 300) {
	module.exports.botCache.set(cacheName, val, time);
}

async function get(cacheToGet) {
	return module.exports.botCache.get(cacheToGet);
}

async function del(cacheToDelete) {
	module.exports.botCache.del(cacheToDelete);
}

module.exports = {
	start,
	set,
	get,
	del
};
