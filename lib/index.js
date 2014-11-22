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

exp.logger = log.getLogger(exp.debug_mode);

exp.createModel = function(def) {

  assert.ok(!models[def.name]);

  var Model = models[def.name] = function() {
    this.logger = exp.logger;
    this.def = def;
    this.mem = new DataMem(this);
    this.db = new DataDB(this, clients.db);
    this.cache = new DataCache(this, clients.cache);
    this.p = this.mem.p.bind(this.mem);
  };

  var DataMem = Model.mem = Data.factory(consts.DataType.MEMORY)(Model);
  var DataDB = Model.db = Data.factory(def.db.type)(Model, clients.db);
  var DataCache = Model.cache = Data.factory(def.cache.type)(Model, clients.cache);

  assert.ok(!!DataMem);
  assert.ok(!!DataDB);
  assert.ok(!!DataCache);

  Model.logger = exp.logger;
  Model.def = def;

  _(Model).extend(Static);
  _(Model).extend(Props);
  _(Model.prototype).extend(Crud);
  _(Model.prototype).extend(Props);

  Model.prototype.toJSON = function() {
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