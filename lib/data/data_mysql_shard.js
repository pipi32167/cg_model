'use strict';
var async = require('async');
var sqlFormat = require('mysql').format;
var CronJob = require('cron').CronJob;
var _ = require('underscore');
var assert = require('assert');
var consts = require('../consts');
var DataMySqlLate = require('./data_mysql_late');
var model = require('../index');
var utils = require('../utils');

var exp = module.exports = function(lib, Model, connType) {
	var DataMySqlShard = DataMySqlLate.call(this, lib, Model, connType);

	DataMySqlShard.prototype.queryBuilder = DataMySqlShard.queryBuilder;

	var __createCreateQuery = DataMySqlShard.prototype.createCreateQuery;
	DataMySqlShard.prototype.createCreateQuery = function() {
		var dbName = this.model.def.db.db_name;
		if (typeof dbName === 'function') {
			dbName = dbName();
		}
	}

	DataMySqlShard.prototype.createUpdateQuery = function() {

	}

	DataMySqlShard.prototype.createLoadQuery = function() {

	}

	DataMySqlShard.prototype.createRemoteQuery = function() {

	}

	return DataMySqlShard;
}

exp.__type__ = consts.DataType.MYSQL_SHARD;