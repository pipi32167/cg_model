'use strict';
var sql = require('sql');
var sqlFormat = require('mysql').format;
var async = require('async');
var _s = require('underscore.string');
var _ = require('underscore');
var assert = require('assert');
var Data = require('./data');
var consts = require('../consts');
var utils = require('../utils');
// var lib = require('../index');

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
      assert.ok(value === 1 || value === 0, value);
      return !!value;
    case 'string':
      return value;
    default:
      assert.ok(false, 'unsupported type:' + type);
  }
}

/**
 * Convert the value to be updated to the redis.
 * @param  {String}   modelName  model name
 * @param  {String}   type  type of the update property
 * @param  {AnyValue} value value of the update property
 * @return {String}         prepare result of the update property
 */
var convertUpdateValue = function(modelName, prop, type, value) {
  utils.checkPropValueType(modelName, prop, type, value);
  switch (type) {
    case 'array':
    case 'object':
      return JSON.stringify(value);
    case 'number':
    case 'bool':
    case 'string':
      return value;
    case 'date':
      return new Date(value.getTime() - value.getMilliseconds());
  }
}

var checkFindArgsOperator = function(operator) {
  switch (operator) {
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
    case 'equals':
    case 'equal':
    case 'notEquals':
    case 'notEqual':
    case 'in':
    case 'notIn':
    case 'like':
      return;
  }
  assert.ok(false, 'unsupported operator: ' + operator);
}

var isSqlKey = function(key) {
  switch (key) {
    case '$update':
    case '$select':
    case '$where':
    case '$oreder':
    case '$limit':
    case '$offset':
      return true
  }
  return false;
}

var createWhereArgs = function(def, queryBuilder, args) {
  var res = [];
  var key, value, type;
  var props = def.props;
  args = args.$where || args;
  for (key in args) {
    if (args.hasOwnProperty(key) && props.hasOwnProperty(key)) {
      value = args[key];
      type = utils.typeOf(value);
      switch (type) {
        case 'array':
          res.push(queryBuilder.get(key).in(value));
          break;
        case 'object':
          var findProp;
          for (findProp in value) {
            if (value.hasOwnProperty(findProp)) {
              checkFindArgsOperator(findProp);
              res.push(queryBuilder.get(key)[findProp](value[findProp]));
            }
          }
          break;
        default:
          res.push(queryBuilder.get(key).equals(value));
          break;
      }
    }
  }
  return res;
}

var createUpdateArgs = function(def, queryBuilder, args) {
  var res = {};
  var props = def.props;
  var updateArgs = args.$update || args;
  var prop;
  for (prop in updateArgs) {
    if (updateArgs.hasOwnProperty(prop)) {
      if (!isSqlKey(prop)) {
        if (!props[prop]) {
          var err = _s.sprintf('model[%s] doesn\'s contains property[%s]', def.name, prop);
          assert.ok(false, err);
        }
        res[prop] = convertUpdateValue(def.name, prop, props[prop].type, updateArgs[prop]);
      }
    }
  }
  return res;
}

var createSelectArgs = function(def, queryBuilder, args) {
  var keys = args.$select || utils.getDefaultSelectArgs(def);
  keys = keys.indexOf('*') >= 0 ? _(def.props).keys() : keys;
  return _(keys).map(function(elem) {
    return queryBuilder.get(elem);
  });
}

var createOrderArgs = function(def, queryBuilder, args) {
  if (!args.$order) {
    return [];
  }

  var res = [];
  var prop, value;
  var props = def.props;
  var orderArgs = args.$order;
  for (prop in orderArgs) {
    if (orderArgs.hasOwnProperty(prop) && props.hasOwnProperty(prop)) {
      value = orderArgs[prop];
      assert.ok(value === 'asc' || value === 'desc', value);
      res.push(queryBuilder.get(prop)[value]);
    }
  }
  return res;
}

