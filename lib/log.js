'use strict';
var assert = require('assert');
var _ = require('underscore');
var consts = require('./consts');
var lib = require('./');

var Logger = function() {
  this.__logger = {
    info: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.log.bind(console),
    trace: console.trace.bind(console),
  };
  this.profileTags = {};
}

Logger.prototype.info = function() {
  this.__logger.info.apply(this.__logger, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
}

Logger.prototype.warn = function() {
  this.__logger.warn.apply(this.__logger, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
}

Logger.prototype.error = function() {
  this.__logger.error.apply(this.__logger, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
}

Logger.prototype.trace = function() {
  this.__logger.trace.apply(this.__logger, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
}

Logger.prototype.debug = function() {
  if (lib.debug_mode[consts.DebugType.INFO]) {
    this.__logger.debug.apply(this.__logger, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
  }
}

Logger.prototype.debugSql = function(q) {
  if (lib.debug_mode[consts.DebugType.SQL]) {
    var sql = require('mysql').format(q.sql, q.values);
    this.__logger.debug('[cg_model] SQL:', sql);
  }
}

Logger.prototype.debugRedis = function() {
  if (lib.debug_mode[consts.DebugType.REDIS]) {
    var args = _(arguments)
      .chain()
      .values()
      .flatten()
      .value();
    this.__logger.debug.apply(null, ['[cg_model] REDIS:'].concat(args));
  }
}

Logger.prototype.debugMongodb = function() {
  if (lib.debug_mode[consts.DebugType.MONGODB]) {
    var args = _(arguments)
      .chain()
      .values()
      .flatten()
      .value();
    this.__logger.debug.apply(null, ['[cg_model] MONGODB:'].concat(args));
  }
}

Logger.prototype.debugProfile = function(tag) {
  if (lib.debug_mode[consts.DebugType.PROFILE]) {
    this.profileTags[tag] = Date.now();
  }
}

Logger.prototype.debugProfileEnd = function(tag) {
  if (lib.debug_mode[consts.DebugType.PROFILE]) {
    if (!this.profileTags[tag]) {
      this.profileTags[tag] = Date.now();
    }
    var cost = Date.now() - this.profileTags[tag];
    this.__logger.debug('[cg_model] PROFILE:', tag, cost + 'ms');
  }
}

Logger.prototype.debugJob = function() {
  if (lib.debug_mode[consts.DebugType.JOB]) {
    var args = _(arguments)
      .chain()
      .values()
      .flatten()
      .value();
    this.__logger.debug.apply(null, ['[cg_model] JOB:'].concat(args));
  }
}

var logger = new Logger();

module.exports.getLogger = function(lib, innerLogger) {
  logger.lib = lib;
  logger.__logger = innerLogger || logger.__logger;
  assert.ok(!!logger.__logger);
  return logger;
}