'use strict';
var util = require('util');
var consts = require('../consts');
var JobMySqlCreate = require('./job_mysql_create');

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

}

JobMySqlShardCreate.prototype.stop = function(cb) {
	cb();
}


module.exports = JobMySqlShardCreate;