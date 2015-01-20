'use strict';
require('./shardInit');
var _s = require('underscore.string');
var CGModel = require('../lib');

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

var genDBNameByUserId = function (dbName) {
  return function () {
    var config = CGModel.get('config').mysql_shard;
    var shardCount = this.model.def.db.shard_count || config.shard_count;
    var shardDBName = _s.sprintf('%s_shard_%d', config.database[dbName] || dbName, shardCount);
    return shardDBName;
  }
}

CGModel.createModel({
  name: 'User',

  props: {
    userId:             { type: 'number', primary: true, defaultValue: genUserId, },
    name:               { type: 'string', unique: true, defaultValue: genName, },
    money:              { type: 'number', sync: true, defaultValue: 0, },
    registerTime:       { type: 'date', defaultValue: genRegisterTime, },
  },

  db: {
    type: 'mysql_shard',
    db_name: genDBNameByUserId('cg_model_shard_test'),
    tbl_name: 'user',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
    name: 'user',
    prefix: 'test',
  },
});