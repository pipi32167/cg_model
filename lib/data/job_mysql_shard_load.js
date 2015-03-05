'use strict';
var util = require('util');
var consts = require('../consts');
var JobMySqlLoad = require('./job_mysql_load');

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

}

JobMySqlShardLoad.prototype.stop = function(cb) {
	cb();
}

module.exports = JobMySqlShardLoad;