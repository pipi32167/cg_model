'use strict';
var _ = require('underscore');
var assert = require('assert');
var async = require('async');
var CGModel = require('../lib');
// var utils = require('../lib/utils');
// var consts = require('../lib/consts');
require('./redisTTLInit');
require('./redisTTLModels');

describe('lib/data/data_redis_ttl', function() {

	beforeEach(function(done) {

		async.parallel({

			remove1: function(cb) {

				var User = CGModel.getModel('UserTTL');
				User.removeAll(function(err) {
					assert.ok(!err, err);
					cb();
				});
			},

		}, function(err) {
			assert.ok(!err, err);
			done();
		})
	});

	describe('create', function() {

		it('should create a user and expire in 100 ms success', function(done) {

			var User = CGModel.getModel('UserTTL');

			var user = new User();

			async.series({

				create: function(cb) {
					user.create(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				check: function(cb) {
					var user2 = new User();
					user2.userId = user.userId;
					user2.cache.load(function(err) {
						assert.ok(!err, err);
						assert.ok(user2.cache.isSaved);
						cb();
					});
				},

				check2: function(cb) {
					setTimeout(function() {
						var user2 = new User();
						user2.userId = user.userId;
						user2.cache.load(function(err) {
							assert.ok(!err, err);
							assert.ok(!user2.cache.isSaved);
							cb();
						});
					}, 100);
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('update', function() {

		it('should update a user and expire in 100 ms success', function(done) {

			var User = CGModel.getModel('UserTTL');

			var user = new User();

			async.series({

				create: function(cb) {
					user.create(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				check: function(cb) {
					var user2 = new User();
					user2.userId = user.userId;
					user2.cache.load(function(err) {
						assert.ok(!err, err);
						assert.ok(user2.cache.isSaved);
						cb();
					});
				},

				check2: function(cb) {
					setTimeout(function() {
						var user2 = new User();
						user2.userId = user.userId;
						user2.cache.load(function(err) {
							assert.ok(!err, err);
							assert.ok(!user2.cache.isSaved);
							cb();
						});
					}, 100);
				},

				update: function(cb) {
					user.money ++;
					user.update(cb);
				},

				check3: function(cb) {
					var user2 = new User();
					user2.userId = user.userId;
					user2.cache.load(function(err) {
						assert.ok(!err, err);
						assert.ok(user2.cache.isSaved);
						assert.equal(user2.cache.p('money'), user.money);
						cb();
					});
				},

				check4: function(cb) {
					setTimeout(function() {
						var user2 = new User();
						user2.userId = user.userId;
						user2.cache.load(function(err) {
							assert.ok(!err, err);
							assert.ok(!user2.cache.isSaved);
							cb();
						});
					}, 100);
				},

			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});
});