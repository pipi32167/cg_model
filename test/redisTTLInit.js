'use strict';
var mysql = require('mysql');
var redis = require('redis');
var CGModel = require('../lib');

// CGModel.debug_mode = true;
var key, config, client;

var mysqlConfig = require('./config/mysql');
for (key in mysqlConfig) {
	config = mysqlConfig[key];
	client = mysql.createPool(config);
	CGModel.setDBClient(key, client);
}

var redisConfig = require('./config/redis');
for (key in redisConfig) {
	config = redisConfig[key];
	client = redis.createClient(config.port, config.host);
	CGModel.setCacheClient(key, client);
}

CGModel.initialize(require('./config/cg_model_redis_ttl'));