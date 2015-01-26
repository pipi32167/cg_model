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

var cronJobs = {};
lib.startCronJob = function(type) {
  assert.ok(!!type);
  if (cronJobs[type]) {
    lib.logger.error('start cron job error: already started', type);
    return;
  }

  lib.logger.debug('start cron job:', type);

  if (type === DataType.MYSQL_LATE) {
    require('./data/data_mysql_late').startCronJob();
    cronJobs[type] = true;
    lib.logger.debug('start cron job success:', type);
  }

  if (type === DataType.MYSQL_SHARD) {
    require('./data/data_mysql_shard').startCronJob();
    cronJobs[type] = true;
    lib.logger.debug('start cron job success:', type);
  }
}

lib.stopCronJob = function(type, cb) {
  assert.ok(!!type);
  if (!cronJobs[type]) {
    lib.logger.error('stop cron job error: already stopped', type);
    cb();
    return;
  }
  lib.logger.debug('stop cron job:', type);

  if (type === DataType.MYSQL_LATE) {
    require('./data/data_mysql_late').stopCronJob(function(err) {
      if (!!err) {

        lib.logger.error('stop cron job error: ', err, type);

      } else {

        cronJobs[type] = false;
        lib.logger.debug('stop cron job success: ', type);
      }
      cb(err);
    });
  }

  if (type === DataType.MYSQL_SHARD) {
    require('./data/data_mysql_shard').stopCronJob(function(err) {
      if (!!err) {

        lib.logger.error('stop cron job error: ', err, type);

      } else {

        cronJobs[type] = false;
        lib.logger.debug('stop cron job success: ', type);
      }
      cb(err);
    });
  }
}

lib.restartCronJob = function(type, cb) {
  lib.stopCronJob(type, function() {
    lib.startCronJob(type);
    cb();
  });
}

lib.initialize = function(config) {
  lib.set('config', config);
  var key, value;
  for (key in config) {
    if (config.hasOwnProperty(key)) {
      value = config[key];
      lib.set(key, value);
    }
  }
  lib.initDebugMode(config.debug_mode);
  if (config[consts.DataType.MYSQL_SHARD]) {
    lib.initMysqlShardDBConn(config[consts.DataType.MYSQL_SHARD]);
  }
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
    shardCount = dbConfig.shard_count || config.shard_count || 0;
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

lib.start = function() {

  if (!!lib.get('config')[DataType.MYSQL_LATE]) {
    lib.startCronJob(DataType.MYSQL_LATE);
  }
}

lib.stop = function(cb) {

  async.auto({

    stopMySqlLateCronJob: function(cb) {
      if (!!lib.get('config')[DataType.MYSQL_LATE]) {
        lib.stopCronJob(DataType.MYSQL_LATE, cb);
      } else {
        cb();
      }
    },

    stopDBConnection: ['stopMySqlLateCronJob', function(cb) {
      var conns = lib.get('conns')[ConnType.DB];
      var prop;
      for (prop in conns) {
        if (conns.hasOwnProperty(prop)) {
          conns[prop].end();
        }
      }
      cb();
    }],

    stopCacheConnection: ['stopMySqlLateCronJob', function(cb) {
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