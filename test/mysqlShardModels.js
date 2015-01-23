'use strict';
require('./mysqlShardInit');
// var assert = require('assert');
// var _s = require('underscore.string');
// var _ = require('underscore');
var CGModel = require('../lib');

var genUserId = function(cb) {
  var dbName = this.db.getMainDBName();
  var sql = 'CALL `' + dbName + '`.`gen_userId`(1);';
  this.db.query(sql, [], function(err, res) {
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
  name: 'UserShardSync',

  props: {
    userId:             { type: 'number', primary: true, defaultValue: genUserId, shard: true },
    name:               { type: 'string', unique: true, defaultValue: genName, },
    money:              { type: 'number', sync: true, defaultValue: 0, },
    registerTime:       { type: 'date',   defaultValue: genRegisterTime, },
  },

  db: {
    type: 'mysql_shard',
    db_name: 'cg_model_shard_test',
    tbl_name: 'user',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_shard_test',
    name: 'user',
    prefix: 'test',
  },
});

CGModel.createModel({
  name: 'UserShardAsync',

  props: {
    userId:             { type: 'number', primary: true, shard: true },
    name:               { type: 'string', defaultValue: genName, },
    money:              { type: 'number', defaultValue: 0, },
    registerTime:       { type: 'date',   defaultValue: genRegisterTime, },
  },

  db: {
    type: 'mysql_shard',
    db_name: 'cg_model_shard_test',
    tbl_name: 'user',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_shard_test',
    name: 'user',
    prefix: 'test',
  },
});

CGModel.createModel({
  name: 'UserNoShardSync',

  props: {
    userId:             { type: 'number', primary: true, defaultValue: genUserId },
    name:               { type: 'string', defaultValue: genName, },
    money:              { type: 'number', defaultValue: 0, },
    registerTime:       { type: 'date',   defaultValue: genRegisterTime, },
  },

  db: {
    type: 'mysql_shard',
    db_name: 'cg_model_shard_test',
    tbl_name: 'user',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_shard_test',
    name: 'user',
    prefix: 'test',
  },
});


CGModel.createModel({
  name: 'UserNoShardAsync',

  props: {
    userId:             { type: 'number', primary: true },
    name:               { type: 'string', defaultValue: genName, },
    money:              { type: 'number', defaultValue: 0, },
    registerTime:       { type: 'date',   defaultValue: genRegisterTime, },
  },

  db: {
    type: 'mysql_shard',
    db_name: 'cg_model_shard_test',
    tbl_name: 'user',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_shard_test',
    name: 'user',
    prefix: 'test',
  },
});

CGModel.createModel({
  name: 'UserNoShardSync2',

  props: {
    userId:             { type: 'number', primary: true, defaultValue: genUserId, shard: true },
    name:               { type: 'string', defaultValue: genName, },
    money:              { type: 'number', defaultValue: 0, },
    registerTime:       { type: 'date',   defaultValue: genRegisterTime, },
  },

  db: {
    type: 'mysql_shard',
    db_name: 'cg_model_shard_test',
    tbl_name: 'user',
    shard_count: 0,
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_shard_test',
    name: 'user',
    prefix: 'test',
  },
});


CGModel.createModel({
  name: 'UserNoShardAsync2',

  props: {
    userId:             { type: 'number', primary: true },
    name:               { type: 'string', defaultValue: genName, },
    money:              { type: 'number', defaultValue: 0, },
    registerTime:       { type: 'date',   defaultValue: genRegisterTime, },
  },

  db: {
    type: 'mysql_shard',
    db_name: 'cg_model_shard_test',
    tbl_name: 'user',
    shard_count: 0,
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_shard_test',
    name: 'user',
    prefix: 'test',
  },
});
