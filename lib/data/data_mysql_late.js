'use strict';
var async = require('async');
var util = require('util');
// var sqlFormat = require('mysql').format;
var _ = require('underscore');
var assert = require('assert');
var consts = require('../consts');
var lib = require('../index');
var JobMySqlUpdate = require('./job_mysql_update');

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

var exp = module.exports = function(lib, def, connType) {
  var DataMySqlLateBase = require('./data_mysql')(lib, def, connType);

  var DataMySqlLate = function(lib, model) {
    DataMySqlLateBase.call(this, lib, model);
  }

  _.extend(DataMySqlLate.prototype, DataMySqlLateBase.prototype);
  _.extend(DataMySqlLate, DataMySqlLateBase);

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

  DataMySqlLate.prototype.update = DataMySqlLate.prototype.updateAsync = function(cb) {

    if (!this.isModified()) {
      this.emit(consts.Event.UPDATED);
      cb();
      return;
    }

    var updateArgs = this.getCreateArgs();

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

var UpdateJob = function(cron, batchCount) {
  JobMySqlUpdate.call(this, {
    cron: cron,
    doneEvent: consts.Event.UPDATED,
    batchCount: batchCount
  });
}

util.inherits(UpdateJob, JobMySqlUpdate);

UpdateJob.prototype.createQuery = function(job) {
  return job.createCreateQuery();
}

var jobs;
var isInit = false;

var init = function(config) {
  isInit = true;

  jobs = {
    update: new UpdateJob(config.cron, config.batchCount),
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