'use strict';
var _ = require('underscore');
var assert = require('assert');
var async = require('async');
require('./init')();
var model = require('../lib');

var User = model.createModel({
  name: 'User',

  props: {
    userId: {
      type: 'number',
      primary: true,
      defaultValue: function(cb) {
        var sql = 'call gen_userId(1)';
        this.db.conn.query(sql, [], function(err, res) {
          if (!!err) {
            cb(err);
            return;
          }
          cb(null, res[0][0].id);
        });
      }
    },
    name: {
      type: 'string',
      unique: true,
      defaultValue: function(cb) {
        cb(null, 'test' + this.p('userId'));
      }

    },
    registerTime: {
      type: 'date',
      defaultValue: function(cb) {
        cb(null, new Date());
      }
    },
  },

  db: {
    type: 'mysql',
    tbl_name: 'user',
  },

  cache: {
    type: 'redis',
    name: 'user',
    prefix: 'test',
  },
});

var helper = {};
helper.createUsers = function(count, cb) {
  var res = [];
  async.timesSeries(
    count,
    function(idx, cb) {
      var user = new User();
      user.create(function(err) {
        assert.ok(!err, err);
        res.push(user);
        cb();
      });
    },
    function(err) {
      assert.ok(!err, err);
      cb(null, res);
    });
}

describe('Model', function() {
  beforeEach(function(done) {
    User.removeAll(function(err) {
      assert.ok(!err, err);
      done();
    });
  });
  describe('static methods', function() {
    it('should remove all data from db and cache', function(done) {
      User.removeAll(function(err) {
        assert.ok(!err, err);
        done();
      })
    });

    it('should find no users success', function(done) {
      User.find({
        userId: 1
      }, function(err, res) {
        assert.ok(!err);
        assert.equal(res.length, 0);
        done();
      });
    });

    it('should find a user success', function(done) {
      var userId, name;
      async.series({

        createUser: function(cb) {
          var user = new User();
          user.create(function(err) {
            assert.ok(!err, err);
            userId = user.p('userId');
            name = user.p('name');
            cb();
          });
        },

        findUserByUserId: function(cb) {
          User.find({
            userId: userId
          }, function(err, res) {
            assert.ok(!err, err);
            assert.equal(res.length, 1);
            assert.equal(res[0].p('userId'), userId);
            assert.equal(res[0].p('name'), name);
            cb();
          });
        },

        findUserByName: function(cb) {
          User.find({
            name: name
          }, function(err, res) {

            assert.ok(!err, err);
            assert.equal(res.length, 1);
            assert.equal(res[0].p('userId'), userId);
            assert.equal(res[0].p('name'), name);
            cb();
          })
        }

      }, function(err) {
        assert.ok(!err, err);
        done();
      })
    });

    it('should find many users success', function(done) {

      var count = 5;
      var users;
      async.series({

        createUsers: function(cb) {
          helper.createUsers(count, function(err, res) {
            assert.ok(!err, err);
            users = res;
            cb();
          });
        },

        findUserByUserId: function(cb) {
          var tbl_user = User.db.queryBuilder;
          var inArgs = _(users).map(function(elem) {
            return elem.p('userId');
          });
          var query = tbl_user.where(tbl_user.userId.in(inArgs)).toQuery('mysql');
          User.find(query, function(err, res) {
            assert.ok(!err, err);
            assert.equal(res.length, count);
            cb();
          });
        },

        findUserByName: function(cb) {
          var tbl_user = User.db.queryBuilder;
          var inArgs = _(users).map(function(elem) {
            return elem.p('name');
          });
          var query = tbl_user.where(tbl_user.name.in(inArgs)).toQuery('mysql');
          User.find(query, function(err, res) {
            assert.ok(!err, err);
            assert.equal(res.length, count);
            cb();
          });
        }

      }, function(err) {
        assert.ok(!err, err);
        done();
      })
    });
  });

  describe('instance methods', function() {

    it('should create a new user success', function(done) {

      var userId;

      async.series({
        create: function(cb) {

          var user = new User();
          user.create(function(err) {
            assert.ok(!err, err);
            userId = user.p('userId');
            assert.ok(user.mem.isLoaded);
            assert.ok(user.db.isSaved);
            assert.ok(user.cache.isSaved);
            cb();
          });
        },

        load: function(cb) {

          var user = new User();
          user.p('userId', userId);
          user.load(function(err) {
            assert.ok(!err, err);
            assert.ok(user.mem.isLoaded);
            assert.ok(user.db.isSaved);
            assert.ok(user.cache.isSaved);
            cb();
          });
        }
      }, function(err) {
        assert.ok(!err, err);
        done();
      });
    });

    it('should create a new user and remove it success', function(done) {

      var userId;

      async.series({
        create: function(cb) {

          var user = new User();
          user.create(function(err) {
            assert.ok(!err, err);
            userId = user.p('userId');
            assert.ok(user.mem.isLoaded);
            assert.ok(user.db.isSaved);
            assert.ok(user.cache.isSaved);
            cb();
          });
        },

        remove: function(cb) {
          var user = new User();
          user.p('userId', userId);
          user.remove(function(err) {
            assert.ok(!err, err);
            assert.ok(!user.mem.isLoaded);
            assert.ok(!user.db.isSaved);
            assert.ok(!user.cache.isSaved);
            cb();
          });
        },

        load: function(cb) {

          var user = new User();
          user.p('userId', userId);
          user.load(function(err) {
            assert.ok(!err);
            assert.ok(!user.mem.isLoaded);
            assert.ok(!user.db.isSaved);
            assert.ok(!user.cache.isSaved);
            cb();
          });
        }
      }, function(err) {
        assert.ok(!err, err);
        done();
      });
    });

    it('should update user success', function(done) {

      var userId, user;

      async.series({
        create: function(cb) {

          user = new User();
          user.create(function(err) {
            assert.ok(!err, err);
            userId = user.p('userId');
            assert.ok(user.mem.isLoaded);
            assert.ok(user.db.isSaved);
            assert.ok(user.cache.isSaved);
            cb();
          });
        },

        update: function(cb) {
          user.p('name', '0' + user.p('name'));
          user.update(function(err) {
            assert.ok(!err, err);
            cb();
          });
        },

        check: function(cb) {
          var user2 = new User();
          user2.p('userId', userId);
          user2.load(function(err) {
            assert.ok(!err, err);
            assert.ok(user2.mem.isLoaded);
            assert.ok(user2.db.isSaved);
            assert.ok(user2.cache.isSaved);
            assert.equal(user2.p('name'), user.p('name'));
            cb();
          });
        }
      }, function(err) {
        assert.ok(!err, err);
        done();
      });

    });
  });

});