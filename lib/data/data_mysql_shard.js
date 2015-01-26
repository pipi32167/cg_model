'use strict';
var crc = require('crc')
var async = require('async');
var util = require('util');
// var sqlFormat = require('mysql').format;
var _ = require('underscore');
var _s = require('underscore.string');
var assert = require('assert');
// var sql = require('sql');
var consts = require('../consts');
// var utils = require('../utils');
var JobMySqlLate = require('./job_mysql_late');
var lib = require('../index');

var getShardKeys = function(def) {
	var keys = [];
	var props = def.props;
	for (var prop in props) {
		if (props.hasOwnProperty(prop) && props[prop].shard) {
			if (props[prop].type !== consts.PropType.NUMBER &&
				props[prop].type !== consts.PropType.STRING &&
				props[prop].type !== consts.PropType.BOOL) {
				assert.ok(false, 'shard key\'s type should not only be string, number or bool, bug got ' + props[prop].type);
			}
			keys.push(prop);
		}
	}
	if (keys.length === 0) {
		assert.ok(false, 'it should not at least one shard keys: ' + def.name);
	}
	return keys;
}

var getShardValues = function(def) {
	var self = this;
	return _(getShardKeys(def)).map(function(elem) {
		return self.model.p(elem);
	});
}

var getShardCount = function(lib, def) {
	var shard_count = def.db.shard_count;
	if (shard_count !== undefined) {
		return shard_count;
	}

	var config = lib.get('config')[consts.DataType.MYSQL_SHARD];
	shard_count = config.shard_count;
	if (shard_count !== undefined) {
		return shard_count;
	}

	shard_count = config.database[def.db.db_name].shard_count;
	if (shard_count !== undefined) {
		return shard_count;
	}

	assert.ok(false, 'please specified shard count');
}

var getMainDBName = function(lib, def) {
	var config = lib.get('config')[consts.DataType.MYSQL_SHARD];
	return def.db.main_db ||
		config.database[def.db.db_name].main_db ||
		assert.ok(false, 'please specified main db name');
}

var getShardDBNameFormat = function(lib, def) {
	var config = lib.get('config')[consts.DataType.MYSQL_SHARD];
	return def.db.shard_db_format ||
		config.database[def.db.db_name].shard_db_format ||
		assert.ok(false, 'please specified shard db format');
}

var defaultGetShardIndex = function(lib, def) {

	return function() {
		var shardCount = getShardCount(lib, def);
		assert.ok(!!shardCount);
		var str = getShardValues.call(this, def).join('|');
		return crc.crc32(str) % shardCount;
	}
}

var defaultGenShardDBName = function(lib, def, shardDBNames, getShardIndex) {
	return function() {
		if (isShard(lib, def)) {
			return shardDBNames[getShardIndex.call(this)];
		} else {
			return getMainDBName(lib, def);
		}
	};
}

var genShardDBNames = function(lib, def) {
	var shardCount = getShardCount(lib, def);
	var dbNameFormat = getShardDBNameFormat(lib, def);
	return _(0)
		.chain()
		.range(shardCount)
		.map(function(elem) {
			return _s.sprintf(dbNameFormat, elem);
		})
		.value();
}

var isShard = function(lib, def) {
	if (getShardCount(lib, def) === 0) {
		return false;
	}

	for (var prop in def.props) {
		if (def.props.hasOwnProperty(prop) &&
			def.props[prop].shard) {
			return true;
		}
	}
	return false;
}

var __updateImmediate = function(updateProps) {
	var prop, props = this.model.def.props;
	for (prop in updateProps) {
		if (updateProps.hasOwnProperty(prop) &&
			props.hasOwnProperty(prop) &&
			(!!props[prop].unique || //is unque key
				!!props[prop].sync || //is need sync
				(!updateProps[prop] && props[prop].primary && props[prop].autoIncr))) { //is undefined primary key and auto increment
			return true;
		}
	}
	return false;
}

var replaceQueryDBName = function(def, query, dbName) {
	var tableName = '`' + def.db.tbl_name + '`';
	var shardTableName = '`' + dbName + '`.' + tableName;
	var regexp = new RegExp(tableName, 'g');
	query.text = query.text.replace(regexp, shardTableName);
}

