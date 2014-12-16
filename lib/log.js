'use strict';
var assert = require('assert');
var consts = require('./consts');
var sqlFormat = require('mysql').format;

var Logger = function(opt) {
  this.opt = opt || {};
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
  if (this.opt.debug_mode[consts.DebugType.INFO]) {
    this.__logger.debug.apply(this.__logger, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
  }
}

Logger.prototype.debugSql = function(q) {
  if (this.opt.debug_mode[consts.DebugType.SQL]) {
    var sql = sqlFormat(q.sql, q.values);
    this.__logger.debug('[cg_model] SQL:', sql);
  }
}

var logger = new Logger();

module.exports.getLogger = function(opt, innerLogger) {
  logger.opt = opt;
  logger.__logger = innerLogger || logger.__logger;
  assert.ok(!!logger.__logger);
  return logger;
}