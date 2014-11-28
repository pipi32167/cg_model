'use strict';
var sql = require('sql');
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
 * @param  {String}   type  type of the update property
 * @param  {AnyValue} value value of the update property
 * @return {String}         prepare result of the update property
 */
var convertUpdateValue = function(prop, type, value) {
  utils.checkPropValueType(prop, type, value);
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

  DataMySql.prototype.__getUpdateArgs = function() {
    var propKeys = __propKeys.call(this);
    var self = this;
    var res = {};
    var memValue, dbValue;
    var props = this.model.def.props;
    propKeys.forEach(function(elem) {
      memValue = self.model.mem.p(elem);
      dbValue = self.p(elem);
      if (memValue !== dbValue && !props[elem].primary) {
        res[elem] = convertUpdateValue(elem, props[elem].type, memValue);
      }
    });
    return res;
  }

  /**
   * Public methods
   */

  DataMySql.prototype.create = function(cb) {
    var args = this.model.getAllPropKeysAndValues();
    var prop, props = this.model.def.props;
    for (prop in args) {
      if (args.hasOwnProperty(prop) &&
        (!props[prop].primary || !props[prop].autoIncr)) {
        args[prop] = convertUpdateValue(prop, props[prop].type, args[prop]);
      }
    }

    var query = queryBuilder.insert(args).toQuery('mysql');
    var self = this;
    var q = this.conn.query(query.text, query.values, function(err, res) {
      if (!!err) {
        self.app.logger.error('create error:', err, q.sql);
      } else {
        var primaryKey = self.model.getPrimaryKeys()[0];
        if (!!primaryKey && !!self.model.def.props[primaryKey].autoIncr) {
          self.model.mem.p(primaryKey, res.insertId);
        }
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
        for (var prop in res) {
          if (res.hasOwnProperty(prop)) {
            res[prop] = convertLoadValue(props[prop].type, res[prop]);
          }
        }
      }
      cb(err, res);
    });
  }

  /**
   * Update into the MySql.
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataMySql.prototype.update = function(cb) {
    var updateArgs = this.__getUpdateArgs();
    if (_(updateArgs).size() === 0) {
      cb();
      return;
    }
    var whereArgs = this.model.getPrimaryKeysAndValues();
    var query = queryBuilder.update(updateArgs).where(whereArgs).toQuery('mysql');
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

    var whereArgs = [];
    var key, value, type;
    for (key in args) {
      if (args.hasOwnProperty(key)) {
        value = args[key];
        type = utils.typeOf(value);

        switch (type) {
          case 'array':
            whereArgs.push(queryBuilder[key].in(value));
            break;
          default:
            whereArgs.push(queryBuilder[key].equals(value));
            break;
        }
      }
    }

    var selectArgs = _(this.Model.getPrimaryKeys()).map(function(elem) {
      return queryBuilder[elem];
    })

    var select = queryBuilder.select(selectArgs);
    var query = select.where.apply(select, whereArgs).toQuery('mysql');
    var self = this;
    var q = this.conn.query(query.text, query.values, function(err, res) {
      if (!!err) {
        self.app.logger.error('static find error:', err, q.sql);
      }
      cb(err, res);
    });
  }

  DataMySql.remove = function(query, cb) {
    var self = this;
    var q = this.conn.query(query.text, query.values, function(err) {
      if (!!err) {
        self.app.logger.error('static remove error:', err, q.sql);
      }
      cb(err);
    });
  }

  /**
   * !!!CAUTION: IT WOULD RETURN ALL OBJECT PRIMARY VALUES!!!
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataMySql.findAll = function(cb) {
    var selectArgs = _(this.Model.getPrimaryKeys()).map(function(elem) {
      return queryBuilder[elem];
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
    var sql = 'TRUNCATE `' + this.Model.def.db.tbl_name + '`';
    var self = this;
    var q = this.conn.query(sql, [], function(err) {

      if (!!err) {
        self.app.logger.error('static removeAll error:', err, q.sql);
      }
      cb(err);
    });
  }

  return DataMySql;
}

module.exports.__type__ = consts.DataType.MYSQL;