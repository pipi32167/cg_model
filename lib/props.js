'use strict';
var _ = require('underscore');
var assert = require('assert');
var utils = require('./utils');
var pro = module.exports;

pro.getPrimaryKeys = function() {
  return utils.getPrimaryKeys(this.def);
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