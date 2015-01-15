'use strict';

var mysql = require('mysql');
var redis = require('redis');
var CGModel = require('../lib');

var dbName = 'cg_model_benchmark';
var mysqlConfig = require('./config/mysql')[dbName];
var pool = mysql.createPool(mysqlConfig);
CGModel.setDBClient(dbName, pool);

var redisConfig = require('./config/redis')[dbName];
var redisClient = redis.createClient(redisConfig.port, redisConfig.host);
CGModel.setCacheClient(dbName, redisClient);

CGModel.initialize(require(__dirname + '/config/cg_model'));

require('./models');