var exp = module.exports = function(lib, def, connType) {
	var DataMySqlShardBase = require('./data_mysql')(lib, def, connType);

	var DataMySqlShard = function(lib, model) {
		DataMySqlShardBase.call(this, lib, model);

		delete this.conn;
		this.__conn = null;
		this.__dbName = null;
		var self = this;
		Object.defineProperty(this, 'conn', {
			get: function() {
				if (!self.__conn) {
					self.__conn = lib.getMysqlShardDBConn(self.__dbName);
				}
				return self.__conn;
			}
		});

		Object.defineProperty(this, 'dbName', {
			get: function() {
				if (!self.__dbName) {
					if (!isShard(lib, def)) {
						self.__dbName = self.getMainDBName();
					} else {
						self.__dbName = __getShardDBName.call(this);
					}
				}
				return self.__dbName;
			}
		});
	}

	_.extend(DataMySqlShard.prototype, DataMySqlShardBase.prototype);
	_.extend(DataMySqlShard, DataMySqlShardBase);

	DataMySqlShard.prototype.getMainDBName = function() {
		return mainDBName;
	}

	var __createCreateQuery = DataMySqlShard.prototype.createCreateQuery;
	var __createUpdateQuery = DataMySqlShard.prototype.createUpdateQuery;
	var __createLoadQuery = DataMySqlShard.prototype.createLoadQuery;
	var __createRemoveQuery = DataMySqlShard.prototype.createRemoveQuery;

	var mainDBName = getMainDBName(lib, def);
	var shardDBNames = genShardDBNames(lib, def);
	var mainConn = lib.getMysqlShardDBConn(mainDBName);
	var shardConns = _(shardDBNames).map(lib.getMysqlShardDBConn);

	var __getShardIndex = def.db.getShardIndex || defaultGetShardIndex(lib, def);
	var __getShardDBName = def.db.getShardDBName || defaultGenShardDBName(lib, def, shardDBNames, __getShardIndex);

	/**
	 * Bug to be fixed:
	 * It would occer error when the table and one of the columns have the same name
	 * @param  {[type]} query [description]
	 * @return {[type]}       [description]
	 */
	var __replaceDBName = function(query) {
		replaceQueryDBName(def, query, this.dbName);
	}

	DataMySqlShard.prototype.createCreateQuery = function() {
		var query = __createCreateQuery.call(this);
		__replaceDBName.call(this, query);
		return query;
	}

	DataMySqlShard.prototype.create = function(cb) {

		var updateImmediate = __updateImmediate.call(this, this.getCreateArgs());
		if (!updateImmediate) {
			addUpdateJob(this);
			cb();
		} else {
			var self = this;
			this.createSync.call(this, function(err) {
				cb(err);
				self.emit(consts.Event.UPDATED, err);
			});
		}
	}

	DataMySqlShard.prototype.createUpdateQuery = function() {
		var query = __createUpdateQuery.call(this);
		if (!query) {
			return;
		}
		__replaceDBName.call(this, query);
		return query;
	}

	DataMySqlShard.prototype.update = DataMySqlShard.prototype.updateAsync = function(cb) {

		var updateArgs = this.getUpdateArgs();
		if (_(updateArgs).size() === 0) {
			this.emit(consts.Event.UPDATED);
			cb();
			return;
		}

		var updateImmediate = __updateImmediate.call(this, updateArgs);

		if (!updateImmediate) {

			addUpdateJob(this);
			cb();

		} else {

			var self = this;
			this.updateSync.call(this, function(err) {
				self.emit(consts.Event.UPDATED, err);
				cb(err);
			});
		}
	}

	DataMySqlShard.prototype.createLoadQuery = function() {
		var query = __createLoadQuery.call(this);
		__replaceDBName.call(this, query);
		return query;
	}

	DataMySqlShard.prototype.createRemoveQuery = function() {
		var query = __createRemoveQuery.call(this);
		__replaceDBName.call(this, query);
		return query;
	}

	/**
	 * Static methods
	 */

	var shardBatchDoQuery = function(query, cb) {
		var isDBShard = isShard(lib, def);
		var conns = isDBShard ? shardConns : [mainConn];
		var dbNames = isDBShard ? shardDBNames : [mainDBName];
		async.map(
			conns,
			function(conn, cb) {
				var queryElem = _(query).clone();
				replaceQueryDBName(def, queryElem, dbNames[conns.indexOf(conn)]);
				var q = conn.query(queryElem.text, queryElem.values, function(err, res) {
					if (!!err) {
						lib.logger.error('shardBatchDoQuery error:', err, q.sql);
					}
					cb(err, res);
				});
				lib.logger.debugSql(q);
			}, cb);
	}

	DataMySqlShard.find = function(args, cb) {

		var query = this.createStaticFindQuery(args);
		shardBatchDoQuery(query, function(err, results) {
			if (!!err) {
				cb(err);
				return;
			}

			var res = [];
			results.forEach(function(elem) {
				res = res.concat(elem);
			});
			cb(null, res);
		});
	}

	DataMySqlShard.doRemove = function(args, cb) {
		var query = this.createStaticRemoveQuery(args);
		shardBatchDoQuery(query, cb);
	}

	DataMySqlShard.count = function(args, cb) {

		var query = this.createStaticCountQuery(args);

		shardBatchDoQuery(query, function(err, res) {
			if (!!err) {
				cb(err);
				return;
			}

			var count = 0;
			res.forEach(function(elem) {
				count += elem[0].count;
			});
			cb(null, count);
		});
	}

	/**
	 * !!!CAUTION: IT WOULD RETURN ALL OBJECT PRIMARY VALUES!!!
	 * @param  {Function} cb [description]
	 * @return {[type]}      [description]
	 */
	DataMySqlShard.findAll = function(cb) {

		var query = this.createStaticFindAllQuery(this);
		shardBatchDoQuery(query, function(err, results) {
			if (!!err) {
				cb(err);
				return;
			}

			var res = [];
			results.forEach(function(elem) {
				res = res.concat(elem);
			});
			cb(null, res);
		});
	}

	DataMySqlShard.removeAll = function(cb) {

		var query = this.createStaticRemoveAllQuery();
		shardBatchDoQuery(query, cb);
	}

	DataMySqlShard.countAll = function(cb) {
		var query = this.createStaticCountAllQuery();
		shardBatchDoQuery(query, function(err, res) {
			if (!!err) {
				cb(err);
				return;
			}

			var count = 0;
			res.forEach(function(elem) {
				count += elem[0].count;
			});
			cb(null, count);
		});
	}

	return DataMySqlShard;
}

