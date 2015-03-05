'use strict';
var util = require('util');
var consts = require('../consts');
var JobMySqlUpdate = require('./job_mysql_update');

var JobMySqlShardUpdate = function(cron, batchCount) {
	JobMySqlUpdate.call(this, {
		cron: cron,
		doneEvent: consts.Event.UPDATED,
		batchCount: batchCount
	});
}

util.inherits(JobMySqlShardUpdate, JobMySqlUpdate);

JobMySqlShardUpdate.prototype.createQuery = function(job) {
	return job.createCreateQuery();
}

module.exports = JobMySqlShardUpdate;