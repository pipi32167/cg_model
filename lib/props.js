'use strict';
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