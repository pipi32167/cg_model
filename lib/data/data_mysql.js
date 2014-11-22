'use strict';
var sql = require('sql');
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var Data = require('./data');
var consts = require('../consts');
var utils = require('../utils');

module.exports = function(Model, conn) {

  var DataMySql = function(model, conn) {
    Data.call(this, model, conn);
    this.isSaved = false;
  }

  DataMySql.Model = Model;
  DataMySql.conn = conn;

  util.inherits(DataMySql, Data);

  /**
   * Instance
   */

  var __propKeys = function() {
    return _(this.model.def.props).keys();
  }

  var __propValues = function(keys) {
    keys = keys || __propKeys.call(this);
    var props = this.model.def.props;
    var mem = this.model.mem;
    return _(keys).map(function(elem) {
      return utils.typeCast(props[elem].type, mem.p(elem));
    });
  }

  DataMySql.prototype.create = function(cb) {
    var sql = 'insert into $$tbl_name ($$fields) values($values)';
    var fields = __propKeys.call(this);
    var values = __propValues.call(this, fields);
    var args = {
      tbl_name: this.model.def.db.tbl_name,
      fields: fields,
      values: values,
    };
    this.conn.query(sql, args, cb);
  }

  DataMySql.prototype.load = function(cb) {
    var primaryKeys = this.model.getPrimaryKeys();
    var sql = 'select * from $$tbl_name where ($$primary_keys) in ($values)';
    var args = {
      tbl_name: this.model.def.db.tbl_name,
      primary_keys: primaryKeys,
      values: __propValues.call(this, primaryKeys),
    };
    this.conn.query(sql, args, function(err, res) {
      if (!err) {
        res = res[0];
      }
      cb(err, res);
    });
  }

  DataMySql.prototype.update = function(cb) {
    var sql = 'replace into $$tbl_name ($$fields) values ($values)';
    var args = {
      tbl_name: this.model.def.db.tbl_name,
      fields: __propKeys.call(this),
      values: __propValues.call(this),
    };
    this.conn.query(sql, args, cb);
  }

  DataMySql.prototype.remove = function(cb) {
    var primaryKeys = this.model.getPrimaryKeys();
    var sql = 'delete from $$tbl_name where ($$fields) in ($values)';
    var args = {
      tbl_name: this.model.def.db.tbl_name,
      fields: primaryKeys,
      values: __propValues.call(this, primaryKeys),
    };
    this.conn.query(sql, args, cb);
  }

  /**
   * Static
   */

  DataMySql.find = function(args, cb) {
    var sql = 'select * from $$tbl_name where ($$fields) in $values';
    console.log(args);
    args = {
      tbl_name: this.model.def.db.tbl_name,
      fields: _(args).keys(),
      values: _(args).values(),
    };
    console.log(args);
    this.conn.query(sql, args, cb);
  }

  DataMySql.remove = function(args, cb) {

  }

  var __getAllPrimaryValues = function(cb) {
    var primaryKeys = this.model.getPrimaryKeys();
    var sql = 'select $$fields from $$tbl_name';
    args = {
      tbl_name: this.model.def.db.tbl_name,
      fields: primaryKeys,
    };
    this.conn.query(sql, args, cb);
  }

  /**
   * !!!JUST FOR TEST PURPOSE, DON'T USE IT!!!
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  DataMySql.removeAll = function(cb) {
    var sql = 'truncate $$tbl_name';
    var args = {
      tbl_name: this.Model.def.db.tbl_name,
    };
    this.conn.query(sql, args, cb);
  }

  return DataMySql;
}

module.exports.__type__ = consts.DataType.MYSQL;