'use strict';
// var EventEmitter = require('events').EventEmitter;
var _ = require('underscore');
var assert = require('assert');
var async = require('async');
var CGModel = require('../lib');

before(function(done) {
	require('./mongodbInit')(function(err) {
		assert.ok(!err, err);
		require('./mongodbModels');
		done();
	});
});

after(function(done) {
	CGModel.stop(function(err) {
		assert.ok(!err, err);
		done();
	})
});

beforeEach(function(done) {
	var modelNames = ['User'];
	async.each(modelNames, function(elem, cb) {
		var Model = CGModel.getModel(elem);
		Model.removeAll(cb);
	}, function(err) {
		assert.ok(!err, err);
		done();
	});
});

// var helper = require('./helper');

describe('lib/data/data_mongodb', function() {

	describe('create', function() {

		it('should create success', function(done) {

			var User = CGModel.getModel('User');
			var user = new User();

			user.create(function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should create many users success', function(done) {
			done();
		});
	});

	describe('load', function() {

		it('should load success', function(done) {

			var userId = 1;
			var User = CGModel.getModel('User');
			var user1, user2;

			async.series({
				create: function(cb) {
					user1 = new User();
					user1.userId = userId;
					user1.create(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				load: function(cb) {
					user2 = new User();
					user2.userId = userId;
					user2.load(function(err) {
						assert.ok(!err, err);
						assert.deepEqual(user2.p(), user1.p());
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('update', function() {
		it('should update success', function(done) {

			var userId = 1;
			var User = CGModel.getModel('User');
			var user1, user2;

			async.series({
				create: function(cb) {
					user1 = new User();
					user1.userId = userId;
					user1.create(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				update: function(cb) {
					user1.money++;
					user1.update(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				load: function(cb) {
					user2 = new User();
					user2.userId = userId;
					user2.load(function(err) {
						assert.ok(!err, err);
						assert.deepEqual(user2.p(), user1.p());
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('remove', function() {
		it('should remove success', function(done) {

			var userId = 1;
			var User = CGModel.getModel('User');
			var user1, user2;

			async.series({
				create: function(cb) {
					user1 = new User();
					user1.userId = userId;
					user1.create(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				remove: function(cb) {
					user1.remove(function(err) {
						assert.ok(!err, err);
						assert.ok(!user1.mem.isLoaded);
						assert.ok(!user1.db.isSaved);
						cb();
					})
				},

				load: function(cb) {
					user2 = new User();
					user2.userId = userId;
					user2.load(function(err) {
						assert.ok(!err, err);
						assert.ok(!user2.mem.isLoaded);
						assert.ok(!user2.db.isSaved);
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('static find', function() {
		it('should find success', function(done) {

			var userIds = _.range(1, 10);
			var User = CGModel.getModel('User');
			var users = [];

			async.series({
				create: function(cb) {

					async.each(userIds, function(userId, cb) {

						var user = new User();
						user.userId = userId;
						user.create(function(err) {
							assert.ok(!err, err);
							users.push(user);
							cb();
						});
					}, cb);
				},

				find: function(cb) {

					User.find({
						userId: userIds[0]
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						assert.equal(res[0].userId, userIds[0]);
						cb();
					});
				},


				findByLimit: function(cb) {

					User.find({
						$limit: 5,
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 5);
						// assert.equal(res[0].userId, userIds[0]);
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('static load', function() {
		it('should find success', function(done) {

			var userIds = _.range(1, 10);
			var User = CGModel.getModel('User');
			var users = [];

			async.series({
				create: function(cb) {

					async.each(userIds, function(userId, cb) {

						var user = new User();
						user.userId = userId;
						user.create(function(err) {
							assert.ok(!err, err);
							users.push(user);
							cb();
						});
					}, cb);
				},

				load: function(cb) {

					User.load({
						userId: userIds[0]
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						assert.equal(res[0].userId, userIds[0]);
						cb();
					});
				},


				loadByLimit: function(cb) {

					User.load({
						$limit: 5,
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 5);
						// assert.equal(res[0].userId, userIds[0]);
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('static remove', function() {
		it('should remove success', function(done) {

			var userId = 1;
			var User = CGModel.getModel('User');
			var user1, user2;

			async.series({
				create: function(cb) {
					user1 = new User();
					user1.userId = userId;
					user1.create(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				remove: function(cb) {
					User.remove({
						userId: userId
					}, function(err, res) {
						assert.ok(!err, err);
						cb();
					});
				},

				find: function(cb) {
					User.find({
						userId: userId
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 0);
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('static count', function() {
		it('should count success', function(done) {

			var userId = 1;
			var User = CGModel.getModel('User');
			var user1, user2;

			async.series({

				count1: function(cb) {
					User.count({
						userId: userId
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, 0);
						cb();
					});
				},

				create: function(cb) {
					user1 = new User();
					user1.userId = userId;
					user1.create(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				count2: function(cb) {
					User.count({
						userId: userId
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, 1);
						cb();
					});
				},

				remove: function(cb) {
					User.remove({
						userId: userId
					}, function(err, res) {
						assert.ok(!err, err);
						cb();
					});
				},

				count3: function(cb) {
					User.count({
						userId: userId
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, 0);
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	// describe('static load', function() {
	// 	it('should load success', function(done) {

	// 		var userId = 1;
	// 		var User = CGModel.getModel('User');
	// 		var user1, user2;

	// 		async.series({

	// 			count1: function(cb) {
	// 				User.load({
	// 					userId: userId
	// 				}, function(err, res) {
	// 					assert.ok(!err, err);
	// 					assert.equal(res, 0);
	// 					cb();
	// 				});
	// 			},

	// 			create: function(cb) {
	// 				user1 = new User();
	// 				user1.userId = userId;
	// 				user1.create(function(err) {
	// 					assert.ok(!err, err);
	// 					cb();
	// 				});
	// 			},

	// 			count2: function(cb) {
	// 				User.count({
	// 					userId: userId
	// 				}, function(err, res) {
	// 					assert.ok(!err, err);
	// 					assert.equal(res, 1);
	// 					cb();
	// 				});
	// 			},

	// 			remove: function(cb) {
	// 				User.remove({
	// 					userId: userId
	// 				}, function(err, res) {
	// 					assert.ok(!err, err);
	// 					cb();
	// 				});
	// 			},

	// 			count3: function(cb) {
	// 				User.count({
	// 					userId: userId
	// 				}, function(err, res) {
	// 					assert.ok(!err, err);
	// 					assert.equal(res, 0);
	// 					cb();
	// 				});
	// 			},
	// 		}, function(err) {
	// 			assert.ok(!err, err);
	// 			done();
	// 		})
	// 	});
	// });

	describe('upgrade data', function() {
		it('should upgrade data success', function(done) {

			async.series({
				createVersion0: function(cb) {
					var Record = CGModel.getModel('Record10');
					var record = new Record();
					record.id = 1;
					record.recordTime = new Date();
					record.create(cb);
				},

				loadByVersion2: function(cb) {
					var Record = CGModel.getModel('Record12');
					var record = new Record();
					record.id = 1;
					record.load(function(err) {
						assert.ok(!err, err);
						assert.ok(typeof record.recordTime === 'number');
						assert.ok(typeof record.propToBeDelete === 'undefined');
						assert.ok(typeof record.propAdd === 'number');
						record.incrVersion();
						record.update(cb);
					});
				},

				loadByVersion3: function(cb) {
					var Record = CGModel.getModel('Record13');
					var record = new Record();
					record.id = 1;
					record.load(function(err) {
						assert.ok(!err, err);
						assert.ok(record.propAdd instanceof Array);
						record.incrVersion();
						record.update(cb);
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});
});