module.exports = function(lib, def, connType) {
  var queryBuilder = sql.define({
    name: def[connType].tbl_name,
    columns: _(def.props).keys(),
  });

  var DataMySql = function(lib, model) {
    Data.call(this, lib, model);
    this.isSaved = false;
    this.__dbName = null;
    this.__conn = null;
  }

  // util.inherits(DataMySql, Data);
  _.extend(DataMySql.prototype, Data.prototype);
  _.extend(DataMySql, Data);

  DataMySql.queryBuilder = queryBuilder;
  DataMySql.conn = utils.getConnection(lib, def, connType);

  Object.defineProperty(DataMySql.prototype, 'conn', {
    get: function() {
      return this.getDBConn();
    }
  });

  Object.defineProperty(DataMySql.prototype, 'dbName', {
    get: function() {
      return this.getDBName();
    }
  });


  /**
   * Instance methods
   */

  /**
   * Private methods
   */

  DataMySql.prototype.getDBName = function() {
    if (!this.__dbName) {
      this.__dbName = def[connType].db_name;
    }
    return this.__dbName;
  }

  DataMySql.prototype.getDBConn = function() {
    if (!this.__conn) {
      this.__conn = utils.getConnection(lib, def, connType);
    }
    return this.__conn;
  }


  var __propKeys = function() {
    return _(this.model.def.props).keys();
  }

  DataMySql.prototype.getUpdateArgs = function() {
    var propKeys = __propKeys.call(this);
    var self = this;
    var res = {};
    var memValue, dbValue;
    var props = this.model.def.props;
    propKeys.forEach(function(elem) {
      memValue = self.model.mem.p(elem);
      dbValue = self.p(elem);
      if (!_.isEqual(memValue, dbValue) && !props[elem].primary) {
        res[elem] = convertUpdateValue(def.name, elem, props[elem].type, memValue);
      }
    });
    return res;
  }

  DataMySql.prototype.getCreateArgs = function() {
    var args = this.model.getAllPropKeysAndValues();
    var prop, props = this.model.def.props;
    for (prop in args) {
      if (args.hasOwnProperty(prop) &&
        (!props[prop].primary || !props[prop].autoIncr)) {

        try {
          args[prop] = convertUpdateValue(def.name, prop, props[prop].type, args[prop]);
        } catch (e) {
          lib.logger.error(this.model.props, args);
          throw e;
        }
      }
    }
    return args;
  }

  DataMySql.prototype.createCreateQuery = function() {

    var args = this.getCreateArgs();
    var res = queryBuilder.insert(args).toQuery('mysql');
    res.text = res.text.replace('INSERT', 'REPLACE');
    return res;
  }

  DataMySql.prototype.afterCreateSuccess = function(res, toBeUpdateVersion) {

    var primaryKey = this.model.getPrimaryKeys()[0];
    if (!!primaryKey && !!this.model.def.props[primaryKey].autoIncr) {
      this.model.p(primaryKey, res.insertId);
    }
    this.isSaved = true;
    this.updateVersion(toBeUpdateVersion);
  }

  /**
   * Public methods
   */
  DataMySql.prototype.createSync = DataMySql.prototype.create = function(cb) {

    var query = this.createCreateQuery();

    var self = this;
    var toBeUpdateVersion = this.model.mem.__version;
    var q = this.conn.query(query.text, query.values, function(err, res) {
      if (!!err) {
        lib.logger.error('create error:', err, q.sql);
      } else {
        self.afterCreateSuccess(res, toBeUpdateVersion);
      }
      cb(err);
    });
    lib.logger.debugSql(q);
  }

  DataMySql.prototype.createLoadQuery = function() {

    var whereArgs = this.model.getPrimaryKeysAndValues();
    var query = queryBuilder.select().where(whereArgs).toQuery('mysql');
    return query;
  }

  DataMySql.prototype.convertLoadValue = function(res) {

    var props = this.model.def.props;
    for (var prop in res) {
      if (res.hasOwnProperty(prop) && props.hasOwnProperty(prop)) {
        res[prop] = convertLoadValue(props[prop].type, res[prop]);
      }
    }
  }

  /**
   * Load from the MySql.
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataMySql.prototype.load = function(cb) {
    var self = this;
    var query = this.createLoadQuery();
    var q = this.conn.query(query.text, query.values, function(err, res) {
      if (!!err) {
        lib.logger.error('load error:', err, q.sql);
      } else {
        res = res && res[0];
        if (!!res) {
          self.convertLoadValue(res);
        }
      }
      cb(err, res);
    });
    lib.logger.debugSql(q);
  }

  DataMySql.prototype.createUpdateQuery = function() {
    return this.createCreateQuery();
  }

  DataMySql.prototype.afterUpdateSuccess = function(toBeUpdateVersion) {
    if (!this.model || this.model.isRemoved) {
      return;
    }

    this.updateVersion(toBeUpdateVersion);
  }

  /**
   * Update into the MySql.
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataMySql.prototype.updateSync = DataMySql.prototype.update = function(cb) {

    if (!this.model || this.model.isRemoved) {
      cb();
      return;
    }

    if (!this.isSaved) {
      this.create(cb);
      return;
    }

    if (!this.isModified()) {
      cb();
      return;
    }

    var query = this.createUpdateQuery();

    if (!query) {
      cb();
      return;
    }

    var self = this;
    var toBeUpdateVersion = this.model.mem.__version;
    var q = this.conn.query(query.text, query.values, function(err) {
      if (!!err) {
        lib.logger.error('update error:', err, q.sql);
      } else {
        self.afterUpdateSuccess(toBeUpdateVersion);
      }
      cb(err);
    });
    lib.logger.debugSql(q);
  }

  DataMySql.prototype.createRemoveQuery = function() {
    var args = this.model.getPrimaryKeysAndValues();
    return queryBuilder.delete().where(args).toQuery('mysql');
  }

  DataMySql.prototype.remove = function(cb) {
    var query = this.createRemoveQuery();
    var self = this;
    var q = this.conn.query(query.text, query.values, function(err) {
      if (!!err) {
        lib.logger.error('remove error:', err, q.sql);
      } else {
        self.isSaved = false;
      }
      cb(err);
    });
    lib.logger.debugSql(q);
  }

  /**
   * Static methods
   */

  DataMySql.createStaticFindQuery = function(args) {

    var whereArgs = createWhereArgs(def, queryBuilder, args);
    var selectArgs = createSelectArgs(def, queryBuilder, args);
    var orderArgs = createOrderArgs(def, queryBuilder, args);

    var query = queryBuilder.select(selectArgs);
    if (whereArgs.length > 0) {
      query = query.where.apply(query, whereArgs);
    }
    if (orderArgs.length > 0) {
      query = query.order.apply(query, orderArgs);
    }
    if (args.$limit !== undefined) {
      query = query.limit(args.$limit);
    }
    if (args.$offset !== undefined) {
      query = query.offset(args.$offset);
    }

    return query.toQuery('mysql');
  }

  /**
   * Find by primary keys, unique keys and indexes, return primary key values
   * @param  {Object}   args
   * @param  {Function} cb
   * @return {Void}
   */
  DataMySql.find = function(args, cb) {

    var query = this.createStaticFindQuery(args);
    var q = this.conn.query(query.text, query.values, function(err, res) {
      if (!!err) {
        lib.logger.error('static find error:', err, q.sql);
      }
      cb(err, res);
    });
    lib.logger.debugSql(q);
  }

  DataMySql.createStaticRemoveQuery = function(args) {

    var whereArgs = createWhereArgs(def, queryBuilder, args);
    var query = queryBuilder.delete();
    if (whereArgs.length > 0) {
      query = query.where.apply(query, whereArgs);
    }
    if (args.$limit !== undefined) {
      query = query.limit(args.$limit);
    }

    return query.toQuery('mysql');
  }


  DataMySql.doRemove = function(args, cb) {

    var query = this.createStaticRemoveQuery(args);

    var q = this.conn.query(query.text, query.values, function(err) {
      if (!!err) {
        lib.logger.error('static remove error:', err, q.sql);
      }
      cb(err);
    });
    lib.logger.debugSql(q);
  }

  DataMySql.remove = function(args, cb) {
    var removedPrimaryKeyValues;
    var self = this;
    async.series({

      findRemovedPrimaryKeyValues: function(cb) {
        self.find(args, function(err, res) {
          if (!err) {
            removedPrimaryKeyValues = res;
          }
          cb(err);
        })
      },

      remove: function(cb) {
        self.doRemove(args, cb);
      }
    }, function(err) {
      cb(err, removedPrimaryKeyValues);
    })
  }

  DataMySql.createStaticCountQuery = function(args) {

    var key = _(def.props).keys()[0];
    var selectArgs = [queryBuilder.get(key).count().as('count')];
    var whereArgs = createWhereArgs(def, queryBuilder, args);

    var query = queryBuilder.select(selectArgs);
    if (whereArgs.length > 0) {
      query = query.where.apply(query, whereArgs);
    }

    return query.toQuery('mysql');
  }

  DataMySql.count = function(args, cb) {

    var query = this.createStaticCountQuery(args);
    var q = this.conn.query(query.text, query.values, function(err, res) {
      if (!!err) {
        lib.logger.error('static count error:', err, q.sql);
      } else {
        res = res[0].count;
      }
      cb(err, res);
    });
    lib.logger.debugSql(q);
  }

  DataMySql.createStaticFindAllQuery = function() {
    var selectArgs = _(utils.getPrimaryKeys(def)).map(function(elem) {
      return queryBuilder.get(elem);
    });
    var query = queryBuilder.select(selectArgs).toQuery('mysql');
    return query;
  }

  /**
   * !!!CAUTION: IT WOULD RETURN ALL OBJECT PRIMARY VALUES!!!
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataMySql.findAll = function(cb) {
    var query = this.createStaticFindAllQuery();
    var q = this.conn.query(query.text, query.values, function(err, res) {

      if (!!err) {
        lib.logger.error('static findAll error:', err, q.sql);
      }
      cb(err, res);
    });
    lib.logger.debugSql(q);
  }

  DataMySql.createStaticRemoveAllQuery = function() {
    var query = {
      text: 'TRUNCATE `' + def.db.tbl_name + '`',
      values: [],
    };
    return query;
  }

  /**
   * !!!CAUTION: IT WOULD REMOVE ALL OBJECTS!!!
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataMySql.removeAll = function(cb) {
    var query = this.createStaticRemoveAllQuery();
    var q = this.conn.query(query.text, query.values, function(err) {
      if (!!err) {
        lib.logger.error('static removeAll error:', err, q.sql);
      }
      cb(err);
    });
    lib.logger.debugSql(q);
  }

  DataMySql.createStaticCountAllQuery = function() {
    var key = _(def.props).keys()[0];
    var query = queryBuilder.select(queryBuilder.get(key).count().as('count')).toQuery('mysql');
    return query;
  }

  DataMySql.countAll = function(cb) {

    var query = this.createStaticCountAllQuery();
    var q = this.conn.query(query.text, query.values, function(err, res) {
      if (!!err) {
        lib.logger.error('static countAll error:', err, q.sql);
      } else {
        res = res[0].count;
      }
      cb(err, res);
    });
    lib.logger.debugSql(q);
  }

  DataMySql.createStaticUpdateQuery = function(args) {
    var updateArgs = createUpdateArgs(def, queryBuilder, args.$update);
    var whereArgs = createWhereArgs(def, queryBuilder, args.$where || {});
    var query = queryBuilder.update(updateArgs).where(whereArgs).toQuery('mysql');
    return query;
  }

  /**
   * Update DB directly, don't affect Cache
   * @type {[type]}
   */
  DataMySql.update = function(args, cb) {

    var query = this.createStaticUpdateQuery(args);
    var q = this.conn.query(query.text, query.values, function(err) {
      if (!!err) {
        lib.logger.error('static update error:', err, q.sql);
      }
      cb(err);
    });
    lib.logger.debugSql(q);
  }

  DataMySql.prototype.query = DataMySql.query = function(sql, values, cb) {
    var q = this.conn.query(sql, values, cb);
    lib.logger.debugSql(q);
  }

  return require('bluebird').promisifyAll(DataMySql);
}

module.exports.__type__ = consts.DataType.MYSQL;