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
    this.mem = Data.factory(consts.DataType.MEMORY, this);
    this.db = Data.factory(def.db.type, this, clients.db);
    this.cache = Data.factory(def.cache.type, this, clients.cache);

    this.p = this.mem.p.bind(this.mem);
  };

  Model.logger = exp.logger;
  Model.def = def;

  _(Model).extend(Static);
  _(Model).extend(Props);
  _(Model.prototype).extend(Crud);
  _(Model.prototype).extend(Props);

  Model.mem = _({
    model: Model,
  }).extend(Data.get(consts.DataType.MEMORY));
  Model.db = _({
    conn: clients.db,
    model: Model,
  }).extend(Data.get(def.db.type));
  Model.cache = _({
    conn: clients.cache,
    model: Model,
  }).extend(Data.get(def.cache.type));

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