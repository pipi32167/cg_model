'use strict';
// var async = require('async');
var _ = require('underscore');
// var assert = require('assert');
var consts = require('../consts');
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

var exp = module.exports = function(lib, def, connType) {
  var DataMySqlLateBase = require('./data_mysql')(lib, def, connType);

  var DataMySqlLate = function(lib, model) {
    DataMySqlLateBase.call(this, lib, model);
  }

  _.extend(DataMySqlLate.prototype, DataMySqlLateBase.prototype);
  _.extend(DataMySqlLate, DataMySqlLateBase);

  Object.defineProperty(DataMySqlLate.prototype, 'conn', {
    get: function() {
      return this.getDBConn();
    }
  });

  Object.defineProperty(DataMySqlLate.prototype, 'dbName', {
    get: function() {
      return this.getDBName();
    }
  });

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

    if (this.model.isRemoved) {
      cb();
      return;
    }
    
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

  return DataMySqlLate;
}

exp.__type__ = consts.DataType.MYSQL_LATE;

var addUpdateJob = function(job) {
  var jobName = utils.getJobName(consts.DataType.MYSQL_LATE, job.dbName, 'update');
  lib.getJob(jobName).add(job);
}

exp.addUpdateJob = addUpdateJob;