'use strict';
var async = require('async');
var _ = require('underscore');
var assert = require('assert');
var Data = require('./data');
var Crud = require('./crud');
var Props = require('./props');
var Static = require('./static');
var consts = require('./consts');
var log = require('./log');

var DataType = consts.DataType;
var ConnType = consts.ConnType;

var models = {};

var exp = module.exports;

exp.debug_mode = false;

exp.logger = log.getLogger(exp);

exp.createModel = function(def) {

  assert.ok(!models[def.name], 'Model name already exists:' + def.name);

  var Model = models[def.name] = function() {
    var mem = new DataMem(exp, this);
    var db = new DataDB(exp, this);
    var cache = new DataCache(exp, this);
    var readOnly = {
      logger: exp.logger,
      def: def,
      mem: mem,
      db: db,
      cache: cache,
      p: mem.p.bind(mem),
    };
    var self = this;
    var prop;
    for (prop in readOnly) {
      if (readOnly.hasOwnProperty(prop)) {
        (function(prop) {
          assert.deepEqual(self[prop], undefined, prop);
          Object.defineProperty(self, prop, {
            get: function() {
              return readOnly[prop];
            },
          });
        })(prop);
      }
    }

    var props = def.props;
    for (prop in props) {
      if (props.hasOwnProperty(prop)) {
        (function(prop) {
          assert.deepEqual(self[prop], undefined, prop);
          Object.defineProperty(self, prop, {
            get: function() {
              return self.p(prop);
            },
            set: function(value) {
              self.p(prop, value);
            }
          });
        })(prop);
      }
    }
  };

  Model.CGModel = exp;
  Model.logger = exp.logger;
  Model.def = def;

  _(Model).extend(Static);
  _(Model).extend(Props);
  _(Model.prototype).extend(Crud);
  _(Model.prototype).extend(Props);

  var DataMem = Model.mem = Data.factory(DataType.MEMORY)(exp, Model);
  var DataDB = Model.db = Data.factory(def.db.type)(exp, Model, ConnType.DB);
  var DataCache = Model.cache = Data.factory(def.cache.type)(exp, Model, ConnType.CACHE);
  assert.ok(!!DataMem);
  assert.ok(!!DataDB);
  assert.ok(!!DataCache);

  Model.prototype.toModelJSON = function() {
    return {
      mem: this.mem.props,
      db: this.db.props,
      cache: this.cache.props,
    }
  }

  return Model;
}

exp.setDBClient = function(name, dbClient) {
  var conns = exp.get('conns');
  if (!conns) {
    conns = {};
    exp.set('conns', conns);
  }

  if (!conns[ConnType.DB]) {
    conns[ConnType.DB] = {};
  }

  conns[ConnType.DB][name] = dbClient;
}

exp.setCacheClient = function(name, cacheClient) {
  var conns = exp.get('conns');
  if (!conns) {
    conns = {};
    exp.set('conns', conns);
  }

  if (!conns[ConnType.CACHE]) {
    conns[ConnType.CACHE] = {};
  }

  conns[ConnType.CACHE][name] = cacheClient;
}

exp.setLogger = function(logger) {
  exp.logger = log.getLogger(exp, logger);
  exp.set('logger', logger);
}

exp.getModel = function(name) {
  return models[name];
}

var settings = {};

exp.get = function(key) {
  return settings[key];
}

exp.set = function(key, value) {
  settings[key] = value;
  return settings[key];
}

var cronJobs = {};
exp.startCronJob = function(type) {
  assert.ok(!!type);
  if (cronJobs[type]) {
    exp.logger.error('start cron job error: already started', type);
    return;
  }

  exp.logger.debug('start cron job:', type);

  if (type === DataType.MYSQL_LATE) {
    require('./data/data_mysql_late').startCronJob();
    cronJobs[type] = true;
    exp.logger.debug('start cron job success:', type);
  }
}

exp.stopCronJob = function(type, cb) {
  assert.ok(!!type);
  if (!cronJobs[type]) {
    exp.logger.error('stop cron job error: already stopped', type);
    cb();
    return;
  }
  exp.logger.debug('stop cron job:', type);

  if (type === DataType.MYSQL_LATE) {
    require('./data/data_mysql_late').stopCronJob(function(err) {
      if (!!err) {

        exp.logger.error('stop cron job error: ', err, type);

      } else {

        cronJobs[type] = false;
        exp.logger.debug('stop cron job success: ', type);
      }
      cb(err);
    });
  }
}

exp.restartCronJob = function(type, cb) {
  exp.stopCronJob(type, function() {
    exp.startCronJob(type);
    cb();
  });
}

exp.initialize = function(config) {
  exp.set('config', config);
  var key, value;
  for (key in config) {
    if (config.hasOwnProperty(key)) {
      value = config[key];
      exp.set(key, value);
    }
  }
}

exp.start = function() {

  if (!!exp.get('config')[DataType.MYSQL_LATE]) {
    exp.startCronJob(DataType.MYSQL_LATE);
  }
}

exp.stop = function(cb) {

  async.auto({

    stopMySqlLateCronJob: function(cb) {
      if (!!exp.get('config')[DataType.MYSQL_LATE]) {
        exp.stopCronJob(DataType.MYSQL_LATE, cb);
      } else {
        cb();
      }
    },

    stopDBConnection: ['stopMySqlLateCronJob', function(cb) {
      var conns = exp.get('conns')[ConnType.DB];
      var prop;
      for (prop in conns) {
        if (conns.hasOwnProperty(prop)) {
          conns[prop].end();
        }
      }
      cb();
    }],

    stopCacheConnection: ['stopMySqlLateCronJob', function(cb) {
      var conns = exp.get('conns')[ConnType.CACHE];
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