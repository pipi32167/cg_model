'use strict';
// var assert = require('assert');
// var _s = require('underscore.string');
// var _ = require('underscore');
var CGModel = require('../lib');

var genUserId = function(cb) {
  var sql = 'call gen_userId(1)';
  this.db.conn.query(sql, [], function(err, res) {
    if (!!err) {
      cb(err);
      return;
    }
    var userId = res[0][0].id;
    cb(null, userId);
  });
}

var genName = function(cb) {
  var res = 'test' + this.userId;
  cb(null, res);
}

var genRegisterTime = function(cb) {
  cb(null, new Date());
}

CGModel.createModel({
  name: 'UserTTL',

  props: {
    userId:             { type: 'number', primary: true, defaultValue: genUserId, autoIncr: true },
    name:               { type: 'string', unique: true, defaultValue: genName, },
    money:              { type: 'number', sync: true, defaultValue: 0, },
    registerTime:       { type: 'date',   defaultValue: genRegisterTime, },
  },

  db: {
    type: 'mysql',
    db_name: 'cg_model_test',
    tbl_name: 'user',
  },

  cache: {
    type: 'redis_ttl',
    cache_name: 'cg_model_test',
    name: 'user',
    prefix: 'test',
  },
});