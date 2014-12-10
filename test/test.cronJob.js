'use strict';
var assert = require('assert');
var mysql = require('mysql');
var redis = require('redis');
var CGModel = require('../lib');

// CGModel.debug_mode = true;
var dbName = 'model_test';
var mysqlConfig = require('./config/mysql')[dbName];
var pool = mysql.createPool(mysqlConfig);
CGModel.setDBClient(dbName, pool);

var redisConfig = require('./config/redis')[dbName];
var redisClient = redis.createClient(redisConfig.port, redisConfig.host);
CGModel.setCacheClient(dbName, redisClient);

CGModel.initialize({
  'mysql_late': {
    'cron': '*/10 * * * * *',
    'batchCount': 10
  }
});

CGModel.debug_mode = true;
CGModel.start();

setTimeout(function() {

  CGModel.stop(function(err) {
    assert.ok(!err, err);
    console.log('end');
  });
}, 1000);