'use strict';
var _ = require('underscore');
var async = require('async');
var EventEmitter = require('events').EventEmitter;

var Data = function(lib, model, connType) {
  EventEmitter.call(this);
  this.model = model;
  this.connType = connType;
  this.__id = _.uniqueId();
  this.__version = 0;
}

// util.inherits(Data, EventEmitter);
_.extend(Data.prototype, EventEmitter.prototype);

Data.prototype.init = function() {
  this.__version = 0;
  this.isLoaded = true;
  this.isSaved = true;
}

/**
 * Deprecated, use isNeedUpdate
 */
Data.prototype.isModified = function() {
  if (!this.model || this.model.isRemoved) {
    return false;
  }
  return this.model.mem.__version !== this.__version;
}

Data.prototype.isNeedUpdate = function() {
  if (!this.model || this.model.isRemoved) {
    return false;
  }
  return this.model.mem.__version !== this.__version;
}

Data.prototype.updateVersion = function(version) {
  if (!this.model || this.model.isRemoved) {
    return;
  }

  if (version !== undefined) {
    this.__version = version;
  } else {
    this.__version = this.model.mem.__version;
  }
}

Data.prototype.incrVersion = function() {
  this.__version++;
}

Data.prototype.upgrade = function(data, cb) {
  data.__version = data.__version && parseInt(data.__version, 10) || 0;
  var def = this.model.def;
  if (def.version === undefined ||
    !def.upgradeFns ||
    data.__version >= def.version) {
    cb(null, data);
    return;
  }

  var fns = [];
  for (var i = data.__version + 1; i <= def.version; i++) {
    if (def.upgradeFns[i] instanceof(Function)) {
      fns.push(def.upgradeFns[i]);
    }
  }
  var self = this;
  async.eachSeries(fns, function(fn, cb) {
    fn.call(self.model, data, function(err) {
      if (!err) {
        self.model.incrVersion();
      }
      cb(err);
    });
  }, function(err) {
    cb(err, data);
  });
}

Data.prototype.dispose = function() {
  this.model = null;
  this.removeAllListeners();
}

module.exports = require('bluebird').promisifyAll(Data);