/**
 * 测试插入批量数据
 */

'use strict';
var async = require('async');
var assert = require('assert');
var mysql = require('mysql');
var redis = require('redis');
var CGModel = require('../lib');

var dbName = 'cg_model_test';
var mysqlConfig = require('./config/mysql')[dbName];
var pool = mysql.createPool(mysqlConfig);
CGModel.setDBClient(dbName, pool);

var redisConfig = require('./config/redis')[dbName];
var redisClient = redis.createClient(redisConfig.port, redisConfig.host);
CGModel.setCacheClient(dbName, redisClient);

CGModel.initialize({
  mysql_late: {
    cron: '*/2 * * * * *',
    batchCount: 1000
  },
  debug_mode: {
    // sql: true
  },
});


var genUserId = function(cb) {
  var sql = 'call gen_userId(1)';
  this.db.conn.query(sql, [], function(err, res) {
    if (!!err) {
      cb(err);
      return;
    }
    cb(null, res[0][0].id);
  });
}

var genName = function(cb) {
  cb(null, 'test' + this.p('userId'));
}

var genRegisterTime = function(cb) {
  cb(null, new Date());
}

CGModel.createModel({
  name: 'User',

  props: {
    userId: {
      type: 'number',
      primary: true,
      defaultValue: genUserId,
    },
    name: {
      type: 'string',
      defaultValue: genName,
    },
    money: {
      type: 'number',
      defaultValue: 0,
    },
    registerTime: {
      type: 'date',
      defaultValue: genRegisterTime,
    },
  },

  db: {
    type: 'mysql_late',
    db_name: 'cg_model_test',
    tbl_name: 'user',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
    name: 'user',
    prefix: 'test',
  },
});

CGModel.start();
var User = CGModel.getModel('User');

async.series({

  // before: function(cb) {
  //   User.removeAll(function(err) {
  //     assert.ok(!err, err);
  //     cb();
  //   });
  // },

  create: function(cb) {

    async.timesSeries(
      25000,
      function(idx, cb) {
        var user = new User();
        user.create(function(err) {
          assert.ok(!err, err);
          user.money++;
          user.update(function(err) {
            assert.ok(!err, err);
            cb();
          })
        });
      },
      function(err) {
        assert.ok(!err, err);
        cb();
      });
  }
}, function(err) {
  assert.ok(!err, err);
  console.log('create end');
})