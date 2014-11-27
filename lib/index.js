'use strict';
var _ = require('underscore');
var assert = require('assert');
var Data = require('./data');
var Crud = require('./crud');
var Props = require('./props');
var Static = require('./static');
var consts = require('./consts');
var log = require('./log');

var clients = {};
var models = {};

var exp = module.exports;

exp.debug_mode = false;

exp.logger = log.getLogger(exp);

exp.createModel = function(def) {

  assert.ok(!models[def.name], 'Model name already exists:' + def.name);

  var Model = models[def.name] = function() {
    this.logger = exp.logger;
    this.def = def;
    this.mem = new DataMem(this);
    this.db = new DataDB(this, clients.db);
    this.cache = new DataCache(this, clients.cache);
    this.p = this.mem.p.bind(this.mem);

    var self = this;
    var prop, props = def.props;
    for (prop in props) {
      if (props.hasOwnProperty(prop)) {
        (function(prop) {
          assert.deepEqual(self[prop], undefined);
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

  Model.logger = exp.logger;
  Model.def = def;

  _(Model).extend(Static);
  _(Model).extend(Props);
  _(Model.prototype).extend(Crud);
  _(Model.prototype).extend(Props);

  var DataMem = Model.mem = Data.factory(consts.DataType.MEMORY)(Model);
  var DataDB = Model.db = Data.factory(def.db.type)(Model, clients.db);
  var DataCache = Model.cache = Data.factory(def.cache.type)(Model, clients.cache);
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

exp.setDBClient = function(dbClient) {
  clients.db = dbClient;
}

exp.setCacheClient = function(cacheClient) {
  clients.cache = cacheClient;
}

exp.setLogger = function(logger) {
  exp.logger = logger;
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

  exp.logger.debug('start cron job:', type);

  if (type === consts.DataType.MYSQL_LATE) {
    assert.ok(!cronJobs[type], 'cron job[' + type + '] have started');
    cronJobs[type] = require('./data/data_mysql_late').startCronJob();
  }
}

exp.stopCronJob = function(type) {
  if (!cronJobs[type]) {
    exp.logger.debug('stop cron job: cannot find', type);
    return;
  }
  exp.logger.debug('stop cron job:', type);
  cronJobs[type].stop();
}

exp.initialize = function(config) {
  var key, value;
  for (key in config) {
    if (config.hasOwnProperty(key)) {
      value = config[key];
      exp.set(key, value);
    }
  }
}