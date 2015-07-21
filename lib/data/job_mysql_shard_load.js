'use strict';
var util = require('util');
var consts = require('../consts');
var JobMySqlLoad = require('./job_mysql_load');
var lib = require('../index');

var JobMySqlShardLoad = function() {
	JobMySqlLoad.call(this, {
		doneEvent: consts.Event.LOADED,
	});

	var self = this;
	setInterval(function() {
		self.run();
	}, consts.DEFAULT_BATCH_LOAD_INTERVAL);
}

util.inherits(JobMySqlShardLoad, JobMySqlLoad);

JobMySqlShardLoad.prototype.createQuery = function(job) {
	return job.createLoadQuery();
}

JobMySqlShardLoad.prototype.start = function() {
	lib.logger.debugJob('job[' + this.id + '] start');
	if (!this.isStop) {
		lib.logger.debugJob('job[' + this.id + '] already start');
		return;
	}
	this.isStop = false;
}

JobMySqlShardLoad.prototype.stop = function(cb) {
	lib.logger.debugJob('job[' + this.id + '] stop');
	if (this.isStop) {
		lib.logger.debugJob('job[' + this.id + '] already stop');
	}
	this.isStop = true;
	setImmediate(cb);
}

module.exports = JobMySqlShardLoad;