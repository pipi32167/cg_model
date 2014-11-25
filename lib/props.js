'use strict';
var _ = require('underscore');
var assert = require('assert');
var pro = module.exports;

pro.getPrimaryKeys = function() {
  var keys = [];
  var props = this.def.props;
  var prop;
  for (prop in props) {
    if (props.hasOwnProperty(prop) &&
      !!props[prop].primary) {
      keys.push(prop);
    }
  }
  assert.ok(keys.length > 0, 'you should define primary keys');
  return keys;
}

pro.getPrimaryKeysAndValues = function() {
  var res = {};
  var props = this.def.props;
  var prop;
  for (prop in props) {
    if (props.hasOwnProperty(prop) &&
      !!props[prop].primary) {
      res[prop] = this.p(prop);
    }
  }
  assert.ok(_(res).size() > 0, 'you should define primary keys');
  return res;
}

pro.getAllPropKeys = function() {
  return _(this.def.props).keys();
}

pro.getAllPropKeysAndValues = function() {
  var res = {};
  var props = this.def.props;
  var prop;
  for (prop in props) {
    if (props.hasOwnProperty(prop)) {
      res[prop] = this.p(prop);
    }
  }
  return res;
}