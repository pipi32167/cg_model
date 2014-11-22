'use strict';
var async = require('async');
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var Data = require('./data');
var consts = require('../consts');

var DataRedis = function(model, conn) {
  Data.call(this, model, conn);
  this.isSaved = false;
}

DataRedis.__type__ = consts.DataType.REDIS;

util.inherits(DataRedis, Data);

var __genHashKey = function() {

  var primaryKeys = this.model.getPrimaryKeys();
  var self = this;
  var values = _(primaryKeys).map(function(elem) {
    return self.model.mem.p(elem);
  });
  var cache = this.model.def.cache;
  return [cache.prefix, cache.name].concat(values).join(':');
}

/**
 * Instance
 */

DataRedis.prototype.create = function(cb) {
  this.update(cb);
}

DataRedis.prototype.load = function(cb) {
  var hashKey = __genHashKey.call(this);
  this.conn.hgetall(hashKey, cb);
}

var __getUnsavedProps = function() {
  var res = [];
  var props = this.model.def.props;
  var mem = this.model.mem;
  var prop;
  for (prop in props) {
    if (props.hasOwnProperty(prop) && this.p(prop) !== mem.p(prop)) {
      res.push(prop);
    }
  }
  return res;
}

DataRedis.prototype.update = function(cb) {
  var unsavedProps = __getUnsavedProps.call(this);
  if (unsavedProps.length === 0) {
    cb();
    return;
  }
  var hashKey = __genHashKey.call(this);
  var mem = this.model.mem;
  var updateArgs = _(unsavedProps)
    .chain()
    .map(function(elem) {
      return [elem, mem.p(elem)];
    })
    .flatten()
    .value();
  var args = [hashKey].concat(updateArgs).concat([cb]);
  this.conn.hmset.apply(this.conn, args);
}

DataRedis.prototype.remove = function(cb) {
  var hashKey = __genHashKey.call(this);
  this.conn.del(hashKey, cb);
}


/**
 * Static
 */

DataRedis.find = function(args, cb) {
  assert.ok(false, 'should be implemented');
}

DataRedis.remove = function(args, cb) {
  assert.ok(false, 'should be implemented');
}

/**
 * !!!JUST FOR TEST PURPOSE, DON'T USE IT!!!
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
DataRedis.removeAll = function(cb) {

  var primaryKeys = this.model.getPrimaryKeys();
  var self = this;
  var cache = this.model.def.cache;
  var key = [cache.prefix, cache.name]
    .concat(_(primaryKeys.length).times(function () {
      return '*';
    }))
    .join(':');

  var keys;
  async.series({
    getKeys: function(cb) {
      self.conn.keys(key, function(err, res) {
        if (!err) {
          keys = res;
        }
        cb(err);
      })
    },

    removeAll: function(cb) {
      if (keys.length === 0) {
        cb();
        return;
      }
      var args = keys.concat([cb]);
      self.conn.del.apply(self.conn, args);
    }
  }, cb);
}


module.exports = DataRedis;