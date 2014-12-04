'use strict';
var sql = require('sql');
var async = require('async');
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var Data = require('./data');
var consts = require('../consts');
var utils = require('../utils');

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
    case 'date':
      return value;
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
      return;
  }
  assert.ok(false, 'unsupported operator: ' + operator);
}

var createWhereArgs = function(Model, queryBuilder, args) {
  var res = [];
  var key, value, type;
  var props = Model.def.props;
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

var createSelectArgs = function(Model, queryBuilder, args) {
  var keys = args.$select || Model.getPrimaryKeys();
  return _(keys).map(function(elem) {
    return queryBuilder.get(elem);
  });
}

var createOrderArgs = function(Model, queryBuilder, args) {
  if (!args.$order) {
    return [];
  }

  var res = [];
  var prop, value;
  var props = Model.def.props;
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


module.exports = function(app, Model, connType) {

  var queryBuilder = sql.define({
    name: Model.def[connType].tbl_name,
    columns: _(Model.def.props).keys(),
  });

  var DataMySql = function(app, model) {
    Data.call(this, app, model);
    this.isSaved = false;
    this.conn = DataMySql.conn;
  }

  DataMySql.queryBuilder = queryBuilder;
  DataMySql.Model = Model;
  DataMySql.app = app;
  Object.defineProperty(DataMySql, 'conn', {
    get: function() {
      var conns = app.get('conns')[connType];
      var db_name = Model.def[connType].db_name;
      return conns[db_name];
    }
  });


  util.inherits(DataMySql, Data);

  /**
   * Instance methods
   */

  /**
   * Private methods
   */

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
      if (memValue !== dbValue && !props[elem].primary) {
        res[elem] = convertUpdateValue(Model.def.name, elem, props[elem].type, memValue);
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
        args[prop] = convertUpdateValue(Model.def.name, prop, props[prop].type, args[prop]);
      }
    }
    return args;
  }

  DataMySql.prototype.createCreateQuery = function() {

    var args = this.getCreateArgs();
    return queryBuilder.insert(args).toQuery('mysql');
  }

  DataMySql.prototype.afterCreateSuccess = function(res) {

    var primaryKey = this.model.getPrimaryKeys()[0];
    if (!!primaryKey && !!this.model.def.props[primaryKey].autoIncr) {
      this.model.mem.p(primaryKey, res.insertId);
    }
    this.p(this.model.mem.p());
    this.isSaved = true;
  }

  /**
   * Public methods
   */

  DataMySql.prototype.create = function(cb) {

    var query = this.createCreateQuery();

    var self = this;
    var q = this.conn.query(query.text, query.values, function(err, res) {
      if (!!err) {
        self.app.logger.error('create error:', err, q.sql);
      } else {
        self.afterCreateSuccess(res);
      }
      cb(err);
    });
  }

  /**
   * Load from the MySql.
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataMySql.prototype.load = function(cb) {
    var whereArgs = this.model.getPrimaryKeysAndValues();
    var query = queryBuilder.select().where(whereArgs).toQuery('mysql');
    var props = this.model.def.props;
    var self = this;
    var q = this.conn.query(query.text, query.values, function(err, res) {
      if (!!err) {
        self.app.logger.error('load error:', err, q.sql);
      } else {
        res = res[0];
        if (!!res) {
          for (var prop in res) {
            if (res.hasOwnProperty(prop)) {
              res[prop] = convertLoadValue(props[prop].type, res[prop]);
            }
          }
          self.p(res);
          self.isSaved = true;
        }
      }
      cb(err);
    });
  }

  DataMySql.prototype.createUpdateQuery = function() {
    var updateArgs = this.getUpdateArgs();
    if (_(updateArgs).size() === 0) {
      return;
    }
    var whereArgs = this.model.getPrimaryKeysAndValues();
    return queryBuilder.update(updateArgs).where(whereArgs).toQuery('mysql');
  }

  /**
   * Update into the MySql.
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataMySql.prototype.update = function(cb) {
    var query = this.createUpdateQuery();
    if (!query) {
      cb();
      return;
    }
    var self = this;
    var q = this.conn.query(query.text, query.values, function(err) {
      if (!!err) {
        self.app.logger.error('update error:', err, q.sql);
      } else {
        self.p(self.model.mem.p());
      }
      cb(err);
    });
  }

  DataMySql.prototype.remove = function(cb) {
    var args = this.model.getPrimaryKeysAndValues();
    var query = queryBuilder.delete().where(args).toQuery('mysql');
    var self = this;
    var q = this.conn.query(query.text, query.values, function(err) {
      if (!!err) {
        self.app.logger.error('remove error:', err, q.sql);
      } else {
        self.isSaved = false;
      }
      cb(err);
    });
  }

  /**
   * Static methods
   */

  /**
   * Find by primary keys, unique keys and indexes, return primary key values
   * @param  {Object}   args
   * @param  {Function} cb
   * @return {Void}
   */
  DataMySql.find = function(args, cb) {

    var whereArgs = createWhereArgs(Model, queryBuilder, args);
    var selectArgs = createSelectArgs(Model, queryBuilder, args);
    var orderArgs = createOrderArgs(Model, queryBuilder, args);

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

    query = query.toQuery('mysql');
    var self = this;
    var q = this.conn.query(query.text, query.values, function(err, res) {
      if (!!err) {
        self.app.logger.error('static find error:', err, q.sql);
      }
      cb(err, res);
    });
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

        var whereArgs = createWhereArgs(Model, queryBuilder, args);
        var query = queryBuilder.delete();
        if (whereArgs.length > 0) {
          query = query.where.apply(query, whereArgs);
        }
        if (args.$limit !== undefined) {
          query = query.limit(args.$limit);
        }

        query = query.toQuery('mysql');
        var q = self.conn.query(query.text, query.values, function(err) {
          if (!!err) {
            self.app.logger.error('static remove error:', err, q.sql);
          }
          cb(err);
        });
      }
    }, function(err) {
      cb(err, removedPrimaryKeyValues);
    })
  }

  DataMySql.count = function(args, cb) {

    var key = _(Model.def.props).keys()[0];
    var selectArgs = [queryBuilder.get(key).count().as('count')];
    var whereArgs = createWhereArgs(Model, queryBuilder, args);

    var query = queryBuilder.select(selectArgs);
    if (whereArgs.length > 0) {
      query = query.where.apply(query, whereArgs);
    }

    query = query.toQuery('mysql');
    var self = this;
    var q = this.conn.query(query.text, query.values, function(err, res) {
      if (!!err) {
        self.app.logger.error('static count error:', err, q.sql);
      } else {
        res = res[0].count;
      }
      cb(err, res);
    });
  }

  /**
   * !!!CAUTION: IT WOULD RETURN ALL OBJECT PRIMARY VALUES!!!
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataMySql.findAll = function(cb) {
    var selectArgs = _(Model.getPrimaryKeys()).map(function(elem) {
      return queryBuilder.get(elem);
    });
    var query = queryBuilder.select(selectArgs).toQuery('mysql');
    var self = this;
    var q = this.conn.query(query.text, query.values, function(err, res) {

      if (!!err) {
        self.app.logger.error('static findAll error:', err, q.sql);
      }
      cb(err, res);
    });
  }

  /**
   * !!!CAUTION: IT WOULD REMOVE ALL OBJECTS!!!
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataMySql.removeAll = function(cb) {
    var sql = 'TRUNCATE `' + Model.def.db.tbl_name + '`';
    var self = this;
    var q = this.conn.query(sql, [], function(err) {
      if (!!err) {
        self.app.logger.error('static removeAll error:', err, q.sql);
      }
      cb(err);
    });
  }

  DataMySql.countAll = function(cb) {
    var key = _(Model.def.props).keys()[0];
    var query = queryBuilder.select(queryBuilder.get(key).count().as('count')).toQuery('mysql');
    var self = this;
    var q = this.conn.query(query.text, query.values, function(err, res) {
      if (!!err) {
        self.app.logger.error('static countAll error:', err, q.sql);
      } else {
        res = res[0].count;
      }
      cb(err, res);
    });
  }

  return DataMySql;
}

module.exports.__type__ = consts.DataType.MYSQL;