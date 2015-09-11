/**
 * 测试批量查询数据
 */

'use strict';
var async = require('async');
var assert = require('assert');
var fs = require('fs');
var CGModel = require('../lib');
var benchmark = require('./benchmark');
require('./init');

// CGModel.debug_mode.sql = true;

var dbName = 'cg_model_benchmark';
var LoadObjectModel = CGModel.getModel('LoadObject');
var LoadObjectShardModel = CGModel.getModel('LoadObjectShard');

var COUNT = 2000;

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

    createData: function(cb) {
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
  }, done);
}

var after = function(done) {
  async.series({
    // dropDB: function(cb) {
    //   var sql = fs.readFileSync(__dirname + '/sql/dropDB.sql', 'utf8');
    //   CGModel.getDBClient(dbName).query(sql, cb);
    // },

    stop: function(cb) {
      CGModel.stop(cb);
    }
  }, done);
}


var loadOneByOne = function(cb) {
  async.times(
    COUNT,
    function(idx, cb) {
      var loadObj = new LoadObjectModel();
      loadObj.objId = idx + 1;
      loadObj.load(cb);
    },
    cb);
}

var loadBatch = function(cb) {
  var objs = [];
  var loadObj;
  for (var i = 0; i < COUNT; i++) {
    loadObj = new LoadObjectModel();
    loadObj.objId = i + 1;
    objs.push(loadObj);
  }

  async.each(objs, function(elem, cb) {
    elem.load(cb);
  }, cb);
}

var loadBatchShard = function(cb) {
  var objs = [];
  var loadObj;
  for (var i = 0; i < COUNT; i++) {
    loadObj = new LoadObjectShardModel();
    loadObj.objId = i + 1;
    objs.push(loadObj);
  }

  async.each(objs, function(elem, cb) {
    elem.load(cb);
  }, cb);
}


benchmark.runAsync({

  before: before,

  after: after,

  tests: {

    loadOneByOne: {
      name: 'loadOneByOne',

      fn: loadOneByOne,
    },

    loadBatch: {
      name: 'loadBatch',

      fn: loadBatch,
    },

    loadBatchShard: {
      name: 'loadBatchShard',

      fn: loadBatchShard,
    },
  }
});