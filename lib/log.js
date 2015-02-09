'use strict';
var assert = require('assert');
var _ = require('underscore');
var consts = require('./consts');
var sqlFormat = require('mysql').format;

var Logger = function(lib) {
  this.lib = lib || {};
  this.__logger = {
    info: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.log.bind(console),
  };
}

Logger.prototype.info = function() {
  this.__logger.log.apply(this.__logger, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
}

Logger.prototype.warn = function() {
  this.__logger.warn.apply(this.__logger, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
}

Logger.prototype.error = function() {
  this.__logger.error.apply(this.__logger, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
}

Logger.prototype.debug = function() {
  if (this.lib.debug_mode[consts.DebugType.INFO]) {
    this.__logger.debug.apply(this.__logger, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
  }
}

Logger.prototype.debugSql = function(q) {
  if (this.lib.debug_mode[consts.DebugType.SQL]) {
    var sql = sqlFormat(q.sql, q.values);
    this.__logger.debug('[cg_model] SQL:', sql);
  }
}

Logger.prototype.debugRedis = function() {
  if (this.lib.debug_mode[consts.DebugType.REDIS]) {
    var args = _(arguments)
      .chain()
      .values()
      .flatten()
      .value();
    this.__logger.debug.apply(null, ['[cg_model] REDIS:'].concat(args));
  }
}

var logger = new Logger();

module.exports.getLogger = function(lib, innerLogger) {
  logger.lib = lib;
  logger.__logger = innerLogger || logger.__logger;
  assert.ok(!!logger.__logger);
  return logger;
}