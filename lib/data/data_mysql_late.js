'use strict';
var async = require('async');
var util = require('util');
var sqlFormat = require('mysql').format;
var CronJob = require('cron').CronJob;
var _ = require('underscore');
var assert = require('assert');
var consts = require('../consts');
var DataMySql = require('./data_mysql');
var lib = require('../index');
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

  DataMySqlLate.prototype.create = function(cb) {

    var updateImmediate = __updateImmediate.call(this, this.getCreateArgs());
    if (!updateImmediate) {
      addUpdateJob(this);
      cb();
    } else {
      var self = this;
      this.createSync.call(this, function(err) {
        cb(err);
        self.emit(consts.Event.UPDATED, err);
      });
    }
  }

  DataMySqlLate.prototype.loadSync = DataMySqlLate.prototype.load;

  DataMySqlLate.prototype.loadAsync = function(cb) {

    addLoadJob(this);
    cb();
  }

  DataMySqlLate.prototype.updateSync = DataMySqlLate.prototype.update;

  DataMySqlLate.prototype.update = DataMySqlLate.prototype.updateAsync = function(cb) {

    var updateArgs = this.getUpdateArgs();
    if (_(updateArgs).size() === 0) {
      this.emit(consts.Event.UPDATED);
      cb();
      return;
    }

    var updateImmediate = __updateImmediate.call(this, updateArgs);

    if (!updateImmediate) {

      addUpdateJob(this);
      cb();

    } else {

      var self = this;
      this.updateSync.call(this, function(err) {
        self.emit(consts.Event.UPDATED, err);
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

var DEFAULT_BATCH_COUNT = 100;

var Job = function(cron, doneEvent) {
  this.jobs = [];
  this.isStop = false;
  this.isRunning = false;
  this.doneEvent = doneEvent;
  this.testInterval = null;
  this.cron = cron;
  this.cronJob = new CronJob({
    cronTime: cron,
    onTick: this.run.bind(this),
    onComplete: null,
    timeZone: null,
    start: false
  });
}

Job.prototype.start = function() {

  var self = this;
  if (this.cron === '* * * * * *') {

    this.testInterval = setInterval(function() {
      self.run();
    }, 1);

  } else {

    this.cronJob.start();
  }
}

Job.prototype.stop = function(cb) {
  this.isStop = true;
  var self = this;
  if (this.cron === '* * * * * *') {

    clearInterval(this.testInterval);
    cb();

  } else {

    var interval = setInterval(function() {
      self.run();
      if (self.isDone()) {
        clearInterval(interval);
        if (self.cronJob) {
          self.cronJob.stop(utils.emptyCB);
        }
        setImmediate(cb);
      }
    }, 100);
  }
}

Job.prototype.add = function(job) {
  if (this.isStop) {
    lib.logger.error('add job error: job is stop', job.model.toModelJSON());
  } else {
    this.jobs.push(job);
  }
}

Job.prototype.createQuery = function(job) {
  assert.ok(false, 'please impletment this method');
}

Job.prototype.run = function() {
  // lib.logger.debug('Job.run', this.jobs.length, this.isRunning);
  var self = this;
  if (this.jobs.length === 0 || this.isRunning) {
    return;
  }
  this.isRunning = true;

  var batchCount = lib.get(consts.DataType.MYSQL_LATE).batchCount || DEFAULT_BATCH_COUNT;
  async.whilst(
    function() {
      return self.jobs.length > 0;
    },
    function(cb) {
      var batchJobs = [];
      var queries = [];
      var job, query, i, j;
      var ids = {};

      var runJobCount = self.jobs.length < batchCount ? self.jobs.length : batchCount;
      for (i = 0; i < runJobCount; i++) {
        job = self.jobs[i];
        if (job.isRemoved || ids[job.__id]) {
          continue;
        }
        query = self.createQuery(job);
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
        self.jobs = self.jobs.slice(runJobCount);
        setImmediate(cb);
        return;
      }

      var q = batchJobs[0].conn.query(batchQuery.text, batchQuery.values, function(err, results) {
        if (!!err) {
          lib.logger.error('Job.run error:', err, sqlFormat(q.sql, q.values));
          batchJobs.forEach(function(elem) {
            elem.emit(self.doneEvent, err);
          });
        } else {
          lib.logger.debug('Job.run success');
          var elem;
          for (var i = 0; i < batchJobs.length; i++) {
            elem = batchJobs[i];
            if (elem.isRemoved) {
              continue;
            }

            try {
              elem.p(elem.model.mem.p());
              if (elem.isSaved) {
                elem.emit(self.doneEvent);
              } else {
                if (batchJobs.length === 1) {
                  elem.afterCreateSuccess(results);
                } else {
                  elem.afterCreateSuccess(results[i]);
                }
                elem.emit(self.doneEvent);
              }
            } catch (e) {
              lib.logger.error(e.stack);
              elem.emit(self.doneEvent, e);
            }
          }
        }

        // total += batchJobs.length;
        self.jobs = self.jobs.slice(runJobCount);
        setImmediate(cb);
      });

      lib.logger.debugSql(q);
    },
    function() {
      self.isRunning = false;
      // console.log(total);
    });
}

Job.prototype.isDone = function() {
  return this.jobs.length === 0;
}

var UpdateJob = function(cron) {
  Job.call(this, cron, consts.Event.UPDATED);
}

util.inherits(UpdateJob, Job);

UpdateJob.prototype.createQuery = function(job) {
  var query;
  if (job.isSaved) {
    query = job.createUpdateQuery();
  } else {
    query = job.createCreateQuery();
  }
  return query;
}

var jobs;
var isInit = false;

var init = function(config) {
  isInit = true;

  jobs = {
    update: new UpdateJob(config.cron),
    // load: new LoadJob(config.loadCron)
  };
  // jobs.push(config.cron, new Job(consts.Event.UPDATED))
}

var addUpdateJob = function(job) {
  jobs.update.add(job);
}

exp.startCronJob = function() {
  var config = lib.get(consts.DataType.MYSQL_LATE);
  assert.ok(!!config, 'please configure ' + consts.DataType.MYSQL_LATE + ' first');

  init(config);

  _(jobs).each(function(elem) {
    elem.start();
  });
}

exp.stopCronJob = function(cb) {
  if (!jobs) {
    cb();
    return;
  }

  async.each(
    _(jobs).values(),
    function(elem, cb) {
      elem.stop(cb);
    },
    cb);
}

exp.addUpdateJob = addUpdateJob;