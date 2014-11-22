'use strict';
var mysql = require('mysql');
var redis = require('redis');
var model = require('../lib');
// var debug_mode = model.debug_mode = false;
var debug_mode = model.debug_mode = true;

module.exports = function(dbConfig) {

  var pool = mysql.createPool(dbConfig || {
    connectionLimit: 10,
    host: 'localhost',
    user: 'yqb',
    password: 'yqb',
    database: 'model_test',
  });

  pool.config.connectionConfig.queryFormat = function(query, values) {
    if (!values) return query;
    var res = query
      .replace(/\$\$(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return values[key];
        }
        return txt;
      }.bind(this))
      .replace(/\$(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    if (debug_mode) {
      console.log('[sql]:', res);
    }
    return res;
  };

  model.setDBClient(pool);

  var redisClient = redis.createClient();
  model.setCacheClient(redisClient);
}