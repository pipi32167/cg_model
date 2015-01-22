'use strict';
require('./mysqlShardInit');
var assert = require('assert');
var _s = require('underscore.string');
var _ = require('underscore');
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

var genDBNameByUserId = function() {
  var userId = this.userId;
  var dbNames = this.model.def.db.db_names();
  var idx = userId % dbNames.length;
  return dbNames[idx];
}

var genDBNames = function(dbName) {
  return function() {
    var config = CGModel.get('config').mysql_shard;
    var shardCount = config.shard_count;
    dbName = config.database[dbName] || dbName;
    return _(0)
      .chain()
      .range(shardCount)
      .map(function(idx) {
        return _s.sprintf('%s_shard_%d', dbName, idx);
      })
      .value();
  }
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