'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var exp = module.exports;

var DataClasses = {};

exp.add = function(DataClass) {
  assert.ok(!DataClasses[DataClass.__type__]);
  DataClasses[DataClass.__type__] = DataClass;
}

exp.get = function(type) {
  return DataClasses[type];
}

exp.factory = function(type) {
  var DataClass = DataClasses[type];
  assert.ok(!!DataClass, 'invalid Data Class:' + type);
  return DataClass;
}

fs.readdirSync(__dirname).forEach(function(elem) {
  if (!/data_\w+/.test(elem)) {
    return;
  }
  var filePath = path.join(__dirname, elem);
  exp.add(require(filePath));
});