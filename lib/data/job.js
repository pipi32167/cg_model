'use strict';
var CronJob = require('cron').CronJob;
// var util = require('util');
// var _ = require('underscore');
var assert = require('assert');
var lib = require('../index');
var utils = require('../utils');


var Job = function(args) {
  this.jobs = [];
  this.isStop = false;
  this.isRunning = false;
  this.testInterval = null;
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
}

Job.prototype.start = function() {

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