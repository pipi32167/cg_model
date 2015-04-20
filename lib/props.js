'use strict';
var _ = require('underscore');
var assert = require('assert');
var utils = require('./utils');
var pro = module.exports;

var g_primaryKeys = {};
var g_propKeys = {};

var getPrimaryKeys = function(def) {
  var res = g_primaryKeys[def.name];
  if (!res) {
    res = g_primaryKeys[def.name] = utils.getPrimaryKeys(def);
  }
  return res;
}

var getPropKeys = function(def) {
  var res = g_propKeys[def.name];
  if (!res) {
    res = g_propKeys[def.name] = _(def.props).keys();
  }
  return res;
}

pro.getPrimaryKeys = function() {
  return getPrimaryKeys(this.def);
}

pro.getPrimaryKeysAndValues = function() {
  var res = {};
  var count = 0;
  var props = this.def.props;
  var prop;
  for (prop in props) {
    if (!!props[prop].primary) {
      res[prop] = this.p(prop);
      count++;
    }
  }
  assert.ok(count > 0, 'you should define primary keys');
  return res;
}

pro.getAllPropKeys = function() {

  return getPropKeys(this.def);
}

pro.getAllPropKeysAndValues = function() {
  var res = {};
  var props = this.def.props;
  var prop;
  for (prop in props) {
    res[prop] = this.p(prop);
  }
  return res;
}