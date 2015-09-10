'use strict';
var _ = require('underscore');
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


Data.prototype.dispose = function() {
  this.model = null;
  this.removeAllListeners();
}

module.exports = require('bluebird').promisifyAll(Data);