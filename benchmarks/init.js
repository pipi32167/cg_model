'use strict';
var _ = require('underscore');
var async = require('async');
var assert = require('assert');
var mysql = require('mysql');
var redis = require('redis');
var mongodb = require('mongodb');
var CGModel = require('../lib');

module.exports = function(cb) {
	var dbName = 'cg_model_benchmark';
	var mysqlConfig = require('./config/mysql')[dbName];
	var pool = mysql.createPool(mysqlConfig);
	CGModel.setDBClient(dbName, pool);

	var redisConfig = require('./config/redis')[dbName];
	var redisClient = redis.createClient(redisConfig.port, redisConfig.host);
	CGModel.setCacheClient(dbName, redisClient);

	var mongodbConfig = require('./config/mongodb');
	async.each(
		_(mongodbConfig).pairs(),
		function(elem, cb) {
			var key, config;
			key = elem[0];
			config = elem[1];
			mongodb.MongoClient.connect(config.url, function(err, db) {
				assert.ok(!err, err);
				CGModel.setDBClient(key, db);
				cb();
			});
		},
		function(err) {
			assert.ok(!err, err);
			CGModel.initialize(require('./config/cg_model'));
			require('./models');
			cb();
		});
}