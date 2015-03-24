'use strict';
require('cliff');
var _ = require('underscore');
var assert = require('assert');
var async = require('async');
var CGModel = require('../lib');
// var utils = require('../lib/utils');
// var consts = require('../lib/consts');
require('./mysqlShardInit');
require('./mysqlShardModels');

beforeEach(function(done) {
	CGModel.startJobs();
	done();
});

afterEach(function(done) {
	CGModel.stopJobs(done);
});


describe('lib/data/data_mysql_shard(shard n > 0)', function() {

	beforeEach(function(done) {

		async.parallel({

			remove1: function(cb) {

				var User = CGModel.getModel('UserShardSync');
				User.removeAll(function(err) {
					assert.ok(!err, err);
					cb();
				});
			},

			remove2: function(cb) {

				var Item = CGModel.getModel('ItemShardSync');
				Item.removeAll(function(err) {
					assert.ok(!err, err);
					cb();
				});
			},

		}, function(err) {
			assert.ok(!err, err);
			done();
		})
	});

	describe('createSync', function() {

		it('should create user success', function(done) {
			var User = CGModel.getModel('UserShardSync');

			var user = new User();
			user.createSync(function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('create', function() {
		it('should create user success', function(done) {
			var User = CGModel.getModel('UserShardAsync');
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

			var userIds = _(1)
				.chain()
				.range(100)
				.sample(10)
				.value();

			var User = CGModel.getModel('UserShardAsync');

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
			var User = CGModel.getModel('UserShardSync');

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

		it('should update user success when nothing to update', function(done) {
			var User = CGModel.getModel('UserShardSync');

			var user = new User();

			async.series({
				create: function(cb) {
					user.createSync(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				update: function(cb) {
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
			var User = CGModel.getModel('UserShardSync');

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
			var User = CGModel.getModel('UserShardSync');
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
							});
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
			var User = CGModel.getModel('UserShardSync');

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

		it('should occur error when shard key is not specified', function(done) {
			var Item = CGModel.getModel('ItemShardSync');

			// done();
			var item = new Item();
			var item2;

			async.series({
				create: function(cb) {
					item.itemId = 1;
					item.createSync(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				load: function(cb) {
					item2 = new Item();
					item2.id = item.id;

					assert.throws(function() {
						item2.db.load(function(err) {
							assert.ok(!err, err);
							cb();
						});
					});
					item2.itemId = item.itemId;
					item2.db.load(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should load users success', function(done) {
			var User = CGModel.getModel('UserShardSync');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
							});
						}, cb);
				},

				removeFromCache: function(cb) {
					async.each(
						users,
						function(user, cb) {
							user.cache.remove(function(err) {
								assert.ok(!err, err);
								cb();
							})
						}, cb);
				},

				loadFromDB: function(cb) {
					var users2 = _(users).map(function(elem) {
						var res = new User();
						res.userId = elem.userId;
						return res;
					});

					async.each(
						users2,
						function(user, cb) {
							user.load(function(err) {
								assert.ok(!err, err);
								assert.ok(user.mem.isLoaded);
								assert.deepEqual(user.p(), _(users).find(function(elem) {
									return elem.userId === user.userId;
								}).p());
								cb();
							});
						}, cb);
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('remove', function() {
		it('should remove user success', function(done) {
			var User = CGModel.getModel('UserShardSync');

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
			var User = CGModel.getModel('UserShardSync');

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
			var User = CGModel.getModel('UserShardSync');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserShardSync');
			User.find({
				userId: -1
			}, function(err, res) {
				assert.ok(!err, err);
				assert.equal(res.length, 0);
				done();
			})
		});

		it('should find no items success', function(done) {
			var Item = CGModel.getModel('ItemShardSync');
			Item.find({
				itemId: -1
			}, function(err, res) {
				assert.ok(!err, err);
				assert.equal(res.length, 0);
				done();
			})
		});

		it('should find items success', function(done) {
			var Item = CGModel.getModel('ItemShardSync');

			var item = new Item();

			async.series({
				create: function(cb) {
					item.itemId = 1;
					item.createSync(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				find: function(cb) {

					Item.find({
						id: item.id
					}, function(err, res) {

						assert.ok(!err, err);
						assert.equal(res.length, 1);
						res = res[0];
						assert.ok(!!res.id);
						assert.ok(!!res.itemId);
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should find user with order success', function(done) {
			var User = CGModel.getModel('UserShardSync');
			var users = [];
			var count = 20;
			async.series({
				create: function(cb) {
					async.timesSeries(
						count,
						function(idx, cb) {
							var user = new User();
							user.registerTime = new Date(Date.now() + Math.floor(Math.random() * 10000));
							user.money = Math.floor(Math.random() * 10)
							user.createSync(function(err) {
								assert.ok(!err, err);
								users.push(user);
								cb();
							});
						}, cb);
				},

				find: function(cb) {
					User.find({
						$select: ['*'],
						$order: {
							registerTime: 'asc'
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						for (var i = 1; i < res.length; i++) {
							// console.log(res[i - 1], res[i]);
							assert.ok(res[i - 1].registerTime <= res[i].registerTime);
						};
						cb();
					})
				},

				find2: function(cb) {
					User.find({
						$select: ['*'],
						$order: {
							registerTime: 'desc'
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						for (var i = 1; i < res.length; i++) {
							// console.log(res[i - 1], res[i]);
							assert.ok(res[i - 1].registerTime >= res[i].registerTime);
						};
						cb();
					})
				},

				find3: function(cb) {
					User.find({
						$select: ['*'],
						$order: {
							money: 'asc',
							registerTime: 'desc'
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						for (var i = 1; i < res.length; i++) {
							assert.ok(res[i - 1].money <= res[i].money);
							if (res[i - 1].money === res[i].money) {
								assert.ok(res[i - 1].registerTime >= res[i].registerTime);
							}
						};
						cb();
					})
				},

				find4: function(cb) {
					User.find({
						$select: ['*'],
						$order: {
							money: 'desc',
							registerTime: 'asc',
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						for (var i = 1; i < res.length; i++) {
							assert.ok(res[i - 1].money >= res[i].money);
							if (res[i - 1].money === res[i].money) {
								assert.ok(res[i - 1].registerTime <= res[i].registerTime);
							}
						};
						cb();
					})
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});

		it('should find users by limit success', function(done) {
			var User = CGModel.getModel('UserShardSync');
			var users = [];
			var count = 100,
				limit = 20;
			async.series({
				create: function(cb) {
					async.timesSeries(
						count,
						function(idx, cb) {
							var user = new User();
							user.registerTime = new Date(Date.now() + Math.floor(Math.random() * 10000));
							user.money = Math.floor(Math.random() * 10)
							user.createSync(function(err) {
								assert.ok(!err, err);
								users.push(user);
								cb();
							});
						}, cb);
				},

				find: function(cb) {
					User.find({
						$select: ['*'],
						$limit: limit,
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, limit);
						cb();
					})
				},

			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});

		it('should find user with order and limit success', function(done) {
			var User = CGModel.getModel('UserShardSync');
			var users = [];
			var count = 100,
				limit = 20;
			async.series({
				create: function(cb) {
					async.timesSeries(
						count,
						function(idx, cb) {
							var user = new User();
							user.registerTime = new Date(Date.now() + Math.floor(Math.random() * 10000));
							user.money = Math.floor(Math.random() * 10)
							user.createSync(function(err) {
								assert.ok(!err, err);
								users.push(user);
								cb();
							});
						}, cb);
				},

				find: function(cb) {
					User.find({
						$select: ['*'],
						$order: {
							registerTime: 'asc'
						},
						$limit: limit,
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, limit);
						for (var i = 1; i < res.length; i++) {
							// console.log(res[i - 1], res[i]);
							assert.ok(res[i - 1].registerTime <= res[i].registerTime);
						};
						cb();
					})
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('static find all', function() {

		it('should find all user success', function(done) {
			var User = CGModel.getModel('UserShardSync');

			var user = new User();
			async.series({
				create: function(cb) {
					user.create(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				findAll: function(cb) {
					User.findAll(function(err, res) {
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

		it('should find all users success', function(done) {
			var User = CGModel.getModel('UserShardSync');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
							});
						}, cb);
				},

				findAll: function(cb) {
					User.findAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, users.length);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should find no user success', function(done) {
			var User = CGModel.getModel('UserShardSync');
			User.findAll(function(err, res) {
				assert.ok(!err, err);
				assert.equal(res.length, 0);
				done();
			})
		});
	});

	describe('static remove', function() {

		it('should remove user success', function(done) {
			var User = CGModel.getModel('UserShardSync');

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
			var User = CGModel.getModel('UserShardSync');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserShardSync');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserShardSync');

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
			var User = CGModel.getModel('UserShardSync');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserShardSync');
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
			var User = CGModel.getModel('UserShardSync');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserShardSync');
			User.countAll(function(err, res) {
				assert.ok(!err, err);
				assert.equal(res, 0);
				done();
			})
		});
	});
});

describe('lib/data/data_mysql_shard(no shard)', function() {

	beforeEach(function(done) {

		async.parallel({

			remove1: function(cb) {

				var User = CGModel.getModel('UserNoShardSync');
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

	describe('createSync', function() {

		it('should create user success', function(done) {
			var User = CGModel.getModel('UserNoShardSync');

			var user = new User();
			user.createSync(function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('create', function() {
		it('should create user success', function(done) {
			var User = CGModel.getModel('UserNoShardAsync');
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
			var User = CGModel.getModel('UserNoShardAsync');

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
			var User = CGModel.getModel('UserNoShardSync');

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

		it('should update user success when nothing to update', function(done) {
			var User = CGModel.getModel('UserNoShardSync');

			var user = new User();

			async.series({
				create: function(cb) {
					user.createSync(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				update: function(cb) {
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
			var User = CGModel.getModel('UserNoShardSync');

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
			var User = CGModel.getModel('UserNoShardSync');
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
			var User = CGModel.getModel('UserNoShardSync');

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
			var User = CGModel.getModel('UserNoShardSync');

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
			var User = CGModel.getModel('UserNoShardSync');

			var user = new User();
			async.series({
				create: function(cb) {
					user.createSync(function(err) {
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
			var User = CGModel.getModel('UserNoShardSync');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserNoShardSync');
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
			var User = CGModel.getModel('UserNoShardSync');

			var user = new User();
			async.series({
				create: function(cb) {
					user.createSync(function(err) {
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
			var User = CGModel.getModel('UserNoShardSync');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserNoShardSync');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserNoShardSync');

			var user = new User();
			async.series({
				create: function(cb) {
					user.createSync(function(err) {
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
			var User = CGModel.getModel('UserNoShardSync');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserNoShardSync');
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
			var User = CGModel.getModel('UserNoShardSync');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserNoShardSync');
			User.countAll(function(err, res) {
				assert.ok(!err, err);
				assert.equal(res, 0);
				done();
			})
		});
	});
});


describe('lib/data/data_mysql_shard(shard 0)', function() {

	beforeEach(function(done) {

		async.parallel({

			remove1: function(cb) {

				var User = CGModel.getModel('UserNoShardSync2');
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

	describe('createSync', function() {

		it('should create user success', function(done) {
			var User = CGModel.getModel('UserNoShardSync2');

			var user = new User();
			user.createSync(function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('create', function() {
		it('should create user success', function(done) {
			var User = CGModel.getModel('UserNoShardAsync2');
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
			var User = CGModel.getModel('UserNoShardAsync2');

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
			var User = CGModel.getModel('UserNoShardSync2');

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

		it('should update user success when nothing to update', function(done) {
			var User = CGModel.getModel('UserNoShardSync2');

			var user = new User();

			async.series({
				create: function(cb) {
					user.createSync(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				update: function(cb) {
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
			var User = CGModel.getModel('UserNoShardSync2');

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
			var User = CGModel.getModel('UserNoShardSync2');
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
			var User = CGModel.getModel('UserNoShardSync2');

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
			var User = CGModel.getModel('UserNoShardSync2');

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
			var User = CGModel.getModel('UserNoShardSync2');

			var user = new User();
			async.series({
				create: function(cb) {
					user.createSync(function(err) {
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
			var User = CGModel.getModel('UserNoShardSync2');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserNoShardSync2');
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
			var User = CGModel.getModel('UserNoShardSync2');

			var user = new User();
			async.series({
				create: function(cb) {
					user.createSync(function(err) {
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
			var User = CGModel.getModel('UserNoShardSync2');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserNoShardSync2');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserNoShardSync2');

			var user = new User();
			async.series({
				create: function(cb) {
					user.createSync(function(err) {
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
			var User = CGModel.getModel('UserNoShardSync2');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserNoShardSync2');
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
			var User = CGModel.getModel('UserNoShardSync2');

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
							user.createSync(function(err) {
								assert.ok(!err, err);
								cb();
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
			var User = CGModel.getModel('UserNoShardSync2');
			User.countAll(function(err, res) {
				assert.ok(!err, err);
				assert.equal(res, 0);
				done();
			})
		});
	});
});