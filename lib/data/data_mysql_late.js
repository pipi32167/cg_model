'use strict';
var async = require('async');
var CronJob = require('cron').CronJob;
var sql = require('sql');
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var Data = require('./data');
var consts = require('../consts');
var utils = require('../utils');
var DataMySql = require('./data_mysql');
var model = require('../index');

module.exports = function(Model, conn) {
  var DataMySqlLate = DataMySql(Model, conn);

  var queryBuilder = DataMySqlLate.queryBuilder;

  DataMySqlLate.prototype.update = function(cb) {

    var updateArgs = this.__getUpdateArgs.call(this);
    if (_(updateArgs).size() === 0) {
      cb();
      return;
    }
    var whereArgs = this.model.getPrimaryKeysAndValues();
    var query = queryBuilder.update(updateArgs).where(whereArgs).toQuery('mysql');
    var self = this;
    addJob(function(cb) {
      self.conn.query(query.text, query.values, function(err) {
        self.emit('updated', err);
        cb(err);
      });
    });
  }

  return DataMySqlLate;
}

module.exports.__type__ = consts.DataType.MYSQL_LATE;

var jobs = [];
var addJob = function(job) {
  jobs.push(job);
}

var runJobs = function() {
  model.logger.debug('runJobs', jobs.length);
  async.whilst(
    function() {
      return jobs.length > 0;
    },
    function(cb) {
      var job = jobs.shift();
      try {

        job(function(err) {
          if (!!err) {
            model.logger.error('runJobs error:', err);
          } else {
            model.logger.error('runJobs success');
          }
          //go on any way
          cb();
        });
      } catch (e) {
        model.logger.error('runJobs exception:', e, e.stack);
        cb();
      }
    },
    function() {
      //do nothing
    });
}

module.exports.startCronJob = function(cron) {
  return new CronJob(cron, runJobs, null, true);
}