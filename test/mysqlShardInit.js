'use strict';
var mysql = require('mysql');
var redis = require('redis');
var CGModel = require('../lib');

// CGModel.debug_mode = true;
var dbName = 'cg_model_shard_test';
var mysqlConfig = require('./config/mysql_shard')[dbName];
var pool = mysql.createPool(mysqlConfig);
CGModel.setDBClient(dbName, pool);

var redisConfig = require('./config/redis')[dbName];
var redisClient = redis.createClient(redisConfig.port, redisConfig.host);
CGModel.setCacheClient(dbName, redisClient);

CGModel.initialize(require('./config/cg_model_shard'));