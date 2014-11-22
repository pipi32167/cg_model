'use strict';
var assert = require('assert');

var exp = module.exports;

var DataClasses = {};

exp.add = function (DataClass) {
  assert.ok(!DataClasses[DataClass.__type__]);
  DataClasses[DataClass.__type__] = DataClass;
}

exp.get = function (type) {
  return DataClasses[type];
}

exp.factory = function (type, model, conn) {
  var DataClass = DataClasses[type];
  assert.ok(!!DataClass, 'invalid Data Class:' + type);
  return new DataClass(model, conn);
}

exp.add(require('./data_memory'));
exp.add(require('./data_mysql'));
exp.add(require('./data_redis'));