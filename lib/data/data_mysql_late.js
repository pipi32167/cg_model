'use strict';
var async = require('async');
var sqlFormat = require('mysql').format;
var CronJob = require('cron').CronJob;
var _ = require('underscore');
var assert = require('assert');
var consts = require('../consts');
var DataMySql = require('./data_mysql');
var model = require('../index');
var utils = require('../utils');

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

var exp = module.exports = function(lib, Model, connType) {
  var DataMySqlLate = DataMySql.call(this, lib, Model, connType);

  DataMySqlLate.prototype.queryBuilder = DataMySqlLate.queryBuilder;

  DataMySqlLate.prototype.create = function(cb) {

    var updateImmediate = __updateImmediate.call(this, this.getCreateArgs());
    if (!updateImmediate) {
      addJob(this);
      cb();
    } else {
      var self = this;
      this.createSync.call(this, function(err) {
        cb(err);
        self.emit('updated', err);
      });
    }
  }

  DataMySqlLate.prototype.updateSync = DataMySqlLate.prototype.update;

  DataMySqlLate.prototype.update = function(cb) {

    var updateArgs = this.getUpdateArgs();
    if (_(updateArgs).size() === 0) {
      this.emit('updated');
      cb();
      return;
    }

    var updateImmediate = __updateImmediate.call(this, updateArgs);

    if (!updateImmediate) {

      addJob(this);
      cb();

    } else {

      var self = this;
      this.updateSync.call(this, function(err) {
        self.emit('updated', err);
        cb(err);
      });
    }
  }

  var __remove = DataMySqlLate.prototype.remove;
  DataMySqlLate.prototype.remove = function(cb) {
    this.isRemoved = true;
    __remove.call(this, cb);
  }

  return DataMySqlLate;
}

exp.__type__ = consts.DataType.MYSQL_LATE;

var jobs = [];
var stop = false;
var addJob = function(job) {

  if (!stop) {
    jobs.push(job);
  } else {
    model.logger.error('addJob error:', job.toModelJSON());
  }
}

var DEFAULT_BATCH_COUNT = 100;

var isRunningJobs = false;
// var total = 0;

var runJobs = function() {
  // model.logger.debug('runJobs', jobs.length, isRunningJobs);

  if (jobs.length === 0 || isRunningJobs) {
    return;
  }
  isRunningJobs = true;

  var batchCount = model.get(consts.DataType.MYSQL_LATE).batchCount || DEFAULT_BATCH_COUNT;
  async.whilst(
    function() {
      return jobs.length > 0;
    },
    function(cb) {
      var batchJobs = [];
      var queries = [];
      var job, query, i, j;
      var ids = {};

      var runJobCount = jobs.length < batchCount ? jobs.length : batchCount;
      for (i = 0; i < runJobCount; i++) {
        job = jobs[i];
        if (job.isRemoved || ids[job.__id]) {
          continue;
        }
        if (job.isSaved) {
          query = job.createUpdateQuery();
        } else {
          query = job.createCreateQuery();
        }
        if (!!query) {
          ids[job.__id] = true;
          batchJobs.push(job);
          queries.push(query);
        }
      }

      var batchQuery = {
        text: '',
        values: [],
      };

      for (i = 0; i < queries.length; i++) {
        query = queries[i];
        batchQuery.text += query.text + ';';
        for (j = 0; j < query.values.length; j++) {
          batchQuery.values.push(query.values[j]);
        };
      };

      if (batchQuery.values.length === 0) {
        jobs = jobs.slice(runJobCount);
        setImmediate(cb);
        return;
      }

      var q = batchJobs[0].conn.query(batchQuery.text, batchQuery.values, function(err, results) {
        if (!!err) {
          model.logger.error('runJobs error:', err, sqlFormat(q.sql, q.values));
          batchJobs.forEach(function(elem) {
            elem.emit('updated', err);
          });
        } else {
          model.logger.debug('runJobs success');
          var elem;
          for (var i = 0; i < batchJobs.length; i++) {
            elem = batchJobs[i];
            if (elem.isRemoved) {
              continue;
            }

            try {
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
            } catch (e) {
              model.logger.error(e.stack);
              elem.emit('updated', e);
            }
          }
        }

        // total += batchJobs.length;
        jobs = jobs.slice(runJobCount);
        setImmediate(cb);
      });

      model.logger.debugSql(q);
    },
    function() {
      isRunningJobs = false;
      // console.log(total);
    });
}


var cronJob;

exp.startCronJob = function() {
  stop = false;
  var config = model.get(consts.DataType.MYSQL_LATE);
  assert.ok(!!config, 'please configure ' + consts.DataType.MYSQL_LATE + ' first');
  if (config.cron === '* * * * * *') {

    var interval = setInterval(function() {
      runJobs();
    }, 1);

    cronJob = {
      stop: function() {
        clearInterval(interval);
      }
    };
  } else {
    cronJob = new CronJob(config.cron, runJobs, null, true);
  }
}

exp.stopCronJob = function(cb) {
  stop = true;
  var interval = setInterval(function() {
    runJobs();
    if (jobs.length === 0) {
      clearInterval(interval);
      if (cronJob) {
        cronJob.stop(utils.emptyCB);
      }
      setImmediate(cb);
    }
  }, 100);
}

exp.addJob = addJob;