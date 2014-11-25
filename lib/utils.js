'use strict';
require('date-utils');
var _ = require('underscore');

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