'use strict';
var async = require('async');
var _ = require('underscore');
var _s = require('underscore.string');
var assert = require('assert');
var consts = require('./consts');
var log = require('./log');
var utils = require('./utils');

var DataType = consts.DataType;
var ConnType = consts.ConnType;


var lib = module.exports;

lib.models = {};

lib.debug_mode = {};

lib.logger = log.getLogger(lib);

lib.createModel = require('./model_factory')(lib);

lib.Bucket = require('./bucket');

lib.setDBClient = function(name, dbClient) {
  var conns = lib.get('conns');
  if (!conns) {
    conns = {};
    lib.set('conns', conns);
  }

  if (!conns[ConnType.DB]) {
    conns[ConnType.DB] = {};
  }

  conns[ConnType.DB][name] = dbClient;
}

lib.getDBClient = function(name) {
  var conns = lib.get('conns');
  return conns && conns[ConnType.DB] && conns[ConnType.DB][name];
}

lib.setCacheClient = function(name, cacheClient) {
  var conns = lib.get('conns');
  if (!conns) {
    conns = {};
    lib.set('conns', conns);
  }

  if (!conns[ConnType.CACHE]) {
    conns[ConnType.CACHE] = {};
  }

  conns[ConnType.CACHE][name] = cacheClient;
}

lib.getCacheClient = function(name) {
  var conns = lib.get('conns');
  return conns && conns[ConnType.CACHE] && conns[ConnType.CACHE][name];
}

lib.setLogger = function(logger) {
  lib.logger = log.getLogger(lib, logger);
  lib.set('logger', logger);
}

lib.getModel = function(name) {
  return lib.models[name];
}

var settings = {};

lib.get = function(key) {
  return settings[key];
}

lib.set = function(key, value) {
  settings[key] = value;
  return settings[key];
}

lib.clearSettings = function() {
  settings = {};
}

lib.initialize = function(config) {
  lib.set('config', config);
  var key, value;
  for (key in config) {
    value = config[key];
    lib.set(key, value);
  }
  lib.initDebugMode(config.debug_mode);
  if (!!config[DataType.MYSQL_SHARD]) {
    lib.initMysqlShardDBConn(config[DataType.MYSQL_SHARD]);
  }

  lib.initJobs(config);
}

lib.initDebugMode = function(debug_mode) {
  var type = utils.typeOf(debug_mode)
  switch (type) {
    case 'object':
      lib.debug_mode = debug_mode;
      break;
    case 'array':
      debug_mode.forEach(function(elem) {
        lib.debug_mode[elem] = true;
      });
      break;
    case 'boolean':
      if (debug_mode) {
        _(consts.DebugType).values().forEach(function(elem) {
          lib.debug_mode[elem] = true;
        })
      }
      break;
  }
}


/**
 * Configurate the shard databases' connection.
 * By default, every shard database has its own connection and the name of the connection is the same with the name of the shard database.
 * Just use the main database only if the shard count has been specified to 0.
 * @param  {[type]} config [description]
 * @return {[type]}        [description]
 */
lib.initMysqlShardDBConn = function(config) {

  var conn;
  var shardCount, connName, dbConfig, dbName;
  var shardMainDBName, shardDBNameFormat, shardDBNames;
  var res = {};
  for (dbName in config.database) {
    dbConfig = config.database[dbName];
    if (dbConfig.shard_count !== undefined) {
      shardCount = dbConfig.shard_count;
    } else if (config.shard_count !== undefined) {
      shardCount = config.shard_count;
    } else {
      shardCount = 0;
    }
    // assert.ok(shardCount !== undefined, 'please specified the shard count: ' + dbName);
    shardMainDBName = dbConfig.main_db;
    assert.ok(shardMainDBName, 'please specified the main db name: ' + dbName);

    shardDBNames = [shardMainDBName];

    if (shardCount > 0) {
      shardDBNameFormat = dbConfig.shard_db_format;
      assert.ok(shardDBNameFormat, 'please specified the shard db name format: ' + dbName);
      shardDBNames = shardDBNames.concat(
        _(0)
        .chain()
        .range(shardCount)
        .map(function(elem) {
          return _s.sprintf(shardDBNameFormat, elem);
        })
        .value()
      );
    }
    // console.log(shardDBNames);

    if (dbConfig.connection) {

      for (connName in dbConfig.connection) {
        conn = lib.getDBClient(connName);
        dbConfig.connection[connName].forEach(function(elem) {
          if (shardDBNames.indexOf(elem) < 0) {
            return;
          }
          assert.ok(!!conn, 'you have specified an inexistsent connection: ' + connName);
          // res[elem] = connName;
          res[elem] = conn;
        });
      }
    } else {

      shardDBNames.forEach(function(connName) {
        conn = lib.getDBClient(connName);
        assert.ok(!!conn, 'you have specified an inexistsent connection: ' + connName);
        res[connName] = conn;
      });
    }

    shardDBNames.forEach(function(elem) {
      assert.ok(!!res[elem], 'please configurate the shard db\'s connection: ' + elem);
    });
  }

  lib.set(consts.MYSQL_SHARD_DB, res);
}

