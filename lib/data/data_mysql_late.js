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

  var queryBuilder = DataMySqlLate.prototype.queryBuilder = DataMySqlLate.queryBuilder;

  DataMySqlLate.prototype.update = function(cb) {

    var updateArgs = this.__getUpdateArgs();
    if (_(updateArgs).size() === 0) {
      cb();
      return;
    }
    addJob(this);
  }

  return DataMySqlLate;
}

module.exports.__type__ = consts.DataType.MYSQL_LATE;

var jobs = [];
var addJob = function(job) {
  jobs.push(job);
}

var DEFAULT_BATCH_COUNT = 100;

var runJobs = function() {
  model.logger.debug('runJobs', jobs.length);

  if (jobs.length === 0) {
    return;
  }

  var batchCount = model.get(consts.DataType.MYSQL_LATE).batchCount || DEFAULT_BATCH_COUNT;
  jobs = _(jobs).uniq();
  async.whilst(
    function() {
      return jobs.length > 0;
    },
    function(cb) {
      var batchJobs = [];
      for (var i = 0; i < batchCount && jobs.length > 0; i++) {
        batchJobs.push(jobs.shift());
      }

      var query = _(batchJobs)
        .chain()
        .map(function(elem) {

          var updateArgs = elem.__getUpdateArgs();
          var whereArgs = elem.model.getPrimaryKeysAndValues();
          var query = elem.queryBuilder.update(updateArgs).where(whereArgs).toQuery('mysql');
          return query;
        })
        .reduce(function(memo, elem) {
          // console.log(memo, elem);
          memo.text += elem.text + ';';
          memo.values = memo.values.concat(elem.values);
          return memo;
        }, {
          text: '',
          values: []
        })
        .value();

      batchJobs[0].conn.query(query.text, query.values, function(err) {
        if (!!err) {
          model.logger.error('runJobs error:', err);
        } else {
          model.logger.debug('runJobs success');
        }
        batchJobs.forEach(function(elem) {
          elem.emit('updated', err);
        });
        //go on any way
        cb();
      });
    },
    function() {
      //do nothing
    });
}


module.exports.startCronJob = function() {
  var config = model.get(consts.DataType.MYSQL_LATE);
  assert.ok(!!config, 'please configure ' + consts.DataType.MYSQL_LATE + ' first');
  return new CronJob(config.cron, runJobs, null, true);
}