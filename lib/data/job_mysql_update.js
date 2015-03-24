'use strict';

var sqlFormat = require('mysql').format;
var async = require('async');
var consts = require('../consts');
var util = require('util');
var Job = require('./job');
var lib = require('../index');

var JobMySqlUpdate = function(args) {
  Job.call(this, args);

  this.batchCount = args.batchCount;
  this.doneEvent = args.doneEvent;
}

util.inherits(JobMySqlUpdate, Job);


JobMySqlUpdate.prototype.run = function() {
  // lib.logger.debug('Job.run', this.jobs.length, this.isRunning);
  var self = this;
  if (this.jobs.length === 0 || this.isRunning) {
    return;
  }
  this.isRunning = true;

  var batchCount = this.batchCount || consts.DEFAULT_BATCH_COUNT;
  var failJobs = [];
  async.whilst(
    function() {
      return self.jobs.length > 0;
    },
    function(cb) {
      var batchJobs = [];
      var queries = [];
      var job, query, i, j;
      var ids = {};

      var runJobCount = self.jobs.length < batchCount ? self.jobs.length : batchCount;
      for (i = 0; i < runJobCount; i++) {
        job = self.jobs[i];
        if (job.isRemoved || ids[job.__id]) {
          continue;
        }
        query = self.createQuery(job);
        if (!!query) {
          ids[job.__id] = true;
          batchJobs.push(job);
          queries.push(query);
        }
      }

      var batchQuery = {
        text: '',
        values: [],
      };

      for (i = 0; i < queries.length; i++) {
        query = queries[i];
        batchQuery.text += query.text + ';';
        for (j = 0; j < query.values.length; j++) {
          batchQuery.values.push(query.values[j]);
        };
      };

      if (batchQuery.values.length === 0) {
        self.jobs = self.jobs.slice(runJobCount);
        setImmediate(cb);
        return;
      }

      var q = batchJobs[0].conn.query(batchQuery.text, batchQuery.values, function(err, results) {
        if (!!err) {
          lib.logger.error('Job.run error:', err, sqlFormat(q.sql, q.values));
          batchJobs.forEach(function(elem) {
            failJobs.push(elem);
          });
        } else {
          lib.logger.debug('Job.run success');
          var elem;
          for (var i = 0; i < batchJobs.length; i++) {
            elem = batchJobs[i];
            if (elem.isRemoved) {
              continue;
            }

            try {
              if (elem.isSaved) {
                elem.afterUpdateSuccess();
                elem.emit(self.doneEvent);
              } else {
                if (batchJobs.length === 1) {
                  elem.afterCreateSuccess(results);
                } else {
                  elem.afterCreateSuccess(results[i]);
                }
                elem.emit(self.doneEvent);
              }
            } catch (e) {
              lib.logger.error(e.stack);
              elem.emit(self.doneEvent, e);
            }
          }
        }

        // total += batchJobs.length;
        self.jobs = self.jobs.slice(runJobCount);
        setImmediate(cb);
      });

      lib.logger.debugSql(q);
    },
    function() {
      self.isRunning = false;
      // self.jobs = self.jobs.concat(failJobs);
      // console.log(total);

      //try to update again
      async.each(
        failJobs,
        function(elem, cb) {
          elem.updateSync(function(err) {
            elem.emit(self.doneEvent, err);
            cb();
          });
        },
        function() {

        });

    });
}


module.exports = JobMySqlUpdate;