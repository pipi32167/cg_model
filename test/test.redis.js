'use strict';

var _ = require('underscore');
var assert = require('assert');
var async = require('async');
var CGModel = require('../lib');

require('./init');
require('./models');

describe('lib/data/data_redis', function() {
  beforeEach(function(done) {
    CGModel.getModel('Item3').cache.conn.flushall(done);
  })
  describe('Instance methods', function() {
    it('should create an item success', function(done) {
      var Item3 = CGModel.getModel('Item3');
      var item = new Item3();
      var id = 1;
      var itemId = 100;
      item.p({
        id: id,
        itemId: itemId,
      });
      async.series({
        create: function(cb) {
          item.create(function(err) {
            assert.ok(!err, err);
            assert.ok(item.cache.isSaved);
            assert.ok(item.mem.isLoaded);
            cb();
          });
        },

        load: function(cb) {
          var item = new Item3();
          item.id = id;
          item.load(function(err) {
            assert.ok(!err, err);
            assert.ok(item.cache.isSaved);
            assert.ok(item.mem.isLoaded);
            assert.equal(item.itemId, itemId);
            cb();
          })
        },

        update: function(cb) {
          item.itemId = 101;
          item.isLock = true;
          item.desc = 'testtesttest';
          item.updateTime = new Date();
          item.properties1.test = 1;
          item.properties2.push(1);
          item.update(cb);
        },

        checkUpdate: function(cb) {

          var item2 = new Item3();
          item2.id = id;
          item2.load(function(err) {
            assert.ok(!err, err);
            assert.ok(item2.cache.isSaved);
            assert.ok(item2.mem.isLoaded);
            assert.deepEqual(item.itemId, item2.itemId);
            assert.deepEqual(item.isLock, item2.isLock);
            assert.deepEqual(item.desc, item2.desc);
            assert.deepEqual(Math.floor(item.updateTime/1000), Math.floor(item2.updateTime/1000));
            assert.deepEqual(item.properties1, item2.properties1);
            assert.deepEqual(item.properties2, item2.properties2);

            cb();
          });
        },

        remove: function(cb) {
          var item = new Item3();
          item.id = id;
          item.remove(function(err) {
            assert.ok(!err, err);
            assert.ok(!item.cache.isSaved);
            assert.ok(!item.mem.isLoaded);
            cb();
          })
        },

        check: function(cb) {
          var item = new Item3();
          item.id = id;
          item.load(function(err) {
            assert.ok(!err, err);
            assert.ok(!item.cache.isSaved);
            assert.ok(!item.mem.isLoaded);
            cb();
          })
        },
      }, function(err) {
        assert.ok(!err, err);
        done();
      })
    });

    it('should update an item success', function(done) {
      var Item3 = CGModel.getModel('Item3');

      var item = new Item3();
      var id = 1;
      var itemId = 100;
      item.p({
        id: id,
        itemId: itemId,
      });
      item.create(function(err) {
        assert.ok(!err, err);
        assert.ok(item.cache.isSaved);
        assert.ok(item.mem.isLoaded);
        item.update(function(err) {
          assert.ok(!err, err);
          done();
        });
      });
    });

    it('should create many items success', function(done) {
      var Item3 = CGModel.getModel('Item3');
      var ids = _.range(1, 10);
      var itemId = 100;
      async.series({
        create: function(cb) {
          async.eachSeries(
            ids,
            function(id, cb) {
              var item = new Item3();
              item.id = id;
              item.itemId = itemId;
              console.log(item.p());
              item.create(function(err) {
                assert.ok(!err, err);
                assert.ok(item.cache.isSaved);
                assert.ok(item.mem.isLoaded);
                cb();
              });
            },
            cb);
        },

        load: function(cb) {
          async.eachSeries(
            ids,
            function(id, cb) {
              var item = new Item3();
              item.id = id;
              item.load(function(err) {
                assert.ok(!err, err);
                assert.ok(item.cache.isSaved);
                assert.ok(item.mem.isLoaded);
                assert.equal(item.itemId, itemId);
                cb();
              });
            },
            cb);
        },

        remove: function(cb) {
          async.eachSeries(
            ids,
            function(id, cb) {
              var item = new Item3();
              item.id = id;
              item.remove(function(err) {
                assert.ok(!err, err);
                assert.ok(!item.cache.isSaved);
                assert.ok(!item.mem.isLoaded);
                cb();
              });
            },
            cb);
        },

        check: function(cb) {
          async.eachSeries(
            ids,
            function(id, cb) {
              var item = new Item3();
              item.id = id;
              item.load(function(err) {
                assert.ok(!err, err);
                assert.ok(!item.cache.isSaved);
                assert.ok(!item.mem.isLoaded);
                cb();
              });
            },
            cb);
        },
      }, function(err) {
        assert.ok(!err, err);
        done();
      })
    });
  });
});