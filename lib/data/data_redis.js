'use strict';
var async = require('async');
var _s = require('underscore.string');
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var Data = require('./data');
var consts = require('../consts');

module.exports = function(Model, conn) {

  var DataRedis = function(model, conn) {
    Data.call(this, model, conn);
    this.isSaved = false;
  }

  DataRedis.Model = Model;
  DataRedis.conn = conn;

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

  /**
   * Convert the value loaded from the redis.
   * @param  {String}   type  type of the loaded property
   * @param  {String}   value value of the loaded property
   * @return {AnyValue}       prepare result of the loaded property
   */
  var convertLoadValue = function(type, value) {
    switch (type) {
      case 'date':
        return new Date(Number(value));
      case 'array':
      case 'object':
        return JSON.parse(value);
      case 'number':
        return Number(value);
      case 'bool':
        assert.ok(value === 'true' || value === 'false');
        return value === 'true';
      case 'string':
        return value;
      default:
        assert.ok(false, 'unsupported type:' + type);
    }
  }

  DataRedis.prototype.load = function(cb) {
    var props = this.model.def.props;
    var hashKey = __genHashKey.call(this);
    this.conn.hgetall(hashKey, function(err, res) {
      if (!err && !!res) {
        for (var prop in props) {
          if (props.hasOwnProperty(prop) && res.hasOwnProperty(prop)) {
            res[prop] = convertLoadValue(props[prop].type, res[prop]);
          }
        }
      }
      cb(err, res);
    });
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

  var assertConviertUpdateValue = function(prop, type, value) {

    var err = _s.sprintf('property[%s] expect type[%s], but got type[%s]:%s',
      prop, type, typeof value, value);
    assert.ok(false, err);
  }

  /**
   * Convert the value to be updated to the redis.
   * @param  {String}   type  type of the update property
   * @param  {AnyValue} value value of the update property
   * @return {String}         prepare result of the update property
   */
  var convertUpdateValue = function(prop, type, value) {
    switch (type) {
      case 'date':
        assert.ok(_.isDate(value), value);
        return value.getTime().toString();
      case 'array':
        assert.ok(_.isArray(value), value);
        return JSON.stringify(value);
      case 'object':
        assert.ok(_.isObject(value), value);
        return JSON.stringify(value);
      case 'number':
        if (!_.isNumber(value)) {
          assertConviertUpdateValue(prop, type, value);
        }
        return String(value);
      case 'bool':
        if (!_.isBoolean(value)) {
          assertConviertUpdateValue(prop, type, value);
        }
        return String(value);
      case 'string':
        if (!_.isString(value)) {
          assertConviertUpdateValue(prop, type, value);
        }
        return value;
      default:
        assert.ok(false, 'unsupported type:' + type);
    }
  }

  DataRedis.prototype.update = function(cb) {
    var unsavedProps = __getUnsavedProps.call(this);
    if (unsavedProps.length === 0) {
      cb();
      return;
    }
    var hashKey = __genHashKey.call(this);
    var mem = this.model.mem;
    var props = this.model.def.props;
    var updateArgs = _(unsavedProps)
      .chain()
      .map(function(elem) {
        var res = convertUpdateValue(elem, props[elem].type, mem.p(elem));
        return [elem, res];
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

    var primaryKeys = this.Model.getPrimaryKeys();
    var self = this;
    var cache = this.Model.def.cache;
    var key = [cache.prefix, cache.name]
      .concat(_(primaryKeys.length).times(function() {
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

  return DataRedis;
}

module.exports.__type__ = consts.DataType.REDIS;