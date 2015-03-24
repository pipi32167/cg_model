'use strict';
var EventEmitter = require('events').EventEmitter;
var _ = require('underscore');
var assert = require('assert');
var async = require('async');
var CGModel = require('../lib');
require('./init');
require('./models');
var helper = require('./helper');

describe('lib/data/data_mysql', function() {
	beforeEach(function(done) {
		async.parallel({
			removeAllUsers: function(cb) {
				CGModel.getModel('User').removeAll(cb);
			},

			removeAllFriends: function(cb) {
				CGModel.getModel('Friend').removeAll(cb);
			},

			removeAllItems: function(cb) {
				CGModel.getModel('Item').removeAll(cb);
			}
		}, function(err) {
			assert.ok(!err, err);
			done();
		})
	});

	describe('other', function() {

		it('should set primary key success', function() {
			var User = CGModel.getModel('User');
			var user = new User();
			var userId = 1;
			user.p({
				userId: userId
			});
			assert.equal(user.userId, userId);

			user = new User();
			user.userId = userId;
			assert.equal(user.userId, userId);
		});

		it('should extend Item and call CRUD success', function(done) {

			var Item = CGModel.getModel('Item');

			var ItemSuper = function() {

			}

			var ItemSub = function() {
				Item.call(this);
				ItemSuper.call(this);
				EventEmitter.call(this);
			}

			CGModel.extend(ItemSub, Item);
			_.extend(ItemSub.prototype, ItemSuper.prototype);
			_.extend(ItemSub.prototype, EventEmitter.prototype);

			var id;
			var item;
			async.series({
				create: function(cb) {
					item = new ItemSub();
					item.itemId = 100;
					item.create(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(item);
						id = item.id;
						cb();
					});
				},

				load: function(cb) {
					item = new ItemSub();
					item.id = id;
					item.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(item);
						cb();
					});
				},

				update: function(cb) {
					item.isLock = true;
					item.update(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				checkUpdateCache: function(cb) {
					var item = new ItemSub();
					item.id = id;
					item.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(item);
						assert.ok(item.isLock);
						cb();
					});
				},

				removeFromCache: function(cb) {
					item.cache.remove(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				checkUpdateDB: function(cb) {
					var item = new ItemSub();
					item.id = id;
					item.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(item);
						assert.ok(item.isLock);
						cb();
					});
				},

				remove: function(cb) {
					item.remove(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				checkRemove: function(cb) {
					var item = new ItemSub();
					item.id = id;
					item.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsUnloaded(item);
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});


		it('should extend Item and call static methods success', function(done) {

			var Item = CGModel.getModel('Item');

			var ItemSuper = function() {

			}

			var ItemSub = function() {
				Item.call(this);
				ItemSuper.call(this);
				EventEmitter.call(this);
			}

			CGModel.extend(ItemSub, Item);
			_.extend(ItemSub.prototype, ItemSuper.prototype);
			_.extend(ItemSub.prototype, EventEmitter.prototype);

			var id;
			var item;
			async.series({
				create: function(cb) {
					item = new ItemSub();
					item.itemId = 100;
					item.create(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(item);
						id = item.id;
						cb();
					});
				},

				find: function(cb) {
					ItemSub.find({
						$where: {
							id: item.id
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						cb();
					})
				},

				findAll: function(cb) {
					ItemSub.findAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						cb();
					})
				},

				count: function(cb) {
					ItemSub.count({
						$where: {
							id: item.id
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, 1);
						cb();
					})
				},

				countAll: function(cb) {
					ItemSub.countAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, 1);
						cb();
					});
				},

				load: function(cb) {
					ItemSub.load({
						$where: {
							id: item.id
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						cb();
					});
				},

				loadAll: function(cb) {
					ItemSub.loadAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						cb();
					});
				},


				remove: function(cb) {
					ItemSub.remove({
						$where: {
							id: item.id
						}
					}, function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				removeAll: function(cb) {
					ItemSub.removeAll(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				checkRemove: function(cb) {
					ItemSub.countAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, 0);
						cb();
					});
				}

			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should add a user to the bucket success', function(done) {
			var bucket = new CGModel.Bucket();

			var User = CGModel.getModel('User');
			var userId;
			var user;
			async.series({
				create: function(cb) {

					user = new User(bucket);
					user.create(function(err) {
						assert.ok(!err, err);
						userId = user.userId;
						assert.equal(bucket.size(), 0);
						user.money++;
						assert.equal(bucket.size(), 1);
						user.money++;
						assert.equal(bucket.size(), 1);
						var models = bucket.pour();
						assert.ok(models[user.__id]);
						assert.equal(bucket.size(), 0);
						user.money++;
						assert.equal(bucket.size(), 1);
						cb();
					})
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});

		it('should add many users to the bucket success', function(done) {
			var bucket = new CGModel.Bucket();

			var User = CGModel.getModel('User');
			var user, users = [];
			var count = 5;
			async.series({
				createUsers: function(cb) {

					async.times(
						count,
						function(idx, cb) {
							user = new User(bucket);
							users.push(user);
							user.create(function(err) {
								assert.ok(!err, err);
								cb();
							});
						},
						function(err) {
							assert.ok(!err, err);
							assert.equal(bucket.size(), 0);
							cb();
						});
				},

				modify: function(cb) {
					users.forEach(function(elem) {
						elem.money++;
					});

					assert.equal(bucket.size(), count);

					users.forEach(function(elem) {
						elem.money++;
					});

					assert.equal(bucket.size(), count);

					bucket.pour();

					assert.equal(bucket.size(), 0);
					cb();
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('isModified', function() {

		it('should return true when user is modified', function(done) {
			var User = CGModel.getModel('User');

			var user;
			async.series({
				createUser: function(cb) {
					user = new User();
					user.create(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				check: function(cb) {
					user.money++;
					assert.ok(user.db.isModified());
					assert.ok(user.cache.isModified());
					cb();
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should return true when user is update version by hand', function(done) {
			var User = CGModel.getModel('User');

			var user;
			async.series({
				createUser: function(cb) {
					user = new User();
					user.create(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				check: function(cb) {
					user.mem.incrVersion();
					assert.ok(user.db.isModified());
					assert.ok(user.cache.isModified());
					cb();
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should return true when the loaded user is modified', function(done) {
			var User = CGModel.getModel('User');

			var userId;
			async.series({
				createUser: function(cb) {
					var user = new User();
					user.create(function(err) {
						assert.ok(!err, err);
						userId = user.userId;
						cb();
					})
				},

				check: function(cb) {
					var user = new User();
					user.userId = userId;
					user.load(function(err) {
						assert.ok(!err, err);
						assert.ok(!user.db.isModified());
						assert.ok(!user.cache.isModified());
						user.money++;
						assert.ok(user.db.isModified());
						assert.ok(user.cache.isModified());
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should return true when the loaded user is modified', function(done) {
			var User = CGModel.getModel('User');

			var userId;
			async.series({
				createUser: function(cb) {
					var user = new User();
					user.create(function(err) {
						assert.ok(!err, err);
						userId = user.userId;
						cb();
					})
				},

				check: function(cb) {
					var user = new User();
					user.userId = userId;
					user.load(function(err) {
						assert.ok(!err, err);
						assert.ok(!user.db.isModified());
						assert.ok(!user.cache.isModified());
						user.money++;
						assert.ok(user.db.isModified());
						assert.ok(user.cache.isModified());
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('create', function() {

		it('should create a new user success', function(done) {

			var User = CGModel.getModel('User');
			var userId;

			async.series({
				create: function(cb) {

					var user = new User();
					user.create(function(err) {
						assert.ok(!err, err);
						userId = user.p('userId');
						helper.checkModelIsLoaded(user);
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
						helper.checkModelIsLoaded(user);
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});

		it('should create a new friend success', function(done) {
			var Friend = CGModel.getModel('Friend');
			var friend1, friend2;
			async.series({
				create: function(cb) {
					friend1 = new Friend();
					friend1.p({
						userId: 1,
						friendId: 2,
						type: 0,
					});
					friend1.create(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(friend1);
						cb();
					});
				},

				check: function(cb) {
					friend2 = new Friend();
					friend2.p({
						userId: 1,
						friendId: 2,
						type: 1, //Can I fool the model?
					});
					friend2.load(function(err) {
						assert.ok(!err, err);
						assert.equal(friend2.p('type'), friend1.p('type'));
						helper.checkModelIsLoaded(friend2);
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should create an item with an auto increment id', function(done) {
			var Item = CGModel.getModel('Item');
			var id;
			var item;
			async.series({
				create: function(cb) {

					item = new Item();
					item.p('itemId', 100);
					item.create(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(item);
						assert.ok(item.id !== undefined);
						assert.ok(item.isLock !== undefined);
						id = item.id;
						cb();
					});
				},

				checkCache: function(cb) {
					var itemInCache = new Item();
					itemInCache.id = id;
					itemInCache.load(function(err) {
						assert.ok(!err, err);
						assert.ok(itemInCache.mem.isLoaded);
						for (var prop in Item.def.props) {
							if (Item.def.props.hasOwnProperty(prop)) {
								assert.deepEqual(itemInCache.p(prop), item.p(prop))
							}
						}
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should create an item failed when not provide all required properties', function() {
			var Item = CGModel.getModel('Item');
			var item = new Item();
			assert.throws(function() {
				item.create(function() {});
			});
		});

		it('should create many items success', function(done) {
			var Item = CGModel.getModel('Item');
			async.times(
				10,
				function(idx, cb) {
					var item = new Item();
					item.itemId = 100;
					item.create(function(err) {

						assert.ok(!err, err);
						helper.checkModelIsLoaded(item);
						assert.ok(item.id !== undefined);
						cb();
					})
				},
				function(err) {
					assert.ok(!err, err);
					done();
				});
		});

		it('should create item success even specified the auto increment primary key', function(done) {
			var Item = CGModel.getModel('Item');
			var itemInfo = {
				id: 100,
				itemId: 100,
				isLock: false,
				desc: 'xx',
				updateTime: new Date(),
			};
			async.series({

				createItem: function(cb) {

					var item = new Item();
					item.p(itemInfo);
					item.create(function(err) {

						assert.ok(!err, err);
						helper.checkModelIsLoaded(item);
						assert.deepEqual(item.id, itemInfo.id);
						cb();
					});
				},

				//check cache
				check: function(cb) {

					var item = new Item();
					item.id = itemInfo.id;
					item.load(function(err) {

						assert.ok(!err, err);
						helper.checkModelIsLoaded(item);
						assert.deepEqual(item.itemId, itemInfo.itemId);
						assert.deepEqual(item.isLock, itemInfo.isLock);
						assert.deepEqual(item.desc, itemInfo.desc);
						assert.deepEqual(item.updateTime, itemInfo.updateTime);
						cb();
					});
				},

				removeFromCache: function(cb) {

					var item = new Item();
					item.id = itemInfo.id;
					item.cache.remove(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				//check db
				check2: function(cb) {

					var item = new Item();
					item.id = itemInfo.id;
					item.load(function(err) {
						assert.ok(!err, err);
						// console.log(item.toModelJSON());
						helper.checkModelIsLoaded(item);
						assert.deepEqual(item.itemId, itemInfo.itemId);
						assert.deepEqual(item.isLock, itemInfo.isLock);
						assert.deepEqual(item.desc, itemInfo.desc);
						assert.deepEqual(item.updateTime, itemInfo.updateTime);
						cb();
					});
				},

				createItem2: function(cb) {

					var item = new Item();
					item.itemId = itemInfo.itemId;
					item.create(function(err) {

						assert.ok(!err, err);
						helper.checkModelIsLoaded(item);
						assert.deepEqual(item.id, itemInfo.id + 1);
						assert.deepEqual(item.itemId, itemInfo.itemId);
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should create a record success', function(done) {
			var Record = CGModel.getModel('Record');
			var recordTime = new Date();

			async.series({
				create: function(cb) {
					var record = new Record();
					record.recordTime = recordTime;
					record.create(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(record);
						cb();
					});
				},

				check: function(cb) {
					var record = new Record();
					record.recordTime = recordTime;
					record.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(record);
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('load', function() {

		it('should load user success', function(done) {

			var User = CGModel.getModel('User');
			var userId;

			async.series({
				create: function(cb) {

					var user = new User();
					user.create(function(err) {
						assert.ok(!err, err);
						userId = user.userId;
						helper.checkModelIsLoaded(user);
						cb();
					});
				},

				load: function(cb) {

					var user = new User();
					user.userId = userId;
					user.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(user);
						cb();
					});
				},

				removeInCache: function(cb) {

					var user = new User();
					user.userId = userId;
					user.cache.remove(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				loadFromDB: function(cb) {

					var user = new User();
					user.userId = userId;
					user.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(user);
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('update', function() {

		it('should update user success', function(done) {

			var User = CGModel.getModel('User');
			var userId, user;

			async.series({
				create: function(cb) {

					// console.log('create');
					user = new User();
					user.create(function(err) {
						assert.ok(!err, err);
						userId = user.p('userId');
						assert.ok(!user.cache.isModified());
						assert.ok(!user.db.isModified());
						helper.checkModelIsLoaded(user);
						cb();
					});
				},

				update: function(cb) {
					// console.log('update');
					user.p({
						userId: user.userId,
						name: '0' + user.name,
					});
					// console.log(user.cache.__version, user.mem.__version);
					assert.ok(user.cache.isModified());
					assert.ok(user.db.isModified());
					user.update(function(err) {
						assert.ok(!err, err);
						assert.ok(!user.cache.isModified());
						assert.ok(!user.db.isModified());
						cb();
					});
				},

				check: function(cb) {
					// console.log('check');
					var user2 = new User();
					user2.p('userId', userId);
					user2.load(function(err) {
						assert.ok(!err, err);
						// console.log(user2.p(), user2.cache.p(), user2.db.p());
						helper.checkModelIsLoaded(user2);
						assert.equal(user2.p('name'), user.p('name'));
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});

		it('should update friend success', function(done) {
			var Friend = CGModel.getModel('Friend');
			var friend1, friend2;
			var now = new Date();
			async.series({
				create: function(cb) {
					friend1 = new Friend();
					friend1.p({
						userId: 1,
						friendId: 2,
						type: 0,
					});
					friend1.create(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(friend1);
						cb();
					});
				},

				update: function(cb) {

					friend1.p('assistTime', now);
					friend1.update(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				check: function(cb) {
					friend2 = new Friend();
					friend2.p({
						userId: 1,
						friendId: 2,
					});
					friend2.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(friend2);
						assert.deepEqual(friend2.p('assistTime'), friend1.p('assistTime'));
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

		it('should create a new user and remove it success', function(done) {

			var User = CGModel.getModel('User');
			var userId;

			async.series({
				create: function(cb) {

					var user = new User();
					user.create(function(err) {
						assert.ok(!err, err);
						userId = user.p('userId');
						helper.checkModelIsLoaded(user);
						cb();
					});
				},

				remove: function(cb) {
					var user = new User();
					user.p('userId', userId);
					user.remove(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsUnloaded(user);
						cb();
					});
				},

				load: function(cb) {

					var user = new User();
					user.p('userId', userId);
					user.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsUnloaded(user);
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});

		it('should create and remove a friend success', function(done) {
			var Friend = CGModel.getModel('Friend');
			var friend1, friend2;
			async.series({
				create: function(cb) {
					friend1 = new Friend();
					friend1.p({
						userId: 1,
						friendId: 2,
						type: 0,
					});
					friend1.create(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(friend1);
						cb();
					});
				},

				remove: function(cb) {
					friend1.remove(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsUnloaded(friend1);
						cb();
					});
				},

				check: function(cb) {
					friend2 = new Friend();
					friend2.p({
						userId: 1,
						friendId: 2,
					});
					friend2.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsUnloaded(friend2);
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

		it('should find no users success', function(done) {
			var User = CGModel.getModel('User');
			User.load({
				userId: 1
			}, function(err, res) {
				assert.ok(!err, err);
				assert.equal(res.length, 0);
				done();
			});
		});

		it('should find a user success', function(done) {
			var expect;
			var User = CGModel.getModel('User');
			async.series({

				createUser: function(cb) {
					var user = new User();
					user.create(function(err) {
						assert.ok(!err, err);
						expect = user.p(['userId', 'name'])
						helper.checkModelIsLoaded(user);
						cb();
					});
				},

				findUserByUserId: function(cb) {
					User.load({
						userId: expect.userId
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						assert.equal(res[0].p('userId'), expect.userId);
						assert.equal(res[0].p('name'), expect.name);
						helper.checkModelIsLoaded(res[0]);
						cb();
					});
				},

				findUserByName: function(cb) {
					User.load({
						name: expect.name
					}, function(err, res) {

						assert.ok(!err, err);
						assert.equal(res.length, 1);
						assert.equal(res[0].p('userId'), expect.userId);
						assert.equal(res[0].p('name'), expect.name);
						helper.checkModelIsLoaded(res[0]);
						cb();
					})
				}

			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should find many users success', function(done) {
			var User = CGModel.getModel('User');
			var count = 5;
			var users;
			var userIds;
			async.series({

				createUsers: function(cb) {
					helper.createModels(User, count, function(err, res) {
						assert.ok(!err, err);
						users = res;
						cb();
					});
				},

				findUserByUserId: function(cb) {
					userIds = _(users).map(function(elem) {
						return elem.p('userId');
					});
					User.load({
						userId: userIds
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					});
				},

				findUserByName: function(cb) {
					var names = _(users).map(function(elem) {
						return elem.p('name');
					});
					User.load({
						name: names
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					});
				},

				findAll: function(cb) {
					User.loadAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					});
				},

				findByGT: function(cb) {
					User.load({
						userId: {
							gt: userIds[0]
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count - 1);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				},

				findByGTE: function(cb) {
					User.load({
						userId: {
							gte: userIds[0]
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				},

				findByLT: function(cb) {
					User.load({
						userId: {
							lt: userIds[0]
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 0);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				},

				findByLTE: function(cb) {
					User.load({
						userId: {
							lte: userIds[0]
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				},

				findByEqual: function(cb) {
					User.load({
						userId: {
							equal: userIds[0]
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				},

				findByEquals: function(cb) {
					User.load({
						userId: {
							equals: userIds[0]
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				},

				findByNotEqual: function(cb) {
					User.load({
						userId: {
							notEqual: userIds[0]
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 4);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				},

				findByNotEquals: function(cb) {
					User.load({
						userId: {
							notEquals: userIds[0]
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 4);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				},

				findByIn: function(cb) {
					User.load({
						userId: { in : [userIds[0], userIds[1]]
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 2);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				},

				findByNotIn: function(cb) {
					User.load({
						userId: {
							notIn: [userIds[0], userIds[1]]
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count - 2);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				},

				findByGTAndLTAndNotIn: function(cb) {
					User.load({
						userId: {
							gt: userIds[0],
							lt: userIds[4],
							notIn: [userIds[3]],
						},
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count - 3);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				},

				findByOrder: function(cb) {
					var beforeUserId = Number.MAX_VALUE;
					User.load({
						$order: {
							userId: 'desc',
							name: 'asc',
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						res.forEach(function(elem) {
							assert.ok(elem.userId < beforeUserId);
							beforeUserId = elem.userId;
							helper.checkModelIsLoaded(elem);
						});

						cb();
					})
				},

				findByLimit: function(cb) {
					User.load({
						$limit: 3
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 3);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				},

				findByLimitAndOffset: function(cb) {
					User.load({
						$limit: 3,
						$offset: 3,
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 2);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					})
				}

			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});

		it('should find no friends success', function(done) {
			var Friend = CGModel.getModel('Friend');
			Friend.load({
				userId: 1
			}, function(err, res) {
				assert.ok(!err, err);
				assert.equal(res.length, 0);
				done();
			});
		});

		it('should find friends success when specified userId', function(done) {
			var Friend = CGModel.getModel('Friend');
			var userId = 1;
			var friendIds = [2, 3, 4, 5];

			var args = _(friendIds).map(function(elem) {
				return {
					userId: userId,
					friendId: elem,
					type: 0,
				}
			});
			async.series({
				createFriends: function(cb) {
					helper.createModels(Friend, args, cb);
				},

				find: function(cb) {
					Friend.load({
						userId: 1
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 4);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					});
				},

				find2: function(cb) {
					Friend.load({
						friendId: 2
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						helper.checkModelIsLoaded(res[0]);
						cb();
					});
				},

				find3: function(cb) {
					Friend.load({
						userId: 1,
						friendId: 2
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						helper.checkModelIsLoaded(res[0]);
						cb();
					});
				},

				find4: function(cb) {
					Friend.load({
						userId: 1,
						friendId: [2, 3]
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 2);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					});
				},

				find5: function(cb) {
					Friend.load({
						userId: 2,
						friendId: [2, 3]
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 0);
						cb();
					});
				},

				find6: function(cb) {
					Friend.load({
						userId: [1, 2],
						friendId: [1, 2, 3]
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 2);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						});
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should find a user success', function(done) {
			var User = CGModel.getModel('User');
			var userId, name;
			async.series({

				createUser: function(cb) {
					var user = new User();
					user.create(function(err) {
						assert.ok(!err, err);
						userId = user.userId;
						name = user.name;
						helper.checkModelIsLoaded(user);
						cb();
					});
				},

				findUserByUserId: function(cb) {
					User.load({
						userId: userId
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						assert.equal(res[0].userId, userId);
						assert.equal(res[0].name, name);
						helper.checkModelIsLoaded(res[0]);
						cb();
					});
				},

				findUserByName: function(cb) {
					User.load({
						name: name
					}, function(err, res) {

						assert.ok(!err, err);
						assert.equal(res.length, 1);
						assert.equal(res[0].userId, userId);
						assert.equal(res[0].name, name);
						helper.checkModelIsLoaded(res[0]);
						cb();
					})
				}

			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should find many users success', function(done) {

			var User = CGModel.getModel('User');
			var count = 5;
			var users;
			async.series({

				createUsers: function(cb) {
					helper.createModels(User, count, function(err, res) {
						assert.ok(!err, err);
						users = res;
						cb();
					});
				},

				findUserByUserId: function(cb) {
					var userIds = _(users).map(function(elem) {
						return elem.p('userId');
					});
					User.load({
						userId: userIds
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					});
				},

				findUserByName: function(cb) {
					var names = _(users).map(function(elem) {
						return elem.p('name');
					});
					User.load({
						name: names
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					});
				},

				findAll: function(cb) {
					User.loadAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						res.forEach(function(elem) {
							helper.checkModelIsLoaded(elem);
						})
						cb();
					});
				},

			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('static findAll', function() {

		it('should find all users success', function(done) {
			var User = CGModel.getModel('User');
			var count = 5;
			var users;
			async.series({

				createUsers: function(cb) {
					helper.createModels(User, count, function(err, res) {
						assert.ok(!err, err);
						users = res;
						cb();
					});
				},

				findAllUsers: function(cb) {
					User.findAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, count);
						cb();
					})
				}

			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('static load', function() {

		it('should load no users success', function(done) {
			var User = CGModel.getModel('User');
			User.load({
				userId: 1
			}, function(err, res) {
				assert.ok(!err, err);
				assert.equal(res.length, 0);
				done();
			});
		});

		it('should load a user success', function(done) {
			var User = CGModel.getModel('User');
			var userId;
			var user;
			async.series({
				createUser: function(cb) {
					user = new User();
					user.create(function(err) {
						assert.ok(!err, err);
						userId = user.userId;
						cb();
					})
				},

				load: function(cb) {

					User.load({
						userId: userId
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.length, 1);
						assert.deepEqual(res[0].p(), user.p());
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should load many users success', function(done) {
			var User = CGModel.getModel('User');
			var users;
			var count = 5;
			async.series({
				createUsers: function(cb) {

					helper.createModels(User, count, function(err, res) {
						assert.ok(!err, err);
						users = res;
						cb();
					})
				},

				load: function(cb) {

					var userIds = _(users).map(function(elem) {
						return elem.userId;
					});
					User.load({
						$where: {
							userId: { in : userIds
							}
						}
					}, function(err, res) {
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

	describe('static loadAll', function() {

		it('should load all users success', function(done) {
			var User = CGModel.getModel('User');
			var users;
			var count = 5;
			async.series({
				createUsers: function(cb) {

					helper.createModels(User, count, function(err, res) {
						assert.ok(!err, err);
						users = res;
						cb();
					})
				},

				loadAllUsers: function(cb) {
					User.loadAll(function(err, res) {
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

	describe('static update', function() {

		it('should update many users success', function(done) {

			var User = CGModel.getModel('User');
			var count = 5;
			var users;
			var userIds;
			async.series({

				createUsers: function(cb) {
					helper.createModels(User, count, function(err, res) {
						assert.ok(!err, err);
						users = res;
						userIds = _(users).map(function(elem) {
							return elem.userId;
						})
						cb();
					});
				},

				updateUser: function(cb) {

					User.update({
						$update: {
							money: 9999,
						},
						$where: {
							userId: users[0].userId
						}
					}, function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				checkInCache: function(cb) {
					User.load({
						userId: users[0].userId
					}, function(err, users) {
						assert.ok(!err, err);
						assert.equal(users[0].money, 9999);
						cb();
					});
				},

				removeFromCache: function(cb) {
					users[0].cache.remove(function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				checkInDB: function(cb) {
					User.load({
						userId: users[0].userId
					}, function(err, users) {
						assert.ok(!err, err);
						assert.equal(users[0].money, 9999);
						cb();
					});
				},

				updateUsers: function(cb) {

					User.update({
						$update: {
							money: 9999,
						},
					}, function(err) {
						assert.ok(!err, err);
						cb();
					})
				},

				checkInCache2: function(cb) {
					User.load({
						userId: userIds
					}, function(err, users) {
						assert.ok(!err, err);
						users.forEach(function(elem) {
							assert.equal(elem.money, 9999);
						});
						cb();
					});
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('static removeAll', function() {

		it('should remove all users from db and cache', function(done) {

			var User = CGModel.getModel('User');
			User.removeAll(function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should remove all friends from db and cache', function(done) {

			var Friend = CGModel.getModel('Friend');
			var userId = 1;
			var friendIds = [2, 3, 4, 5];
			var args = _(friendIds).map(function(elem) {
				return {
					userId: userId,
					friendId: elem,
					type: 0,
				}
			});
			async.series({
				createFriends: function(cb) {
					helper.createModels(Friend, args, cb);
				},

				check1: function(cb) {
					async.eachSeries(
						friendIds,
						function(friendId, cb) {
							var friend = new Friend();
							friend.p({
								userId: userId,
								friendId: friendId,
							});
							friend.load(function(err) {
								assert.ok(!err, err);
								helper.checkModelIsLoaded(friend);
								cb();
							})
						},
						cb);
				},

				removeAllFriends: function(cb) {
					Friend.removeAll(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				check2: function(cb) {
					async.eachSeries(
						friendIds,
						function(friendId, cb) {
							var friend = new Friend();
							friend.p({
								userId: userId,
								friendId: friendId,
							});
							friend.load(function(err) {
								assert.ok(!err, err);
								helper.checkModelIsUnloaded(friend);
								cb();
							})
						},
						cb);
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('static remove', function() {

		it('should remove users by arguments success', function(done) {
			var User = CGModel.getModel('User');

			var count = 5;
			var users;
			var userIds;
			async.series({

				createUsers: function(cb) {
					helper.createModels(User, count, function(err, res) {
						assert.ok(!err, err);
						users = res;
						userIds = _(users).map(function(elem) {
							return elem.userId;
						});
						cb();
					});
				},

				remove: function(cb) {
					User.remove({
						userId: {
							gt: users[0].userId,
							lt: users[4].userId,
						},
						$limit: 2,
					}, cb);
				},

				check: function(cb) {
					User.countAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, 3);
						cb();
					})
				},

				check2: function(cb) {

					var removeUserIds = userIds.slice(1, 3);
					// console.log(removeUserIds);
					async.eachSeries(
						removeUserIds,
						function(elem, cb) {
							var user = new User();
							user.userId = elem;
							user.load(function(err) {
								assert.ok(!err, err);
								assert.ok(!user.mem.isLoaded);
								cb();
							})
						}, cb);
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});

		it('should remove friends success when specified userId', function(done) {

			var Friend = CGModel.getModel('Friend');
			var userId1 = 1;
			var friendIds1 = [2, 3, 4, 5];
			var args = _(friendIds1).map(function(elem) {
				return {
					userId: userId1,
					friendId: elem,
					type: 0,
				};
			});
			async.series({

				createFriends1: function(cb) {
					helper.createModels(Friend, args, function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				remove: function(cb) {
					Friend.remove({
						userId: userId1,
					}, cb);
				},

				check: function(cb) {
					Friend.countAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, 0);
						cb();
					})
				},

				check2: function(cb) {

					async.eachSeries(
						friendIds1,
						function(elem, cb) {
							var friend = new Friend();
							friend.userId = userId1;
							friend.friendId = elem;
							friend.load(function(err) {
								assert.ok(!err, err);
								assert.ok(!friend.mem.isLoaded);
								cb();
							})
						}, cb);
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});

		it('should remove friends success when specified friendId', function(done) {

			var Friend = CGModel.getModel('Friend');
			var userId1 = 1;
			var userId2 = 2;
			var friendId = 5;

			async.series({

				createFriends1: function(cb) {
					helper.createModels(Friend, [{
						userId: userId1,
						friendId: friendId,
						type: 0,
					}], function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				createFriends2: function(cb) {
					helper.createModels(Friend, [{
						userId: userId2,
						friendId: friendId,
						type: 0,
					}], function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				remove: function(cb) {
					Friend.remove({
						friendId: friendId,
					}, cb);
				},

				check: function(cb) {
					Friend.countAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, 0);
						cb();
					})
				},

				check2: function(cb) {

					async.eachSeries(
						[userId1, userId2],
						function(elem, cb) {
							var friend = new Friend();
							friend.userId = elem;
							friend.friendId = friendId;
							friend.load(function(err) {
								assert.ok(!err, err);
								assert.ok(!friend.mem.isLoaded);
								cb();
							})
						}, cb);
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('static countAll', function() {

		it('should count all users success', function(done) {
			var User = CGModel.getModel('User');
			var count = 5;
			var users;
			async.series({

				createUsers: function(cb) {
					helper.createModels(User, count, function(err, res) {
						assert.ok(!err, err);
						users = res;
						cb();
					});
				},

				countAll: function(cb) {
					User.countAll(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, count);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('static count', function() {

		it('should count users by arguments success', function(done) {

			var User = CGModel.getModel('User');
			var count = 5;
			var users;
			async.series({

				createUsers: function(cb) {
					helper.createModels(User, count, function(err, res) {
						assert.ok(!err, err);
						users = res;
						cb();
					});
				},

				count: function(cb) {
					User.count({
						userId: {
							gt: users[0].userId,
							lt: users[4].userId,
						}
					}, function(err, res) {
						assert.ok(!err, err);
						assert.equal(res, 3);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});
});