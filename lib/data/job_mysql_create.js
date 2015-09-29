'use strict';

var util = require('util');
var consts = require('../consts');
var JobMySqlUpdate = require('./job_mysql_update');
var lib = require('../index');

var JobMySqlCreate = function(args) {
  JobMySqlUpdate.call(this, args);
}

util.inherits(JobMySqlCreate, JobMySqlUpdate);

module.exports = JobMySqlCreate;