'use strict';
var _ = require('underscore');
var assert = require('assert');
var async = require('async');
var CGModel = require('../lib');
// var utils = require('../lib/utils');
// var consts = require('../lib/consts');
require('./mysqlShardInit');
require('./mysqlShardModels');

beforeEach(function(done) {
	CGModel.startCronJob('mysql_late')
	done();
});

afterEach(function(done) {
	CGModel.stopCronJob('mysql_late', done);
});


describe('lib/data/data_mysql_shard', function() {

	beforeEach(function(done) {
		var User = CGModel.getModel('User');
		User.removeAll(function(err) {
			assert.ok(!err, err);
			done();
		});
	});

	describe('createSync', function() {

		it('should create user success', function(done) {
			var User = CGModel.getModel('User');

			var user = new User();
			user.createSync(function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('create', function() {
		it('should create user success', function(done) {
			var User = CGModel.getModel('User2');
			var user = new User();
			user.userId = 1;
			user.db.on('updated', function(err) {
				assert.ok(!err, err);
				done();
			});
			user.create(function(err) {
				assert.ok(!err, err);
			});
		});

		it('should create many users success', function(done) {

			var userIds = _.range(1, 11);
			var User = CGModel.getModel('User2');

			async.map(
				userIds,
				function(userId, cb) {

					var user = new User();
					user.userId = userId;
					user.db.on('updated', function(err) {
						assert.ok(!err, err);
						cb();
					});

					user.create(function(err) {
						assert.ok(!err, err);
					});
				},
				function(err) {
					assert.ok(!err, err);
					done();
				})
		});
	});

	describe('updateSync', function() {
		it('should update user success', function(done) {
			var User = CGModel.getModel('User');

			var user = new User();

			async.series({
				create: function(cb) {
					user.createSync(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				update: function(cb) {
					user.money++;
					user.updateSync(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('update', function() {
		it('should update user success', function(done) {
			var User = CGModel.getModel('User');

			var user = new User();

			async.series({
				create: function(cb) {
					user.createSync(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				update: function(cb) {
					user.money++;
					user.db.on('updated', function(err) {
						assert.ok(!err, err);
						assert.ok(user.db.isSaved);
						cb();
					})
					user.update(function(err) {
						assert.ok(!err, err);
					})
				},

				check: function(cb) {
					var user2 = new User();
					user2.userId = user.userId;
					user2.load(function(err) {
						assert.ok(!err, err);
						assert.ok(user2.mem.isLoaded);
						assert.equal(user2.money, user.money);
						cb();
					});
				},

				removeFromCache: function(cb) {
					var user2 = new User();
					user2.userId = user.userId;
					user2.cache.remove(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				checkInDB: function(cb) {
					var user2 = new User();
					user2.userId = user.userId;
					user2.load(function(err) {
						assert.ok(!err, err);
						assert.ok(user2.mem.isLoaded);
						assert.equal(user2.money, user.money);
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});

		it('should update many users success', function(done) {
			var count = 10;
			var User = CGModel.getModel('User');
			var users = _(1)
				.chain()
				.range(count)
				.map(function() {
					var user = new User();
					return user;
				})
				.value();

			async.series({
				create: function(cb) {

					async.each(
						users,
						function(user, cb) {
							user.db.once('updated', function(err) {
								assert.ok(!err, err);
								assert.ok(user.mem.isLoaded);
								cb();
							});

							user.create(function(err) {
								assert.ok(!err, err);
							})
						}, cb);
				},

				update: function(cb) {

					async.each(
						users,
						function(user, cb) {

							user.money++;
							user.db.once('updated', function(err) {
								assert.ok(!err, err);
								cb();
							})
							user.update(function(err) {
								assert.ok(!err, err);
							});
						}, cb);
				},

				check: function(cb) {
					async.each(
						users,
						function(user, cb) {
							var user2 = new User();
							user2.userId = user.userId;
							user2.load(function(err) {
								assert.ok(!err, err);
								assert.equal(user2.money, user.money);
								cb();
							})
						}, cb);
				},

				removeFromCache: function(cb) {
					async.each(
						users,
						function(user, cb) {
							var user2 = new User();
							user2.userId = user.userId;
							user2.cache.remove(function(err) {
								assert.ok(!err, err);
								cb();
							})
						}, cb);
				},

				checkInDB: function(cb) {
					async.each(
						users,
						function(user, cb) {
							var user2 = new User();
							user2.userId = user.userId;
							user2.load(function(err) {
								assert.ok(!err, err);
								assert.equal(user2.money, user.money);
								cb();
							})
						}, cb);
				},

			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('load', function() {
		it('should load user success', function(done) {
			var User = CGModel.getModel('User');

			var user = new User();
			var user2;

			async.series({
				create: function(cb) {
					user.createSync(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				update: function(cb) {
					user.money++;
					user.updateSync(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				load: function(cb) {
					user2 = new User();
					user2.userId = user.userId;
					user2.load(function(err) {
						assert.ok(!err, err);
						assert.ok(user2.mem.isLoaded);
						assert.equal(user.money, user2.money);
						cb();
					});
				},

				removeFromCache: function(cb) {
					user2.cache.remove(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				loadFromDB: function(cb) {
					user2 = new User();
					user2.userId = user.userId;
					user2.load(function(err) {
						assert.ok(!err, err);
						assert.ok(user2.mem.isLoaded);
						assert.equal(user.money, user2.money);
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('remove', function() {
		it('should remove user success', function(done) {
			var User = CGModel.getModel('User');

			var user = new User();
			var user2;

			async.series({
				create: function(cb) {
					user.createSync(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				remove: function(cb) {
					user2 = new User();
					user2.userId = user.userId;
					user2.remove(function(err) {
						assert.ok(!err, err);
						assert.ok(!user2.mem.isLoaded);
						cb();
					});
				},

				check: function(cb) {
					user2 = new User();
					user2.userId = user.userId;
					user2.load(function(err) {
						assert.ok(!err, err);
						assert.ok(!user2.mem.isLoaded);
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

		it('should find user success', function(done) {
			var User = CGModel.getModel('User');

			var user = new User();
			async.series({
				create: function(cb) {
					user.create(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				find: function(cb) {
					User.find({
						userId: user.userId
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should find users success', function(done) {
			var User = CGModel.getModel('User');

			var count = 10;
			var users = [];
			_.times(count, function() {
				users.push(new User());
			})
			async.series({
				create: function(cb) {

					async.each(
						users,
						function(user, cb) {
							user.db.once('updated', function(err) {
								assert.ok(!err, err);
								cb();
							});
							user.create(function(err) {
								assert.ok(!err, err);
							});
						}, cb);
				},

				find: function(cb) {
					var userIds = _(users).map(function(elem) {
						return elem.userId;
					});
					User.find({
						userId: userIds
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, userIds.length);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should find no user success', function(done) {
			var User = CGModel.getModel('User');
			User.find({
				userId: -1
			}, function(err, res) {
				assert.ok(!err, err);
				assert.equal(res.length, 0);
				done();
			})
		});
	});

	describe('static remove', function() {

		it('should remove user success', function(done) {
			var User = CGModel.getModel('User');

			var user = new User();
			async.series({
				create: function(cb) {
					user.create(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				remove: function(cb) {
					User.remove({
						userId: user.userId
					}, function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				check: function(cb) {
					User.find({
						userId: user.userId
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 0);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should remove users success', function(done) {
			var User = CGModel.getModel('User');

			var count = 10;
			var users = [];
			_.times(count, function() {
				users.push(new User());
			})
			async.series({
				create: function(cb) {

					async.each(
						users,
						function(user, cb) {
							user.db.once('updated', function(err) {
								assert.ok(!err, err);
								cb();
							});
							user.create(function(err) {
								assert.ok(!err, err);
							});
						}, cb);
				},

				remove: function(cb) {
					var userIds = _(users).map(function(elem) {
						return elem.userId;
					});
					User.remove({
						userId: userIds
					}, function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				find: function(cb) {
					var userIds = _(users).map(function(elem) {
						return elem.userId;
					});
					User.find({
						userId: userIds
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 0);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

	});

	describe('static remove all', function() {

		it('should remove all users success', function(done) {
			var User = CGModel.getModel('User');

			var count = 10;
			var users = [];
			_.times(count, function() {
				users.push(new User());
			})
			async.series({
				create: function(cb) {

					async.each(
						users,
						function(user, cb) {
							user.db.once('updated', function(err) {
								assert.ok(!err, err);
								cb();
							});
							user.create(function(err) {
								assert.ok(!err, err);
							});
						}, cb);
				},

				remove: function(cb) {
					User.removeAll(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				find: function(cb) {
					var userIds = _(users).map(function(elem) {
						return elem.userId;
					});
					User.find({
						userId: userIds
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 0);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('static count', function() {

		it('should count user success', function(done) {
			var User = CGModel.getModel('User');

			var user = new User();
			async.series({
				create: function(cb) {
					user.create(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				count: function(cb) {
					User.count({
						userId: user.userId
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, 1);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should count users success', function(done) {
			var User = CGModel.getModel('User');

			var count = 10;
			var users = [];
			_.times(count, function() {
				users.push(new User());
			})
			async.series({
				create: function(cb) {

					async.each(
						users,
						function(user, cb) {
							user.db.once('updated', function(err) {
								assert.ok(!err, err);
								cb();
							});
							user.create(function(err) {
								assert.ok(!err, err);
							});
						}, cb);
				},

				count: function(cb) {
					var userIds = _(users).map(function(elem) {
						return elem.userId;
					});
					User.count({
						userId: userIds
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, userIds.length);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should count no user success', function(done) {
			var User = CGModel.getModel('User');
			User.count({
				userId: -1
			}, function(err, res) {
				assert.ok(!err, err);
				assert.equal(res, 0);
				done();
			})
		});
	});

	describe('static countAll', function() {

		it('should count users success', function(done) {
			var User = CGModel.getModel('User');

			var count = 10;
			var users = [];
			_.times(count, function() {
				users.push(new User());
			})
			async.series({
				create: function(cb) {

					async.each(
						users,
						function(user, cb) {
							user.db.once('updated', function(err) {
								assert.ok(!err, err);
								cb();
							});
							user.create(function(err) {
								assert.ok(!err, err);
							});
						}, cb);
				},

				count: function(cb) {
					var userIds = _(users).map(function(elem) {
						return elem.userId;
					});
					User.countAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, userIds.length);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should count no user success', function(done) {
			var User = CGModel.getModel('User');
			User.countAll(function(err, res) {
				assert.ok(!err, err);
				assert.equal(res, 0);
				done();
			})
		});
	});
});