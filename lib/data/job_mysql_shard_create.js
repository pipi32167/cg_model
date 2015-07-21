'use strict';
var util = require('util');
var consts = require('../consts');
var JobMySqlCreate = require('./job_mysql_create');
var lib = require('../index');

var JobMySqlShardCreate = function() {
	JobMySqlCreate.call(this, {
		doneEvent: consts.Event.CREATED,
	});

	var self = this;
	setInterval(function() {
		self.run();
	}, consts.DEFAULT_BATCH_CREATE_INTERVAL);
}

util.inherits(JobMySqlShardCreate, JobMySqlCreate);

JobMySqlShardCreate.prototype.createQuery = function(job) {
	return job.createCreateQuery();
}

JobMySqlShardCreate.prototype.start = function() {
	lib.logger.debugJob('job[' + this.id + '] start');
	if (!this.isStop) {
		lib.logger.debugJob('job[' + this.id + '] already start');
		return;
	}
	this.isStop = false;
}

JobMySqlShardCreate.prototype.stop = function(cb) {
	lib.logger.debugJob('job[' + this.id + '] stop');
	if (this.isStop) {
		lib.logger.debugJob('job[' + this.id + '] already stop');
	}
	this.isStop = true;
	setImmediate(cb);
}


module.exports = JobMySqlShardCreate;