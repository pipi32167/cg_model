'use strict';
var async = require('async');
var _s = require('underscore.string');
var _ = require('underscore');
var assert = require('assert');
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
    var cache = this.model.def.cache;
    var props = this.model.def.props;
    var prop, value;
    var values = [];
    for (prop in props) {
      if (props[prop].primary) {
        value = this.model.p(prop);
        if (value === undefined) {
          var err = _s.sprintf('model[%s] generate hash key need all primary key exists: %s\ndetail: %s', this.model.def.name, prop, JSON.stringify(this.model.toModelJSON()));
          assert.ok(false, err);
        }
        values.push(this.convertUpdateValue(prop, props[prop].type, value));
      }
    }
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
    lib.logger.debugRedis('hgetall', hashKey);
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

  /**
   * Convert the value to be updated to the redis.
   * @param  {String}   type  type of the update property
   * @param  {AnyValue} value value of the update property
   * @return {String}         prepare result of the update property
   */
  DataRedis.prototype.convertUpdateValue = function(prop, type, value) {
    return utils.convertUpdateValue(this.model, prop, type, value);
  }

  DataRedis.prototype.__update = function(cb) {
    var self = this;

    var hashKey = this.genHashKey(this);
    // console.log('update', hashKey);
    var model = this.model;
    var props = this.model.def.props;
    var updateArgs = [];
    for (var prop in props) {
      updateArgs.push(prop);
      updateArgs.push(self.convertUpdateValue(prop, props[prop].type, model.p(prop)));
    }
    var args = [hashKey].concat(updateArgs);
    lib.logger.debugRedis('hmset', args);
    args = args.concat([cb]);
    this.conn.hmset.apply(this.conn, args);
  }

  DataRedis.prototype.update = function(cb) {

    if (!this.model || this.model.isRemoved) {
      cb();
      return;
    }

    var self = this;
    if (!this.isModified()) {
      cb();
      return;
    }

    var toBeUpdateVersion = this.model.mem.__version;

    var callback = function(err) {
      if (!err) {
        self.updateVersion(toBeUpdateVersion);
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

  return require('bluebird').promisifyAll(DataRedis);
}

module.exports.__type__ = consts.DataType.REDIS;