'use strict';
var CronJob = require('cron').CronJob;
// var util = require('util');
var _ = require('underscore');
var assert = require('assert');
var lib = require('../index');
var utils = require('../utils');

var id = 0;
var Job = function(args) {
  this.jobs = [];
  this.isStop = true;
  this.isRunning = false;
  this.testInterval = null;
  this.id = id++;
  this.cron = args.cron;
  if (this.cron) {
    this.cronJob = new CronJob({
      cronTime: this.cron,
      onTick: this.run.bind(this),
      onComplete: null,
      timeZone: null,
      start: false
    });
  }
  lib.logger.debugJob('job[' + this.id + '] create');
}

Job.prototype.start = function() {
  lib.logger.debugJob('job[' + this.id + '] start');
  if (!this.isStop) {
    lib.logger.debugJob('job[' + this.id + '] already start');
    return;
  }

  var self = this;
  this.isStop = false;
  if (this.cron === '* * * * * *') {

    this.testInterval = setInterval(function() {
      self.run();
    }, 1);

  } else {

    this.cronJob.start();
  }
}

Job.prototype.stop = function(cb) {
  lib.logger.debugJob('job[' + this.id + '] stop');
  if (this.isStop) {
    lib.logger.debugJob('job[' + this.id + '] already stop');
    setImmediate(cb);
    return;
  }
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
    lib.logger.error('add job error: job[' + this.id + '] is stop', job.model.toModelJSON());
  } else {
    this.jobs.push(job);
  }
}

Job.prototype.run = function() {
  assert.ok(false, 'please impletment this method');
}

Job.prototype.createQuery = function(job) {
  assert.ok(false, 'please impletment this method');
}

Job.prototype.isDone = function() {
  return this.jobs.length === 0;
}

module.exports = Job;