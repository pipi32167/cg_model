'use strict';

var _ = require('underscore');
var assert = require('assert');
var async = require('async');
var CGModel = require('../lib');
var helper = require('./helper');

require('./init');
require('./models');

describe('lib/data/data_mysql_late', function() {
	beforeEach(function(done) {
		CGModel.initialize(require('./config/cg_model'));
		CGModel.start();
		async.parallel({

			removeAllItems: function(cb) {
				CGModel.getModel('Item4').removeAll(cb);
			},

			removeAllUsers: function(cb) {
				CGModel.getModel('User2').removeAll(cb);
			},

			removeAllFriends: function(cb) {
				CGModel.getModel('Friend2').removeAll(cb);
			},
		}, function(err) {
			assert.ok(!err, err);
			done();
		})
	});

	afterEach(function(done) {
		CGModel.stopJobs(done);
	});

	describe('cron job', function() {

		it('should run a job later success', function(done) {
			var User2 = CGModel.getModel('User2');

			var userId = 1;
			var registerTime = new Date('2014-1-1');

			async.series({
				create: function(cb) {
					var user = new User2();
					user.p('userId', userId);

					user.create(function(err) {
						assert.ok(!err, err);

						user.p('registerTime', registerTime);
						user.db.once('updated', function() {
							cb();
						});
						user.update(function(err) {
							assert.ok(!err, err);
						});
					});
				},

				check: function(cb) {
					var user = new User2();
					user.p('userId', userId);

					user.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(user);

						assert.deepEqual(user.registerTime, registerTime);
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should run a job immedately success', function(done) {
			var User2 = CGModel.getModel('User2');

			var userId = 1;
			var registerTime = new Date('2014-1-1');
			var money;

			async.series({
				create: function(cb) {
					var user = new User2();
					user.p('userId', userId);

					user.create(function(err) {
						assert.ok(!err, err);

						user.money += 1;
						money = user.money;
						user.update(function(err) {
							assert.ok(!err, err);
							cb(); //it should update immediately
						});
					});
				},

				check: function(cb) {
					var user = new User2();
					user.p('userId', userId);

					user.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(user);
						assert.equal(user.money, money);
						cb();
					});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should run many jobs later success', function(done) {
			var User2 = CGModel.getModel('User2');
			var count = 5;
			var updateCount = 0;

			var users;

			async.series({
				createUsers: function(cb) {
					helper.createModels(User2, count, function(err, res) {
						assert.ok(!err, err);
						users = res;
						cb();
					})
				},

				update: function(cb) {

					users.forEach(function(elem) {
						elem.db.once('updated', function(err) {
							assert.ok(!err, err);
							updateCount++;
							assert.ok(updateCount <= count, updateCount + '/' + count);
							if (updateCount === count) {
								cb();
							}
						})
					});

					async.each(
						users,
						function(user, cb) {
							user.p('registerTime', new Date('2014-1-1'));
							user.update(function(err) {
								assert.ok(!err, err);
								cb();
							})
						},
						function(err) {
							assert.ok(!err, err);
							//do not call cb here
						});
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should run many jobs later success even have error', function(done) {
			var Item = CGModel.getModel('Item6');
			var count = 5;
			var updateCount = 0;

			var items;

			async.series({
					createItems: function(cb) {
						helper.createModels(Item, count, function(err, res) {
							assert.ok(!err, err);
							items = res;
							cb();
						})
					},

					update: function(cb) {

						items.forEach(function(elem) {
							elem.db.once('updated', function(err) {
								// console.trace(err);
								// assert.ok(!err, err);
								updateCount++;
								assert.ok(updateCount <= count, updateCount + '/' + count);
								if (updateCount === count) {
									cb();
								}
							})
						});

						var haveErr = false;

						async.each(
							items,
							function(record, cb) {
								if (!haveErr) {
									haveErr = true;
									record.updateTime = new Date('test');
									// console.log(record.updateTime);
								} else {
									record.updateTime = new Date();
								}
								record.update(function(err) {
									assert.ok(!err, err);
								})
							},
							function(err) {
								assert.ok(!err, err);
								//do not call cb here
							});
					}
				},
				function(err) {
					assert.ok(!err, err);
					done();
				})
		});

		it('should run many different jobs later success', function(done) {
			var User2 = CGModel.getModel('User2');
			var Friend2 = CGModel.getModel('Friend2');
			var Item2 = CGModel.getModel('Item2');
			var count = 5;
			var updateCount = 0;
			var friendCount = 5;
			var friendUpdateCount = 0;
			var itemCount = 5;
			var itemUpdateCount = 0;

			var users, friends, items;

			async.auto({
				createUsers: function(cb) {
					helper.createModels(User2, count, function(err, res) {
						assert.ok(!err, err);
						users = res;
						cb();
					});
				},

				updateUsers: ['createUsers', function(cb) {

					users.forEach(function(elem) {
						elem.db.once('updated', function(err) {
							assert.ok(!err, err);
							updateCount++;
							assert.ok(updateCount <= count, updateCount + '/' + count);
							if (updateCount === count) {
								cb();
							}
						})
					});

					async.each(
						users,
						function(user, cb) {
							user.p('name', '0' + user.p('name'));
							user.update(function(err) {
								assert.ok(!err, err);
								cb();
							})
						},
						function(err) {
							assert.ok(!err, err);
							//don't call cb here
						});
				}],


				createFriends: function(cb) {
					var userId = 1;
					var friendIds = _.range(2, 2 + friendCount);
					var args = _(friendIds).map(function(elem) {
						return {
							userId: userId,
							friendId: elem,
							type: 0,
						};
					});
					helper.createModels(Friend2, args, function(err, res) {
						assert.ok(!err, err);
						friends = res;
						cb();
					});
				},

				updateFriends: ['createFriends', function(cb) {

					friends.forEach(function(elem) {
						elem.db.once('updated', function(err) {
							assert.ok(!err, err);
							friendUpdateCount++;
							assert.ok(friendUpdateCount <= friendCount);
							if (friendUpdateCount === friendCount) {
								cb();
							}
						});
					});

					async.each(
						friends,
						function(friend, cb) {
							friend.p('assistTime', new Date('2014-1-1'));
							friend.update(function(err) {
								assert.ok(!err, err);
								cb();
							});
						},
						function(err) {
							assert.ok(!err, err);
							//don't call cb here
						});

					async.each(
						friends,
						function(friend, cb) {
							friend.p('assistTime', new Date('2014-1-2'));
							friend.update(function(err) {
								assert.ok(!err, err);
								cb();
							});
						},
						function(err) {
							assert.ok(!err, err);
							//don't call cb here
						});
				}],

				createItems: function(cb) {
					var ids = _.range(1, 1 + itemCount);
					var args = _(ids).map(function(elem) {
						return {
							id: elem,
							itemId: 100,
						};
					});
					helper.createModels(Item2, args, function(err, res) {
						assert.ok(!err, err);
						items = res;
						cb();
					})
				},

				updateItems: ['createItems', function(cb) {

					items.forEach(function(elem) {
						elem.db.once('updated', function(err) {
							assert.ok(!err, err);
							itemUpdateCount++;
							assert.ok(itemUpdateCount <= itemCount);
							if (itemUpdateCount === itemCount) {
								cb();
							}
						});
					});

					async.each(
						items,
						function(item, cb) {
							item.p({
								properties1: {
									test: true
								},
								properties2: [1, 2, 3],
							});
							item.update(function(err) {
								assert.ok(!err, err);
								cb();
							});
						},
						function(err) {
							assert.ok(!err, err);
							//don't call cb here
						});

					async.each(
						items,
						function(item, cb) {
							item.p({
								properties1: {
									test: false
								},
								properties2: [1, 2, 3, 4],
							});
							item.update(function(err) {
								assert.ok(!err, err);
								cb();
							});
						},
						function(err) {
							assert.ok(!err, err);
							//don't call cb here
						});
				}],
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should run a create job immediately success', function(done) {
			var Item2 = CGModel.getModel('Item2');
			var itemId = 100,
				id;
			var item = new Item2();
			item.itemId = itemId;
			async.series({
				create: function(cb) {
					item.db.once('updated', function(err) {
						assert.ok(!err, err);
						assert.ok(item.db.isSaved);
						id = item.id;
						assert.ok(!!id);
						cb();
					});
					item.create(function(err) {
						assert.ok(!err, err);
						assert.ok(item.db.isSaved);
					});
				},

				checkInCache: function(cb) {
					var item = new Item2();
					item.id = id;
					item.cache.load(function(err, res) {
						assert.ok(!err, err);
						assert.ok(!!res);
						cb();
					});
				},

				removeFromCache: function(cb) {
					var item = new Item2();
					item.id = id;
					item.cache.remove(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				checkInDB: function(cb) {
					var item = new Item2();
					item.id = id;
					item.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(item);
						cb();
					});
				}

			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should run a create job later success', function(done) {
			var Item2 = CGModel.getModel('Item2');
			var itemId = 100,
				id = 1;
			var item = new Item2();
			item.itemId = itemId;
			item.id = id;
			async.series({
				create: function(cb) {
					item.db.once('updated', function(err) {
						assert.ok(!err, err);
						assert.ok(item.db.isSaved);
						assert.ok(!!id);
						cb();
					});
					item.create(function(err) {
						assert.ok(!err, err);
					});
				},

				checkInCache: function(cb) {
					var item = new Item2();
					item.id = id;
					item.cache.load(function(err, res) {
						assert.ok(!err, err);
						assert.ok(!!res);
						cb();
					});
				},

				removeFromCache: function(cb) {
					var item = new Item2();
					item.id = id;
					item.cache.remove(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				checkInDB: function(cb) {
					var item = new Item2();
					item.id = id;
					item.load(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(item);
						cb();
					});
				}

			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should run many create jobs immediately success', function(done) {
			var Item2 = CGModel.getModel('Item2');
			var itemId = 100,
				ids = [];
			var count = 5;
			async.series({
				create: function(cb) {
					var items = _(0)
						.chain()
						.range(count)
						.map(function() {
							var item = new Item2();
							item.itemId = itemId;
							return item;
						})
						.value();

					var updateCount = 0;
					items.forEach(function(item) {
						item.db.once('updated', function(err) {
							assert.ok(!err, err);
							assert.ok(item.db.isSaved);
							var id = item.id;
							assert.ok(!!id);
							ids.push(id);
							updateCount++;
							if (updateCount === count) {
								cb();
							}
						});
					})
					async.each(
						items,
						function(item, cb) {

							item.create(function(err) {
								assert.ok(!err, err);
								assert.ok(item.db.isSaved);
								cb();
							})
						},
						function(err) {
							assert.ok(!err, err);
						})
				},

				checkInCache: function(cb) {
					async.eachSeries(
						ids,
						function(id, cb) {
							var item = new Item2();
							item.id = id;
							item.cache.load(function(err, res) {
								assert.ok(!err, err);
								assert.ok(!!res);
								cb();
							});
						},
						cb);
				},

				removeFromCache: function(cb) {
					async.eachSeries(
						ids,
						function(id, cb) {
							var item = new Item2();
							item.id = id;
							item.cache.remove(function(err) {
								assert.ok(!err, err);
								cb();
							});
						},
						cb);
				},

				checkInDB: function(cb) {
					async.eachSeries(
						ids,
						function(id, cb) {
							var item = new Item2();
							item.id = id;
							item.load(function(err) {
								assert.ok(!err, err);
								helper.checkModelIsLoaded(item);
								cb();
							});
						},
						cb);
				}

			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should run many create jobs later success', function(done) {
			var Item2 = CGModel.getModel('Item2');
			var itemId = 100,
				ids = [];
			var idBegin = 1;
			var count = 100;
			var items;
			async.series({
				create: function(cb) {
					items = _(idBegin)
						.chain()
						.range(idBegin + count)
						.map(function(id) {
							var item = new Item2();
							item.itemId = itemId;
							item.id = id;
							return item;
						})
						.value();

					async.each(
						items,
						function(item, cb) {

							item.create(function(err) {
								assert.ok(!err, err);
								cb();
							})
						},
						function(err) {
							assert.ok(!err, err);
							cb();
						})
				},

				update: function(cb) {
					var updateCount = 0;
					items.forEach(function(elem) {
						elem.db.once('updated', function(err) {
							assert.ok(!err, err);
							updateCount++;
							if (updateCount === items.length) {
								cb();
							}
						})
					});
					async.each(
						items,
						function(item, cb) {
							item.desc = 'test';
							item.update(cb);
						},
						function(err) {
							assert.ok(!err, err);
						});
				},

				checkInCache: function(cb) {
					async.eachSeries(
						ids,
						function(id, cb) {
							var item = new Item2();
							item.id = id;
							item.cache.load(function(err) {
								assert.ok(!err, err);
								assert.ok(item.cache.isSaved);
								cb();
							});
						},
						cb);
				},

				removeFromCache: function(cb) {
					async.eachSeries(
						ids,
						function(id, cb) {
							var item = new Item2();
							item.id = id;
							item.cache.remove(function(err) {
								assert.ok(!err, err);
								cb();
							});
						},
						cb);
				},

				checkInDB: function(cb) {
					async.eachSeries(
						ids,
						function(id, cb) {
							var item = new Item2();
							item.id = id;
							item.load(function(err) {
								assert.ok(!err, err);
								helper.checkModelIsLoaded(item);
								cb();
							});
						},
						cb);
				}

			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should create and remove a obj success', function(done) {
			var id = 1;
			var Item = CGModel.getModel('Item2NoAutoIncr');
			async.series({
				restartCronJob1: function(cb) {
					CGModel.initialize({
						'mysql_late': {
							'cron': '*/15 * * * * *',
							'batchCount': 3
						}
					});
					CGModel.restartJobs(cb);
				},

				create: function(cb) {
					var item = new Item();
					item.id = id;
					item.itemId = 100;
					item.create(function(err) {
						assert.ok(!err, err);

						item.remove(function(err) {
							assert.ok(!err, err);
							cb();
						});
					});
				},

				restartCronJob2: function(cb) {
					CGModel.initialize(require('./config/cg_model'));
					CGModel.restartJobs(cb);
				},

				check: function(cb) {
					var item = new Item();
					item.id = id;
					item.load(function(err) {
						assert.ok(!err, err);
						assert.ok(!item.mem.isLoaded);
						cb();
					});
				},

			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});
	});

	describe('create', function() {

		it('should create an item success', function(done) {
			var Item4 = CGModel.getModel('Item4');

			var item = new Item4();
			var id = 1;
			var itemId = 100;
			item.p({
				id: id,
				itemId: itemId,
			});
			async.series({
				create: function(cb) {
					item.db.once('updated', function(err) {
						assert.ok(!err, err);
						assert.ok(item.db.isSaved);
						assert.ok(item.mem.isLoaded);
						cb();
					})
					item.create(function(err) {
						assert.ok(!err, err);
					});
				},

				load: function(cb) {
					var item = new Item4();
					item.id = id;
					item.load(function(err) {
						assert.ok(!err, err);
						assert.ok(item.db.isSaved);
						assert.ok(item.mem.isLoaded);
						assert.equal(item.itemId, itemId);
						cb();
					})
				},

				remove: function(cb) {
					var item = new Item4();
					item.id = id;
					item.remove(function(err) {
						assert.ok(!err, err);
						assert.ok(!item.db.isSaved);
						assert.ok(!item.mem.isLoaded);
						cb();
					})
				},

				check: function(cb) {
					var item = new Item4();
					item.id = id;
					item.load(function(err) {
						assert.ok(!err, err);
						assert.ok(!item.db.isSaved);
						assert.ok(!item.mem.isLoaded);
						cb();
					})
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should create many items success', function(done) {
			var Item4 = CGModel.getModel('Item4');
			var count = 10;
			var ids = [];
			var itemId = 100;
			async.series({
				create: function(cb) {
					async.timesSeries(
						count,
						function(id, cb) {
							var item = new Item4();
							item.itemId = itemId;

							item.db.once('updated', function(err) {
								assert.ok(!err, err);
								assert.ok(item.db.isSaved);
								assert.ok(item.mem.isLoaded);
								ids.push(item.id);
								cb();
							})
							item.create(function(err) {
								assert.ok(!err, err);
							});
						},
						cb);
				},

				load: function(cb) {
					async.eachSeries(
						ids,
						function(id, cb) {
							var item = new Item4();
							item.id = id;
							item.load(function(err) {
								assert.ok(!err, err);
								assert.ok(item.db.isSaved);
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
							var item = new Item4();
							item.id = id;
							item.remove(function(err) {
								assert.ok(!err, err);
								assert.ok(!item.db.isSaved);
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
							var item = new Item4();
							item.id = id;
							item.load(function(err) {
								assert.ok(!err, err);
								assert.ok(!item.db.isSaved);
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

		it('should create a new user success', function(done) {

			var User2 = CGModel.getModel('User2');
			var userId;

			async.series({
				create: function(cb) {

					var user = new User2();
					user.create(function(err) {
						assert.ok(!err, err);
						userId = user.p('userId');
						helper.checkModelIsLoaded(user);
						cb();
					});
				},

				load: function(cb) {

					var user = new User2();
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
	});

	describe('createSync', function() {

		it('should create an item sync success', function(done) {
			var Item4 = CGModel.getModel('Item4');

			var item = new Item4();
			var id = 1;
			var itemId = 100;
			item.p({
				id: id,
				itemId: itemId,
			});
			async.series({
				create: function(cb) {
					item.createSync(function(err) {
						assert.ok(!err, err);
						assert.ok(item.db.isSaved);
						assert.ok(item.mem.isLoaded);
						cb();
					});
				},

				load: function(cb) {
					var item = new Item4();
					item.id = id;
					item.load(function(err) {
						assert.ok(!err, err);
						assert.ok(item.db.isSaved);
						assert.ok(item.mem.isLoaded);
						assert.equal(item.itemId, itemId);
						cb();
					})
				},

				remove: function(cb) {
					var item = new Item4();
					item.id = id;
					item.remove(function(err) {
						assert.ok(!err, err);
						assert.ok(!item.db.isSaved);
						assert.ok(!item.mem.isLoaded);
						cb();
					})
				},

				check: function(cb) {
					var item = new Item4();
					item.id = id;
					item.load(function(err) {
						assert.ok(!err, err);
						assert.ok(!item.db.isSaved);
						assert.ok(!item.mem.isLoaded);
						cb();
					})
				},
			}, function(err) {
				assert.ok(!err, err);
				done();
			})
		});

		it('should create many items sync success', function(done) {
			var Item4 = CGModel.getModel('Item4');
			var count = 10;
			var ids = [];
			var itemId = 100;
			async.series({
				create: function(cb) {
					async.timesSeries(
						count,
						function(id, cb) {
							var item = new Item4();
							item.itemId = itemId;
							item.createSync(function(err) {
								assert.ok(!err, err);
								assert.ok(item.db.isSaved);
								assert.ok(item.mem.isLoaded);
								ids.push(item.id);
								cb();
							});
						},
						cb);
				},

				load: function(cb) {
					async.eachSeries(
						ids,
						function(id, cb) {
							var item = new Item4();
							item.id = id;
							item.load(function(err) {
								assert.ok(!err, err);
								assert.ok(item.db.isSaved);
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
							var item = new Item4();
							item.id = id;
							item.remove(function(err) {
								assert.ok(!err, err);
								assert.ok(!item.db.isSaved);
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
							var item = new Item4();
							item.id = id;
							item.load(function(err) {
								assert.ok(!err, err);
								assert.ok(!item.db.isSaved);
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

		it('should create a new user sync success', function(done) {

			var User2 = CGModel.getModel('User2');
			var userId;

			async.series({
				create: function(cb) {

					var user = new User2();
					user.createSync(function(err) {
						assert.ok(!err, err);
						userId = user.p('userId');
						helper.checkModelIsLoaded(user);
						cb();
					});
				},

				load: function(cb) {

					var user = new User2();
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
	});

	describe('update', function() {

		it('should update friend async success', function(done) {
			var Friend2 = CGModel.getModel('Friend2');

			var userId = 1,
				friendId = 2;
			var friend;
			async.series({
				create: function(cb) {

					friend = new Friend2();
					friend.userId = userId;
					friend.friendId = friendId;
					friend.type = 0;

					friend.db.once('updated', function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(friend);
						cb();
					})
					friend.create(function(err) {
						assert.ok(!err, err);
					});
				},

				update: function(cb) {

					friend.type = 1;
					friend.db.once('updated', function(err) {
						assert.ok(!err, err);
						cb();
					});
					friend.update(function(err) {
						assert.ok(!err, err);
					});
				},

				check: function(cb) {
					var friend2 = new Friend2();
					friend2.userId = userId;
					friend2.friendId = friendId;
					friend2.db.load(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.type, friend.type);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});

		it('should update user success', function(done) {
			var User2 = CGModel.getModel('User2');

			var userId, user, name;

			async.series({
				create: function(cb) {

					user = new User2();
					user.createSync(function(err) {
						assert.ok(!err, err);
						userId = user.userId;
						name = user.name;
						helper.checkModelIsLoaded(user);
						cb();
					});
				},

				update: function(cb) {
					user.p({
						userId: userId,
						name: '0' + name,
					});
					user.db.once('updated', function(err) {
						assert.ok(!err, err);
						cb();
					});
					user.update(function(err) {
						assert.ok(!err, err);
					});
				},

				check: function(cb) {
					var user2 = new User2();
					user2.p('userId', userId);
					user2.load(function(err) {
						assert.ok(!err, err);
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
	});

	describe('updateSync', function() {

		it('should update a new friend sync success', function(done) {
			var Friend2 = CGModel.getModel('Friend2');

			var userId = 1,
				friendId = 2;
			var friend;
			async.series({
				create: function(cb) {

					friend = new Friend2();
					friend.userId = userId;
					friend.friendId = friendId;
					friend.type = 0;

					friend.createSync(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsLoaded(friend);
						cb();
					});
				},

				update: function(cb) {

					friend.type = 1;
					friend.updateSync(function(err) {
						assert.ok(!err, err);
						cb();
					});
				},

				check: function(cb) {
					var friend2 = new Friend2();
					friend2.userId = userId;
					friend2.friendId = friendId;
					friend2.db.load(function(err, res) {
						assert.ok(!err, err);
						assert.equal(res.type, friend.type);
						cb();
					})
				}
			}, function(err) {
				assert.ok(!err, err);
				done();
			});
		});
	});

	describe('remove', function() {

		it('should remove a user success', function(done) {
			var User2 = CGModel.getModel('User2');

			var userId;

			async.series({
				create: function(cb) {

					var user = new User2();
					user.createSync(function(err) {
						assert.ok(!err, err);
						userId = user.p('userId');
						helper.checkModelIsLoaded(user);
						cb();
					});
				},

				remove: function(cb) {
					var user = new User2();
					user.p('userId', userId);
					user.remove(function(err) {
						assert.ok(!err, err);
						helper.checkModelIsUnloaded(user);
						cb();
					});
				},

				load: function(cb) {

					var user = new User2();
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

	});
});