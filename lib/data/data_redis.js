'use strict';
var async = require('async');
var _s = require('underscore.string');
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var Data = require('./data');
var consts = require('../consts');
var utils = require('../utils');

module.exports = function(lib, def, connType) {

  var DataRedis = function(lib, model) {
    Data.call(this, lib, model);
    this.isSaved = false;
    this.conn = DataRedis.conn;
    assert.ok(!!this.conn, 'connection should not be empty');
  }
  _.extend(DataRedis.prototype, Data.prototype);
  _.extend(DataRedis, Data);

  DataRedis.prototype.genHashKey = function() {

    var primaryKeys = this.model.getPrimaryKeys();
    var self = this;
    var values = _(primaryKeys).map(function(elem) {
      var value = self.model.mem.p(elem);
      if (value === undefined) {
        assert.ok(false, 'generate hash key need all primary key exists:' + elem);
      }
      return self.convertUpdateValue(elem, self.model.def.props[elem].type, value);
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
    this.__update(cb);
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
    var hashKey = this.genHashKey(this);
    // console.log('load', hashKey);
    var self = this;
    lib.logger.debugRedis('hgetall', hashKey);
    this.conn.hgetall(hashKey, function(err, res) {
      if (!err && !!res) {
        for (var prop in props) {
          if (props.hasOwnProperty(prop) && res.hasOwnProperty(prop)) {
            res[prop] = convertLoadValue(props[prop].type, res[prop]);
          }
        }
        self.init(res);
      }
      cb(err, res);
    });
  }

  DataRedis.prototype.getUnsavedProps = function() {
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

  var assertConvertUpdateValue = function(prop, type, value) {

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
  DataRedis.prototype.convertUpdateValue = function(prop, type, value) {
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
          assertConvertUpdateValue(prop, type, value);
        }
        return String(value);
      case 'bool':
        if (!_.isBoolean(value)) {
          assertConvertUpdateValue(prop, type, value);
        }
        return String(value);
      case 'string':
        if (!_.isString(value)) {
          assertConvertUpdateValue(prop, type, value);
        }
        return value;
      default:
        assert.ok(false, 'unsupported type:' + type);
    }
  }

  DataRedis.prototype.__update = function(cb) {
    var self = this;

    var hashKey = this.genHashKey(this);
    // console.log('update', hashKey);
    var mem = this.model.mem;
    var props = this.model.def.props;
    var updateArgs = _(props)
      .chain()
      .keys()
      .map(function(elem) {
        var res = self.convertUpdateValue(elem, props[elem].type, mem.p(elem));
        return [elem, res];
      })
      .flatten()
      .value();
    var args = [hashKey].concat(updateArgs);
    lib.logger.debugRedis('hmset', args);
    args = args.concat([cb]);
    this.conn.hmset.apply(this.conn, args);
  }

  DataRedis.prototype.update = function(cb) {

    var self = this;
    if (!this.isModified()) {
      cb();
      return;
    }

    var callback = function(err) {
      if (!err) {
        self.updateVersion();
      }
      cb(err);
    };

    this.__update(callback);
  }

  DataRedis.prototype.remove = function(cb) {
    var hashKey = this.genHashKey(this);
    // console.log('remove', hashKey);
    var self = this;
    lib.logger.debugRedis('del', hashKey);
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
    assert.ok(false, 'should not be implemented');
  }

  DataRedis.remove = function(args, cb) {

    var Model = lib.getModel(def.name);

    async.map(
      args,
      function(elem, cb) {
        var obj = new Model();
        obj.p(elem);
        obj.cache.remove(cb);
      },
      cb);
  }

  var BATCH_DELETE_COUNT = 1000;

  /**
   * !!!JUST FOR TEST PURPOSE, DON'T USE IT!!!
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataRedis.removeAll = function(cb) {

    var primaryKeys = utils.getPrimaryKeys(def);
    var self = this;
    var cache = def.cache;
    var key = [cache.prefix, cache.name]
      .concat(_(primaryKeys.length).times(function() {
        return '*';
      }))
      .join(':');

    var keys;
    async.series({
      getKeys: function(cb) {
        lib.logger.debugRedis('keys', key);
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

        async.whilst(
          function() {
            return keys.length > 0;
          },

          function(cb) {
            var deleteCount = BATCH_DELETE_COUNT < keys.length ? BATCH_DELETE_COUNT : keys.length;
            var deleteKeys = keys.slice(0, deleteCount);
            keys = keys.slice(deleteCount);
            var args = deleteKeys.concat([cb]);
            lib.logger.debugRedis('del', deleteKeys);
            self.conn.del.apply(self.conn, args);
          },

          cb);
      }
    }, cb);
  }

  DataRedis.init = function() {

    Object.defineProperty(this, 'conn', {
      get: function() {
        var conns = lib.get('conns')[connType];
        var cache_name = def[connType].cache_name;
        return conns[cache_name];
      }
    });
  }

  DataRedis.init();

  return DataRedis;
}

module.exports.__type__ = consts.DataType.REDIS;