/**
 * 测试批量创建数据
 */

'use strict';
var async = require('async');
var fs = require('fs');
var CGModel = require('../lib');
var benchmark = require('./benchmark');

CGModel.debug_mode.sql = true;

var dbName = 'cg_model_benchmark';
var LoadObjectModel;
var LoadObjectShardModel;
var LoadObjectMongodbModel;

var COUNT = 10;

var before = function(done) {
  CGModel.start();
  async.series({

    init: function(cb) {
      require('./init')(function(err) {
        if (!err) {
          LoadObjectModel = CGModel.getModel('LoadObject');
          LoadObjectShardModel = CGModel.getModel('LoadObjectShard');
          LoadObjectMongodbModel = CGModel.getModel('LoadObjectMongodb');
        }
        cb(err);
      });
    },

    createDB: function(cb) {
      var sql = fs.readFileSync(__dirname + '/sql/createDB.sql', 'utf8');
      CGModel.getDBClient(dbName).query(sql, cb);
    },

    createTable: function(cb) {
      var sql = fs.readFileSync(__dirname + '/sql/load.sql', 'utf8');
      CGModel.getDBClient(dbName).query(sql, cb);
    },

    start: function(cb) {
      CGModel.start();
      cb();
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

  async.each(objs, function(elem, cb) {
    elem.createSync(cb);
  }, cb);
}

var createBatchShard = function(cb) {
  // cb();
  var objs = [];
  var loadObj;
  for (var i = 0; i < COUNT; i++) {
    loadObj = new LoadObjectShardModel();
    loadObj.property1 = Math.floor(Math.random() * 1000);
    loadObj.property2 = loadObj.property1.toString();
    objs.push(loadObj);
  }

  async.each(objs, function(elem, cb) {
    elem.create(cb);
  }, cb);
}

var createBatchMongodb = function(cb) {
  // cb();
  var objs = [];
  var loadObj;
  for (var i = 0; i < COUNT; i++) {
    loadObj = new LoadObjectMongodbModel();
    loadObj.property1 = Math.floor(Math.random() * 1000);
    loadObj.property2 = loadObj.property1.toString();
    objs.push(loadObj);
  }

  async.each(objs, function(elem, cb) {
    elem.create(cb);
  }, cb);
}

benchmark.runAsync({

  before: before,

  after: after,

  beforeEach: beforeEach,

  tests: {

    // createOneByOne: {
    //   name: 'createOneByOne',

    //   fn: createOneByOne,
    // },

    // createBatch: {
    //   name: 'createBatch',

    //   fn: createBatch,
    // },

    // createBatchShard: {
    //   name: 'createBatchShard',

    //   fn: createBatchShard,
    // },

    createBatchMongodb: {
      name: 'createBatchMongodb',

      fn: createBatchMongodb,
    },
  }
});