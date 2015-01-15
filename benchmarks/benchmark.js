/**
 * 测试批量查询数据
 */

'use strict';
var async = require('async');
var _ = require('underscore');

var emptyCB = function(cb) {
  cb();
}

var runTest = function(before, after, test, cb) {
  var name, fn;
  if (_.isFunction(test)) {
    name = '';
    fn = test;
  } else if (_.isObject(test)) {
    name = test.name;
    fn = test.fn;
  }
  async.series({
    before: before,

    test: function(cb) {
      var now = Date.now();
      console.log(name, 'start');
      fn(function(err) {
        if (!err) {
          console.log(name, 'stop, cost', Date.now() - now, 'ms');
        }
        cb(err);
      });
    },

    after: after,
  }, cb);
}

var runAsync = function(args, cb) {

  var tests;

  var before, after, beforeEach, afterEach;

  if (_.isArray(args.tests)) {
    tests = args.tests;
  } else if (_.isObject(args.tests)) {
    tests = _(args.tests).values();
  }

  before = args.before || emptyCB;
  after = args.after || emptyCB;
  beforeEach = args.beforeEach || emptyCB;
  afterEach = args.afterEach || emptyCB;

  async.series({
    before: before,

    runTests: function(cb) {

      async.eachSeries(
        tests,
        runTest.bind(null, beforeEach, afterEach),
        cb);
    },

    after: after,

  }, cb);
}

module.exports = {
  runAsync: runAsync,
}