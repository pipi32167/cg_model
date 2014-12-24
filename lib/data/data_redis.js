'use strict';
var async = require('async');
var _s = require('underscore.string');
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var Data = require('./data');
var consts = require('../consts');
var utils = require('../utils');

module.exports = function(app, Model, connType) {

  var DataRedis = function(app, model) {
    Data.call(this, app, model);
    this.isSaved = false;
    this.conn = DataRedis.conn;
  }

  DataRedis.Model = Model;
  Object.defineProperty(DataRedis, 'conn', {
    get: function() {
      var conns = app.get('conns')[connType];
      var cache_name = Model.def[connType].cache_name;
      return conns[cache_name];
    }
  });

  util.inherits(DataRedis, Data);

  var __genHashKey = function() {

    var primaryKeys = this.model.getPrimaryKeys();
    var self = this;
    var values = _(primaryKeys).map(function(elem) {
      var value = self.model.mem.p(elem);
      if (value === undefined) {
        assert.ok(false, 'generate hash key need all primary key exists:' + elem);
      }
      return convertUpdateValue(elem, self.model.def.props[elem].type, value);
    });
    // console.log(primaryKeys);
    // console.log(values);
    var cache = this.model.def.cache;
    return [cache.prefix, cache.name].concat(values).join(':');
  }

  /**
   * Instance
   */

  DataRedis.prototype.create = function(cb) {
    var self = this;
    this.update(function(err) {
      if (!err) {
        self.isSaved = true;
        self.p(self.model.p());
      }
      cb(err);
    });
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
    // console.log('load', hashKey);
    var self = this;
    this.conn.hgetall(hashKey, function(err, res) {
      if (!err && !!res) {
        for (var prop in props) {
          if (props.hasOwnProperty(prop) && res.hasOwnProperty(prop)) {
            res[prop] = convertLoadValue(props[prop].type, res[prop]);
          }
        }
        self.p(res);
        self.isSaved = true;
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
      if (props.hasOwnProperty(prop) && !_.isEqual(this.p(prop), mem.p(prop))) {
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
        return (value.getTime() - value.getMilliseconds()).toString();
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
    // console.log('update', hashKey);
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
    // console.log('remove', hashKey);
    var self = this;
    this.conn.del(hashKey, function(err) {
      if (!err) {
        self.isSaved = false;
      }
      cb(null, err);
    });
  }


  /**
   * Static
   */

  DataRedis.find = function(args, cb) {
    assert.ok(false, 'should be implemented');
  }

  DataRedis.remove = function(args, cb) {

    async.map(
      args,
      function(elem, cb) {
        var obj = new Model();
        obj.p(elem);
        obj.cache.remove(cb);
      },
      cb);
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