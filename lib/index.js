'use strict';
var async = require('async');
var _ = require('underscore');
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

lib.createModel = require('./modelFactory')(lib);

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