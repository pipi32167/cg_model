'use strict';
var assert = require('assert');
var mysql = require('mysql');
var redis = require('redis');
var CGModel = require('../lib');

var dbName = 'model_test';
var mysqlConfig = require('./config/mysql')[dbName];
var pool = mysql.createPool(mysqlConfig);
CGModel.setDBClient(dbName, pool);

var redisConfig = require('./config/redis')[dbName];
var redisClient = redis.createClient(redisConfig.port, redisConfig.host);
CGModel.setCacheClient(dbName, redisClient);

CGModel.initialize({
  mysql_late: {
    cron: '* */10 * * * *',
    batchCount: 10
  },
  // debug_mode: true,
});

CGModel.createModel({

  name: 'Item',

  props: {
    id:               { type: 'number', primary: true, defaultValue: 100 },
    itemId:           { type: 'number', defaultValue: 100, },
    isLock:           { type: 'bool', defaultValue: false },
    desc:             { type: 'string', defaultValue: '' },
    updateTime:       { type: 'date', defaultValue: new Date('2014-1-1'), },
    properties1:      { type: 'object', defaultValue: {}, },
    properties2:      { type: 'array', defaultValue: [], },
  },

  db: {
    type: 'mysql_late',
    db_name: 'model_test',
    tbl_name: 'item',
  },

  cache: {
    type: 'redis',
    cache_name: 'model_test',
    name: 'item',
    prefix: 'test',
  },
});

var Item = CGModel.getModel('Item');

var item = new Item();
item.create(function (err) {
  assert.ok(!err, err);
});

// CGModel.debug_mode = true;
CGModel.start();

setTimeout(function() {

  CGModel.stop(function(err) {
    assert.ok(!err, err);
    console.log('end');
  });
}, 5000);