lib.getMysqlShardDBConn = function(dbName) {

  var res = lib.get(consts.MYSQL_SHARD_DB);
  return res[dbName];
}

/**
 * Jobs
 */

lib.initJobs = function(config) {
  var conns, connName, jobName;
  if (!!config[DataType.MYSQL_SHARD]) {
    conns = lib.get(consts.MYSQL_SHARD_DB);
    assert.ok(!!conns, 'please call initMysqlShardDBConn');
    var JobMySqlShardUpdate = require('./data/job_mysql_shard_update');
    var JobMySqlShardLoad = require('./data/job_mysql_shard_load');

    for (connName in conns) {
      jobName = utils.getJobName(DataType.MYSQL_SHARD, connName, 'load');
      lib.setJob(jobName, new JobMySqlShardLoad());
      jobName = utils.getJobName(DataType.MYSQL_SHARD, connName, 'update');
      lib.setJob(jobName, new JobMySqlShardUpdate(config[DataType.MYSQL_SHARD].cron, config[DataType.MYSQL_SHARD].batchCount));
    }
  }

  if (!!config[DataType.MYSQL_LATE]) {
    conns = lib.get('conns')[ConnType.DB];

    var JobMySqlLateUpdate = require('./data/job_mysql_late_update');
    for (connName in conns) {
      jobName = utils.getJobName(DataType.MYSQL_LATE, connName, 'update');
      lib.setJob(jobName, new JobMySqlLateUpdate(config[DataType.MYSQL_LATE].cron, config[DataType.MYSQL_LATE].batchCount));
    }
  }
}

lib.getJob = function(name) {
  return lib.get(consts.RESERVED.JOBS)[name];
}

lib.setJob = function(name, job) {
  var jobs = lib.get(consts.RESERVED.JOBS);
  if (!jobs) {
    jobs = {};
    lib.set(consts.RESERVED.JOBS, jobs);
  }
  jobs[name] = job;
}

lib.startJobs = function() {
  var jobs = lib.get(consts.RESERVED.JOBS);
  var job;
  for (var name in jobs) {
    job = jobs[name];
    job.start();
  }
}

lib.stopJobs = function(cb) {
  var jobs = lib.get(consts.RESERVED.JOBS);
  async.each(
    _(jobs).values(),
    function(job, cb) {
      job.stop(cb);
    },
    cb);
}

lib.restartJobs = function(cb) {
  lib.stopJobs(function() {
    lib.startJobs();
    cb();
  })
}

lib.start = function() {

  lib.startJobs();
}

lib.stop = function(cb) {

  async.auto({

    stopJobs: function(cb) {

      lib.stopJobs(cb);
    },

    stopDBConnection: ['stopJobs', function(cb) {
      var conns = lib.get('conns')[ConnType.DB];
      var prop;
      for (prop in conns) {
        if (conns.hasOwnProperty(prop)) {
          conns[prop].end();
        }
      }
      cb();
    }],

    stopCacheConnection: ['stopJobs', function(cb) {
      var conns = lib.get('conns')[ConnType.CACHE];
      var prop;
      for (prop in conns) {
        if (conns.hasOwnProperty(prop)) {
          conns[prop].end();
        }
      }
      cb();
    }],
  }, cb);
}