/**
 * Job
 */

var UpdateJob = function(cron, batchCount) {
	JobMySqlLate.call(this, {
		cron: cron,
		doneEvent: consts.Event.UPDATED,
		batchCount: batchCount
	});
}

util.inherits(UpdateJob, JobMySqlLate);

UpdateJob.prototype.createQuery = function(job) {
	var query;
	if (job.isSaved) {
		query = job.createUpdateQuery();
	} else {
		query = job.createCreateQuery();
	}
	return query;
}

var jobs = {};

var addUpdateJob = function(job) {
	if (!jobs[job.dbName]) {

		var config = lib.get(consts.DataType.MYSQL_SHARD);
		jobs[job.dbName] = new UpdateJob(config.cron, config.batchCount);
		jobs[job.dbName].start();
	}
	jobs[job.dbName].add(job);
}

exp.startCronJob = function() {
	var config = lib.get(consts.DataType.MYSQL_SHARD);
	assert.ok(!!config, 'please configure ' + consts.DataType.MYSQL_SHARD + ' first');

	_(jobs).each(function (elem) {
		elem.start();
	});
}

exp.stopCronJob = function(cb) {
	
	if (_(jobs).size() === 0) {
		cb();
		return;
	}

	async.each(
		_(jobs).values(),
		function(elem, cb) {
			elem.stop(cb);
		},
		cb);
}
exp.__type__ = consts.DataType.MYSQL_SHARD;