'use strict';
var async = require('async');
var CronJob = require('cron').CronJob;
var _ = require('underscore');
var assert = require('assert');
var consts = require('../consts');
var DataMySql = require('./data_mysql');
var model = require('../index');

var __updateImmediate = function(updateProps) {
  var prop, props = this.model.def.props;
  for (prop in updateProps) {
    if (updateProps.hasOwnProperty(prop) &&
      props.hasOwnProperty(prop) &&
      (!!props[prop].unique || //is unque key
        !!props[prop].sync || //is need sync
        (!updateProps[prop] && props[prop].primary && props[prop].autoIncr))) { //is undefined primary key and auto increment
      return true;
    }
  }
  return false;
}

module.exports = function(app, Model, connType) {
  var DataMySqlLate = DataMySql.call(this, app, Model, connType);

  DataMySqlLate.prototype.queryBuilder = DataMySqlLate.queryBuilder;

  var __createSync = DataMySqlLate.prototype.create;
  DataMySqlLate.prototype.create = function(cb) {

    var updateImmediate = __updateImmediate.call(this, this.getCreateArgs());
    if (!updateImmediate) {
      addJob(this);
      cb();
    } else {
      var self = this;
      __createSync.call(this, function(err) {
        cb(err);
        self.emit('updated', err);
      });
    }
  }

  var __updateSync = DataMySqlLate.prototype.update;

  DataMySqlLate.prototype.update = function(cb) {

    var updateArgs = this.getUpdateArgs();
    if (_(updateArgs).size() === 0) {
      cb();
      return;
    }

    var updateImmediate = __updateImmediate.call(this, updateArgs);

    if (!updateImmediate) {

      addJob(this);
      cb();

    } else {

      var self = this;
      __updateSync.call(this, function(err) {
        self.emit('updated', err);
        cb(err);
      });
    }
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
      var queries = [];
      var job, query;
      while (batchJobs.length < batchCount && jobs.length > 0) {
        job = jobs.shift();
        if (job.isSaved) {
          query = job.createUpdateQuery();
        } else {
          query = job.createCreateQuery();
        }
        if (!!query) {
          batchJobs.push(job);
          queries.push(query);
        }
      }

      var batchQuery = _(queries).reduce(function(memo, elem) {
        memo.text += elem.text + ';';
        memo.values = memo.values.concat(elem.values);
        return memo;
      }, {
        text: '',
        values: []
      });

      if (batchQuery.values.length === 0) {
        cb();
        return;
      }

      var q = batchJobs[0].conn.query(batchQuery.text, batchQuery.values, function(err, results) {
        if (!!err) {
          model.logger.error('runJobs error:', err, q.sql);
          batchJobs.forEach(function(elem) {
            if (elem.isSaved) {
              elem.emit('updated', err);
            } else {
              elem.emit('updated', err);
            }
          });
        } else {
          model.logger.debug('runJobs success');
          var elem;
          for (var i = 0; i < batchJobs.length; i++) {
            elem = batchJobs[i];
            elem.p(elem.model.mem.p());
            if (elem.isSaved) {
              elem.emit('updated');
            } else {
              if (batchJobs.length === 1) {
                elem.afterCreateSuccess(results);
              } else {
                elem.afterCreateSuccess(results[i]);
              }
              elem.emit('updated');
            }
          }
        }
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
  if (config.cron === '* * * * * *') {

    var interval = setInterval(function() {
      runJobs();
    }, 1);

    return {
      stop: function() {
        clearInterval(interval);
      }
    };
  } else {
    return new CronJob(config.cron, runJobs, null, true);
  }
}