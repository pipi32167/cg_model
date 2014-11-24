'use strict';
var sql = require('sql');
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var Data = require('./data');
var consts = require('../consts');
var utils = require('../utils');

module.exports = function(Model, conn) {

  var queryBuilder = sql.define({
    name: Model.def.db.tbl_name,
    columns: _(Model.def.props).keys(),
  });

  var DataMySql = function(model, conn) {
    Data.call(this, model, conn);
    this.isSaved = false;
  }

  DataMySql.queryBuilder = queryBuilder;
  DataMySql.Model = Model;
  DataMySql.conn = conn;

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
    propKeys.forEach(function(elem) {
      memValue = self.model.mem.p(elem);
      dbValue = self.p(elem);
      if (memValue !== dbValue) {
        res[elem] = memValue;
      }
    });
    return res;
  }

  /**
   * Public methods
   */

  DataMySql.prototype.create = function(cb) {
    var args = this.model.getAllPropKeysAndValues();
    var query = queryBuilder.insert(args).toQuery('mysql');
    this.conn.query(query.text, query.values, cb);
  }

  DataMySql.prototype.load = function(cb) {
    var whereArgs = this.model.getPrimaryKeysAndValues();
    var query = queryBuilder.select().where(whereArgs).toQuery('mysql');
    this.conn.query(query.text, query.values, function(err, res) {
      if (!err) {
        res = res[0];
      }
      cb(err, res);
    });
  }

  DataMySql.prototype.update = function(cb) {
    var updateArgs = this.__getUpdateArgs();
    if (_(updateArgs).size() === 0) {
      cb();
      return;
    }
    var whereArgs = this.model.getPrimaryKeysAndValues();
    var query = queryBuilder.update(updateArgs).where(whereArgs).toQuery('mysql');
    this.conn.query(query.text, query.values, cb);
  }

  DataMySql.prototype.remove = function(cb) {
    var args = this.model.getPrimaryKeysAndValues();
    var query = queryBuilder.delete().where(args).toQuery('mysql');
    this.conn.query(query.text, query.values, cb);
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

    var selectArgs = _(this.Model.getPrimaryKeys()).map(function (elem) {
      return queryBuilder[elem];
    })

    var select = queryBuilder.select(selectArgs);
    var query = select.where.apply(select, whereArgs).toQuery('mysql');
    this.conn.query(query.text, query.values, cb);
  }

  DataMySql.remove = function(query, cb) {
    this.conn.query(query.text, query.values, cb);
  }

  DataMySql.query = function(query, cb) {
    this.conn.query(query.text, query.values, cb);
  }

  /**
   * !!!JUST FOR TEST PURPOSE, DON'T USE IT!!!
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataMySql.removeAll = function(cb) {
    var query = queryBuilder.delete().toQuery('mysql');
    this.conn.query(query.text, query.values, cb);
  }

  return DataMySql;
}

module.exports.__type__ = consts.DataType.MYSQL;