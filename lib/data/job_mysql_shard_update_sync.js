'use strict';
var util = require('util');
var consts = require('../consts');
var JobMySqlUpdate = require('./job_mysql_update');
var lib = require('../index');

var JobMySqlShardUpdateSync = function() {
	JobMySqlUpdate.call(this, {
		doneEvent: consts.Event.UPDATED,
	});

	var self = this;
	setInterval(function() {
		self.run();
	}, consts.DEFAULT_BATCH_UPDATE_SYNC_INTERVAL);
}

util.inherits(JobMySqlShardUpdateSync, JobMySqlUpdate);

JobMySqlShardUpdateSync.prototype.createQuery = function(job) {
	return job.createCreateQuery();
}

JobMySqlShardUpdateSync.prototype.start = function() {
	lib.logger.debugJob('job[' + this.id + '] start');
	if (!this.isStop) {
		lib.logger.debugJob('job[' + this.id + '] already start');
		return;
	}
	this.isStop = false;
}

JobMySqlShardUpdateSync.prototype.stop = function(cb) {
	lib.logger.debugJob('job[' + this.id + '] stop');
	if (this.isStop) {
		lib.logger.debugJob('job[' + this.id + '] already stop');
	}
	this.isStop = true;
	setImmediate(cb);
}


module.exports = JobMySqlShardUpdateSync;