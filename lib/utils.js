'use strict';
require('date-utils');
var assert = require('assert');
var _ = require('underscore');
var _s = require('underscore.string');
var consts = require('./consts');
var PropType = consts.PropType;

var exp = module.exports;

exp.typeOf = function(value) {
  var type = typeof value;
  switch (type) {
    case 'object':
      if (_.isDate(value)) {
        return 'date';
      }
      if (_.isArray(value)) {
        return 'array';
      }
      if (_.isNull(value)) {
        return 'null';
      }
      return 'object';
    default:
      return type;
  }
}

exp.typeOfPropValue = function(value) {
  var type = typeof value;
  switch (type) {
    case 'object':
      if (_.isDate(value)) {
        return PropType.DATE;
      }
      if (_.isArray(value)) {
        return PropType.ARRAY;
      }
      return PropType.OBJECT;
    case 'boolean':
      return PropType.BOOL;
    case 'string':
      return PropType.STRING;
    case 'number':
      return PropType.NUMBER;
  }
}

exp.isValidPropType = function(type) {
  return _(PropType).contains(type);
}

exp.checkPropValueType = function(prop, type, value) {

  if (!exp.isValidPropType(type)) {
    assert.ok(false, 'unsupported type:' + type);
  }

  if (exp.typeOfPropValue(value) !== type) {
    var err = _s.sprintf('property[%s] expect type[%s], but got type[%s]:%s',
      prop, type, typeof value, value);
    assert.ok(false, err);
  }
}