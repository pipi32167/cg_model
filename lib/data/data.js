'use strict';
var _s = require('underscore.string');
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var utils = require('../utils');

var Data = function(lib, model, connType) {
  EventEmitter.call(this);
  this.lib = lib;
  this.model = model;
  this.connType = connType;
  this.props = {};
  var prop;
  var props = model.props;
  for (prop in props) {
    if (props.hasOwnProperty(prop)) {
      this.props[prop] = undefined;
    }
  }
  this.isRemoved = false;
  this.__id = _.uniqueId();
  this.__version = 0;
}

// util.inherits(Data, EventEmitter);
_.extend(Data.prototype, EventEmitter.prototype);

Data.prototype.init = function(data) {
  this.p(data);
  this.__version = 0;
  this.isLoaded = true;
  this.isSaved = true;
}

/**
 * set or get properies, usage:
 * 1. set single key:     p('key', value)                   -> undefined
 * 2. set multiple keys:  p({ key1: value1, key2: value2 }) -> undefined
 * 3. get single key:     p('key')                          -> { key: value }
 * 4. get multiple keys:  p(['key1', 'key2'])               -> { key1: value1, key2: value2 }
 * 5. get all keys:       p()                               -> { key1: value1, key2: value2, ... }
 * @param  {Undefined|String|Object|Array}  key
 * @param  {AnyType}                        value
 * @return {Undefined|Object}
 */
Data.prototype.p = function(key, value) {
  if (this.isRemoved) {
    return;
  }
  var typeOfKey = utils.typeOf(key);
  assert.ok(typeOfKey === 'undefined' ||
    typeOfKey === 'string' ||
    typeOfKey === 'array' ||
    typeOfKey === 'object', key);

  // get all keys
  if (typeOfKey === 'undefined') {
    return this.props;
  }

  // get multiple keys
  if (typeOfKey === 'array') {
    return _(this.props).pick(key);
  }

  if (typeOfKey === 'string') {
    // get single key
    if (value === undefined) {
      return this.props[key];
    } else {
      if (this.props[key] !== undefined &&
        !_.isEqual(this.props[key], value) &&
        this.model.def.props[key].primary) {
        var err = _s.sprintf('[%s] primary key should not be changed:%s, original value:[%s], now value:[%s]', this.model.def.name, key, this.props[key], value);
        assert.ok(false, err);
      }
      // set single key 
      this.props[key] = utils.clonePropValue(value);
    }
    return;
  }

  // set multiple keys
  var props = key;
  for (key in this.model.def.props) {
    if (props.hasOwnProperty(key)) {
      this.p(key, props[key]);
    }
  }
}

Data.prototype.isModified = function() {
  return this.model.mem.__version !== this.__version;
}

Data.prototype.updateVersion = function() {
  this.__version = this.model.mem.__version;
}

Data.prototype.incrVersion = function() {
  this.__version++;
}


Data.prototype.dispose = function() {
  this.model = null;
  this.lib = null;
  this.props = null;
  this.isRemoved = true;
  this.removeAllListeners();
}

module.exports = Data;