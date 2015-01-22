'use strict';
var crc = require('crc')
	// var async = require('async');
	// var sqlFormat = require('mysql').format;
var _ = require('underscore');
var _s = require('underscore.string');
var assert = require('assert');
// var sql = require('sql');
var consts = require('../consts');
var DataMySqlLate = require('./data_mysql_late');
// var utils = require('../utils');

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
	return def.db.shard_count || lib.get('config')[consts.DataType.MYSQL_SHARD].shard_count;
}

var getMainDBName = function(lib, def) {
	return lib.get('config')[consts.DataType.MYSQL_SHARD].database[def.db.db_name].main_db;
}

var getShardDBNameFormat = function(lib, def) {
	return def.db.shard_db_format || lib.get('config')[consts.DataType.MYSQL_SHARD].database[def.db.db_name].shard_db_format || def.db.db_name + '_shard_%02d';
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
		return shardDBNames[getShardIndex.call(this)];
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

var isShard = function(def) {
	for (var prop in def.props) {
		if (def.props.hasOwnProperty(prop) && def.props[prop].shard) {
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
	var DataMySqlShard = DataMySqlLate.call(this, lib, def, connType);

	DataMySqlShard.prototype.getMainDBName = function() {
		return getMainDBName(lib, def);
	}

	var __createCreateQuery = DataMySqlShard.prototype.createCreateQuery;
	var __createUpdateQuery = DataMySqlShard.prototype.createUpdateQuery;
	var __createLoadQuery = DataMySqlShard.prototype.createLoadQuery;
	var __createRemoveQuery = DataMySqlShard.prototype.createRemoveQuery;
	var __createStaticFindQuery = DataMySqlShard.createStaticFindQuery;
	var __createStaticRemoveQuery = DataMySqlShard.createStaticRemoveQuery;
	var __createStaticCountQuery = DataMySqlShard.createStaticCountQuery;
	var __createStaticFindAllQuery = DataMySqlShard.createStaticFindAllQuery;
	var __createStaticRemoveAllQuery = DataMySqlShard.createStaticRemoveAllQuery;
	var __createStaticCountAllQuery = DataMySqlShard.createStaticCountAllQuery;
	var __staticFind = DataMySqlShard.find;
	var __staticFindAll = DataMySqlShard.findAll;

	if (!isShard(def)) {

		var dbName = getMainDBName(lib, def);
		assert.ok(!!dbName);
		DataMySqlShard.prototype.createCreateQuery = function() {
			var query = __createCreateQuery.call(this);
			replaceQueryDBName(def, query, dbName);
			return query;
		}

		DataMySqlShard.prototype.createUpdateQuery = function() {
			var query = __createUpdateQuery.call(this);
			replaceQueryDBName(def, query, dbName);
			return query;
		}

		DataMySqlShard.prototype.createLoadQuery = function() {
			var query = __createLoadQuery.call(this);
			replaceQueryDBName(def, query, dbName);
			return query;
		}

		DataMySqlShard.prototype.createRemoveQuery = function() {
			var query = __createRemoveQuery.call(this);
			replaceQueryDBName(def, query, dbName);
			return query;
		}

		DataMySqlShard.createStaticFindQuery = function(args) {
			var query = __createStaticFindQuery.call(this, args);
			replaceQueryDBName(def, query, dbName);
			return query;
		}

		DataMySqlShard.createStaticRemoveQuery = function(args) {
			var query = __createStaticRemoveQuery.call(this, args);
			replaceQueryDBName(def, query, dbName);
			return query;
		}

		DataMySqlShard.createStaticCountQuery = function(args) {
			var query = __createStaticCountQuery.call(this, args);
			replaceQueryDBName(def, query, dbName);
			return query;
		}

		DataMySqlShard.createStaticFindAllQuery = function() {
			var query = __createStaticFindAllQuery.call(this);
			replaceQueryDBName(def, query, dbName);
			return query;
		}

		DataMySqlShard.createStaticRemoveAllQuery = function() {
			var query = __createStaticRemoveAllQuery.call(this);
			replaceQueryDBName(def, query, dbName);
			return query;
		}

		DataMySqlShard.createStaticCountAllQuery = function() {
			var query = __createStaticCountAllQuery.call(this);
			replaceQueryDBName(def, query, dbName);
			return query;
		}

	} else {

		var shardDBNames = genShardDBNames(lib, def);

		var __getShardIndex = def.db.getShardIndex || defaultGetShardIndex(lib, def);
		var __getShardDBName = def.db.getShardDBName || defaultGenShardDBName(lib, def, shardDBNames, __getShardIndex);

		/**
		 * Bug to be fixed:
		 * It would occer error when the table and one of the columns have the same name
		 * @param  {[type]} query [description]
		 * @return {[type]}       [description]
		 */
		var __replaceDBName = function(query) {
			var dbName = __getShardDBName.call(this);
			replaceQueryDBName(def, query, dbName);
		}

		DataMySqlShard.prototype.createCreateQuery = function() {
			var query = __createCreateQuery.call(this);
			__replaceDBName.call(this, query);
			return query;
		}

		DataMySqlShard.prototype.createUpdateQuery = function() {
			var query = __createUpdateQuery.call(this);
			__replaceDBName.call(this, query);
			return query;
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

		var createShardBatchQuery = function(query) {

			var queries = _(shardDBNames).map(function(elem) {
				var res = _(query).clone();
				replaceQueryDBName(def, res, elem);
				return res;
			});

			var batchQuery = {
				text: '',
				values: [],
			};

			var i, j;
			for (i = 0; i < queries.length; i++) {
				query = queries[i];
				batchQuery.text += query.text + ';';
				for (j = 0; j < query.values.length; j++) {
					batchQuery.values.push(query.values[j]);
				};
			};

			return batchQuery;
		}

		DataMySqlShard.createStaticFindQuery = function(args) {
			var query = __createStaticFindQuery.call(this, args);
			return createShardBatchQuery(query);
		}

		DataMySqlShard.find = function(args, cb) {
			__staticFind.call(this, args, function(err, results) {
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

		DataMySqlShard.createStaticRemoveQuery = function(args) {
			var query = __createStaticRemoveQuery.call(this, args);
			return createShardBatchQuery(query);
		}


		DataMySqlShard.createStaticCountQuery = function(args) {
			var query = __createStaticCountQuery.call(this, args);
			return createShardBatchQuery(query);
		}

		DataMySqlShard.count = function(args, cb) {
			var query = this.createStaticCountQuery(args);
			var self = this;
			var q = this.conn.query(query.text, query.values, function(err, res) {
				if (!!err) {
					self.lib.logger.error('static count error:', err, q.sql);
					cb(err);
					return;
				}

				var count = 0;
				res.forEach(function(elem) {
					count += elem[0].count;
				});
				cb(null, count);
			});
			this.lib.logger.debugSql(q);
		}

		DataMySqlShard.createStaticFindAllQuery = function() {
			var query = __createStaticFindAllQuery.call(this);
			return createShardBatchQuery(query);
		}

		/**
		 * !!!CAUTION: IT WOULD RETURN ALL OBJECT PRIMARY VALUES!!!
		 * @param  {Function} cb [description]
		 * @return {[type]}      [description]
		 */
		DataMySqlShard.findAll = function(cb) {
			__staticFindAll.call(this, function(err, results) {
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

		DataMySqlShard.createStaticRemoveAllQuery = function() {
			var query = __createStaticRemoveAllQuery.call(this);
			return createShardBatchQuery(query);
		}

		DataMySqlShard.createStaticCountAllQuery = function() {
			var query = __createStaticCountAllQuery.call(this);
			return createShardBatchQuery(query);
		}

		DataMySqlShard.countAll = function(cb) {
			var query = this.createStaticCountAllQuery();
			var self = this;
			var q = this.conn.query(query.text, query.values, function(err, res) {
				if (!!err) {
					self.lib.logger.error('static countAll error:', err, q.sql);
					cb(err);
					return;
				}

				var count = 0;
				res.forEach(function(elem) {
					count += elem[0].count;
				});
				cb(null, count);
			});
			this.lib.logger.debugSql(q);
		}
	}

	return DataMySqlShard;
}

exp.__type__ = consts.DataType.MYSQL_SHARD;