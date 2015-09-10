'use strict';

var sqlFormat = require('mysql').format;
var async = require('async');
var consts = require('../consts');
var util = require('util');
var JobMySqlUpdate = require('./job_mysql_update');
var lib = require('../index');

var JobMySqlCreate = function(args) {
  JobMySqlUpdate.call(this, args);
}

util.inherits(JobMySqlCreate, JobMySqlUpdate);

module.exports = JobMySqlCreate;