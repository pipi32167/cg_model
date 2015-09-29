'use strict';

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

JobMySqlUpdate.prototype.runTransaction = function(args, cb) {

  var conn = args.conn,
    batchJobs = args.batchJobs,
    failJobs = args.failJobs,
    batchQuery = args.batchQuery,
    versions = args.versions;

  var self = this;

  var pool;

  var results;

  async.series({

    getConnection: function(cb) {
      if (conn.beginTransaction instanceof(Function)) {
        cb();
        return;
      }
      pool = conn;
      pool.getConnection(function(err, res) {
        if (!!err) {
          lib.logger.error('Job.runTransaction getConnection error:', err);
          cb(err);
          return;
        }
        conn = res;
        cb();
      });
    },

    beginTransaction: function(cb) {

      conn.beginTransaction(function(err) {
        if (!!err) {
          lib.logger.error('Job.runTransaction beginTransaction error:', err);
        }
        cb(err);
      })
    },

    query: function(cb) {

      var q = conn.query(
        batchQuery.text,
        batchQuery.values,
        function(err, res) {
          // console.log(err, res);
          if (!!err) {
            lib.logger.error('Job.runTransaction query error:',
              err, require('mysql').format(q.sql, q.values));
            cb(err);
            return;
          }
          lib.logger.debug('Job.runTransaction success');
          results = res;
          cb();
        });

      lib.logger.debugSql(q);
    },

    commit: function(cb) {
      conn.commit(cb);
    },

  }, function(err) {

    if (pool) {
      conn.release();
    }

    if (!!err) {
      batchJobs.forEach(function(elem) {
        failJobs.push(elem);
      });

      conn.rollback(function(err) {
        if (!!err) {
          lib.logger.error('Job.runTransaction rollback error;', err);
        }
        cb();
      });
      return;
    }

    var elem;
    for (var i = 0; i < batchJobs.length; i++) {
      elem = batchJobs[i];
      if (elem.isRemoved) {
        continue;
      }

      try {
        if (elem.isSaved) {
          elem.afterUpdateSuccess(versions[elem.__id]);
          elem.emit(self.doneEvent);
        } else {
          if (batchJobs.length === 1) {
            elem.afterCreateSuccess(results, versions[elem.__id]);
          } else {
            elem.afterCreateSuccess(results[i], versions[elem.__id]);
          }
          elem.emit(self.doneEvent);
        }
      } catch (e) {
        lib.logger.error(e.stack);
        elem.emit(self.doneEvent, e);
      }
    }
    cb();
  });
}

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
    function whileFunc(cb) {
      var batchJobs = [];
      var queries = [];
      var job, query, i, j;
      var ids = {};
      var versions = {};

      var runJobCount = self.jobs.length < batchCount ? self.jobs.length : batchCount;
      for (i = 0; i < runJobCount; i++) {
        job = self.jobs[i];
        if (!job.model || job.model.isRemoved || ids[job.__id]) {
          continue;
        }
        query = self.createQuery(job);
        if (!!query) {
          ids[job.__id] = true;
          versions[job.__id] = job.model.mem.__version;
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

      self.jobs = self.jobs.slice(runJobCount);
      if (batchQuery.values.length === 0) {
        setImmediate(cb);
        return;
      }

      self.runTransaction({
        conn: batchJobs[0].conn,
        batchJobs: batchJobs,
        failJobs: failJobs,
        batchQuery: batchQuery,
        versions: versions,
      }, cb);
    },
    function() {

      //try to update again
      async.eachSeries(
        failJobs,
        function(elem, cb) {
          elem.updateSync(function(err) {
            elem.emit(self.doneEvent, err);
            cb();
          });
        },
        function() {
          self.isRunning = false;
        });

    });
}


module.exports = JobMySqlUpdate;