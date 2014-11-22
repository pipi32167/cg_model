'use strict';
require('date-utils');
var _ = require('underscore');

var exp = module.exports;

exp.typeCast = function (type, value) {
  switch (type) {
    case 'date':
    case 'time':
    case 'datetime':
    case 'timestamp':
      if (!_.isDate(value)) {
        value = new Date(value);
      } else {
        value = value;
      }
      value = value.toFormat('YYYY-MM-DD HH:MI:SS');
      break;
    case 'int':
    case 'integer':
      if (!_.isNumber(value)) {
        value = parseInt(value, 10);
      }
      break;
    case 'float':
      if (!_.isNumber(value)) {
        value = parseFloat(value);
      }
      break;
    case 'string':
      if (!_.isString(value)) {
        value = value.toString();
      }
      break;
  }

  return value;
}
