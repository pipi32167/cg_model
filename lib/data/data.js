'use strict';
var assert = require('assert');

var Data = function(model, conn) {
  this.model = model;
  this.conn = conn;
  this.props = {};
  var prop;
  var props = model.props;
  for (prop in props) {
    if (props.hasOwnProperty(prop)) {
      this.props[prop] = undefined;
    }
  }
}

Data.test = 'test';

Data.prototype.p = function(key, value) {
  var typeOfKey = typeof key;
  assert.ok(typeOfKey === 'undefined' ||
    typeOfKey === 'string' ||
    typeOfKey === 'object', key);

  if (typeOfKey === 'undefined') {
    return this.props;
  }

  if (typeOfKey === 'string') {
    if (value === undefined) {
      return this.props[key];
    } else {
      this.props[key] = value;
    }
  } else {
    var props = key;
    for (key in this.model.def.props) {
      if (props.hasOwnProperty(key)) {
        this.p(key, props[key]);
      }
    }
  }
}

module.exports = Data;