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

exp.checkPropValueType = function(modelName, prop, type, value) {

  var err;
  if (!exp.isValidPropType(type)) {
    err = _s.sprintf('model[%s] property[%s] unsupported type:%s',
      modelName, prop, type, exp.typeOfPropValue(value), value);
    assert.ok(false, err);
  }

  if (exp.typeOfPropValue(value) !== type) {
    err = _s.sprintf('model[%s] property[%s] expect type[%s], but got type[%s]:%s',
      modelName, prop, type, exp.typeOfPropValue(value), value);
    assert.ok(false, err);
  }
}

exp.emptyCB = function() {

}

exp.invokeCB = function(cb) {
  if (!!cb) {
    if (typeof cb !== 'function') {
      assert.ok(false, 'param cb expect function: ' + cb);
    };

    cb.apply(null, Array.prototype.slice.call(arguments, 1));
  }
};

exp.clonePropValue = function(value) {
  var type = exp.typeOfPropValue(value);
  switch (type) {
    case PropType.DATE:
      return new Date(value.getTime() - value.getMilliseconds());
    case PropType.ARRAY:
    case PropType.OBJECT:
      return _.clone(value);
    case PropType.STRING:
    case PropType.NUMBER:
    case PropType.BOOL:
      return value;
  }
}

exp.getPrimaryKeys = function(def) {
  var keys = [];
  var props = def.props;
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