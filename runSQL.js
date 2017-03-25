module.exports = function(sqlToRun,passedCollection,query,dataToUse,db) {
	return new Promise((resolve, reject) => {
		collection = db.collection(passedCollection);
		switch(sqlToRun) {
			case "select":
				collection.find(query,{"sort":[["sortOrder",'asc'], ['_id','asc']]}).toArray(function (err, result) {
					if (err) {
						reject(err);
					} else if (result.length) {
						resolve(result);
					} else {
						resolve();
					}
				});
				break;
			case "selectone":
				collection.findOne(query, function (err, result) {
					if (err) {
						reject(err);
					} else if (result !== null) {
						if (result.length) {
							resolve(result);
						} else {
							resolve();
						}
					}
				});
				break;
			case "update":
				collection.update(query, {$set: dataToUse}, function (err, numUpdated) {
					if (err) {
						reject(err);
					} else if (numUpdated) {
						resolve('successupdate');
					} else {
						reject('record not found');
					}
				});
				break;
			case "removefield":
				collection.update(query, {$unset: dataToUse},{multi:true}, function (err, numUpdated) {
					if (err) {
						reject(err);
					} else if (numUpdated) {
						resolve('successupdate');
					} else {
						reject('record not found');
					}
				});
				break;
			case "updateall":
				collection.update(query, {$set: dataToUse},{multi:true}, function (err, numUpdated) {
					if (err) {
						reject(err);
					} else if (numUpdated) {
						resolve('successupdate');
					} else {
						reject('record not found');
					}
				});
				break;
			case "add":
				collection.insert(dataToUse, function (err, result) {
					if (err) {
						reject(err);
					} else {
						resolve('successadd');
					}
				});
				break;
			case "delete":
				collection.deleteOne(query, function(err, result) {
					if (err) {
						reject(err);
					} else {
						resolve('successdelete');
					}
				});
				break;
			case "deleteall":
				collection.deleteMany(query, function(err, result) {
					if (err) {
						reject(err);
					} else {
						resolve('successdeletemany');
					};
				});
				break;
			default:
				break;
		}
	})
};