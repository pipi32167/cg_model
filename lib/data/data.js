'use strict';
var _s = require('underscore.string');
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var utils = require('../utils');

var Data = function(app, model, connType) {
  EventEmitter.call(this);
  this.app = app;
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
}

util.inherits(Data, EventEmitter);

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
  var typeOfKey = utils.typeOf(key);
  assert.ok(typeOfKey === 'undefined' ||
    typeOfKey === 'string' ||
    typeOfKey === 'array' ||
    typeOfKey === 'object', key);

  if (typeOfKey === 'undefined') {
    return this.props;
  }

  if (typeOfKey === 'array') {
    return _(this.props).pick(key);
  }

  if (typeOfKey === 'string') {
    if (value === undefined) {
      return this.props[key];
    } else {
      if (this.props[key] !== undefined &&
        !_.isEqual(this.props[key], value) &&
        this.model.def.props[key].primary) {
        var err = _s.sprintf('[%s] primary key should not be changed:%s, original value:[%s], now value:[%s]', this.model.def.name, key, this.props[key], value);
        assert.ok(false, err);
      }
      this.props[key] = utils.clonePropValue(value);
    }
    return;
  }

  var props = key;
  for (key in this.model.def.props) {
    if (props.hasOwnProperty(key)) {
      this.p(key, props[key]);
    }
  }
}

Data.prototype.dispose = function() {
  this.model = null;
  this.app = null;
  this.props = null;
}

module.exports = Data;