/**
 * 测试批量创建数据
 */

'use strict';
var async = require('async');
var fs = require('fs');
var CGModel = require('../lib');
var benchmark = require('./benchmark');
require('./init');

var dbName = 'cg_model_benchmark';
var LoadObjectModel = CGModel.getModel('LoadObject2');

var before = function(done) {
  CGModel.start();
  async.series({

    createDB: function(cb) {
      var sql = fs.readFileSync(__dirname + '/sql/createDB.sql', 'utf8');
      CGModel.getDBClient(dbName).query(sql, cb);
    },

    createTable: function(cb) {
      var sql = fs.readFileSync(__dirname + '/sql/load.sql', 'utf8');
      CGModel.getDBClient(dbName).query(sql, cb);
    },

  }, done);
}

var after = function(done) {
  async.series({

    stop: function(cb) {
      CGModel.stop(cb);
    }
  }, done);
}

var beforeEach = function(cb) {
  var sql = fs.readFileSync(__dirname + '/sql/load.sql', 'utf8');
  CGModel.getDBClient(dbName).query(sql, cb);
}

var COUNT = 1000;

var createOneByOne = function(cb) {

  async.timesSeries(
    COUNT,
    function(idx, cb) {
      var loadObj = new LoadObjectModel();
      loadObj.property1 = Math.floor(Math.random() * 1000);
      loadObj.property2 = loadObj.property1.toString();
      loadObj.create(cb);
    },
    cb);
}

var createBatch = function(cb) {
  // cb();
  var objs = [];
  var loadObj;
  for (var i = 0; i < COUNT; i++) {
    loadObj = new LoadObjectModel();
    loadObj.property1 = Math.floor(Math.random() * 1000);
    loadObj.property2 = loadObj.property1.toString();
    objs.push(loadObj);
  }

  objs[0].batchCreateSync(objs, function(err) {
    // if (!err) {
    //   objs.forEach(function(elem) {
    //     console.log(elem.toModelJSON());
    //   })
    // }
    cb(err);
  });
}

benchmark.runAsync({

  before: before,

  after: after,

  beforeEach: beforeEach,

  tests: {

    createOneByOne: {
      name: 'createOneByOne',

      fn: createOneByOne,
    },

    createBatch: {
      name: 'createBatch',

      fn: createBatch,
    },
  }
});