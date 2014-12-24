'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('underscore');
var assert = require('assert');
var async = require('async');
var CGModel = require('../lib');
var utils = require('../lib/utils');
var consts = require('../lib/consts');
require('./init');
require('./models');

// CGModel.debug_mode = true;

// CGModel.setLogger({
//   info: console.log.bind(console),
//   warn: console.warn.bind(console),
//   error: console.error.bind(console),
//   debug: console.log.bind(console),
// });

var User = CGModel.getModel('User');
var User2 = CGModel.getModel('User2');
var Friend = CGModel.getModel('Friend');
var Friend2 = CGModel.getModel('Friend2');
var Item = CGModel.getModel('Item');
var Item2 = CGModel.getModel('Item2');
var Item3 = CGModel.getModel('Item3');
var Item4 = CGModel.getModel('Item4');
var Item5 = CGModel.getModel('Item5');
var Record = CGModel.getModel('Record');

var beforeDeepEqual = assert.deepEqual;
assert.deepEqual = function (v1, v2, m) {
  var type1 = utils.typeOf(v1);
  var type2 = utils.typeOf(v2);
  if (type1 === 'date' && 
    type2 === 'date') {
    beforeDeepEqual(v1.valueOf() - v1.getMilliseconds(), v2.valueOf() - v2.getMilliseconds(), m);
  } else {
    beforeDeepEqual(v1, v2, m);
  }
}

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

helper.checkModelIsLoaded = function(obj) {

  assert.ok(obj.mem.isLoaded);
  assert.ok(obj.db.isSaved);
  assert.ok(obj.cache.isSaved);

  var props = obj.def.props;
  var prop;
  for (prop in props) {
    if (props.hasOwnProperty(prop)) {
      assert.deepEqual(obj.mem.p(prop), obj.db.p(prop));
      assert.deepEqual(obj.mem.p(prop), obj.cache.p(prop));
    }
  }
}

helper.checkModelIsUnloaded = function(obj) {

  assert.ok(!obj.mem.isLoaded);
  assert.ok(!obj.db.isSaved);
  assert.ok(!obj.cache.isSaved);
}

beforeEach(function(done) {
  CGModel.initialize(require('./config/cg_model'));
  CGModel.startCronJob('mysql_late');
  done();
})

afterEach(function(done) {
  CGModel.stopCronJob('mysql_late', done);
})


describe('User Model', function() {
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

      var count = 5;
      var users;
      var userIds;
      async.series({

        createUsers: function(cb) {
          helper.createUsers(count, function(err, res) {
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

    it('should update many users success', function(done) {

      var count = 5;
      var users;
      var userIds;
      async.series({

        createUsers: function(cb) {
          helper.createUsers(count, function(err, res) {
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

        // removeFromCache2: function(cb) {
        //   users[0].cache.remove(function(err) {
        //     assert.ok(!err, err);
        //     cb();
        //   })
        // },

        // checkInDB2: function(cb) {
        //   User.load({
        //     userId: users[0].userId
        //   }, function(err, users) {
        //     assert.ok(!err, err);
        //     assert.equal(users[0].money, 9999);
        //     cb();
        //   });
        // }
      }, function(err) {
        assert.ok(!err, err);
        done();
      });
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

    it('should access by property of object success', function(done) {

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

    it('should update user success', function(done) {

      var userId, user;

      async.series({
        create: function(cb) {

          user = new User();
          user.create(function(err) {
            assert.ok(!err, err);
            userId = user.p('userId');
            helper.checkModelIsLoaded(user);
            cb();
          });
        },

        update: function(cb) {
          user.p({
            userId: user.userId,
            name: '0' + user.name,
          });
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

    it('should set primary key success', function() {
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

    it('should update user success', function(done) {

      var userId, user;

      async.series({
        create: function(cb) {

          user = new User();
          user.create(function(err) {
            assert.ok(!err, err);
            userId = user.p('userId');
            helper.checkModelIsLoaded(user);
            cb();
          });
        },

        update: function(cb) {
          user.p({
            userId: user.userId,
            name: 1,
          });

          assert.throws(function() {

            user.update(function(err) {
              assert.ok(!err, err);
            });
          });
          cb();
        },

      }, function(err) {
        assert.ok(!err, err);
        done();
      });
    });
  });
});

helper.createFriends = function(userId, friendIds, cb) {
  async.eachSeries(
    friendIds,
    function(friendId, cb) {
      var friend = new Friend();
      friend.p({
        userId: userId,
        friendId: friendId,
        type: 0
      });
      friend.create(function(err) {
        assert.ok(!err, err);
        assert.ok(friend.mem.isLoaded);
        assert.ok(friend.db.isSaved);
        assert.ok(friend.cache.isSaved);
        cb();
      })
    },
    cb);
}

describe('Friend Model', function() {

  beforeEach(function(done) {
    Friend.removeAll(function(err) {
      assert.ok(!err, err);
      done();
    })
  });

  describe('static methods', function() {
    it('should remove all data from db and cache', function(done) {

      var userId = 1;
      var friendIds = [2, 3, 4, 5];
      async.series({
        createFriends: function(cb) {
          helper.createFriends(userId, friendIds, cb);
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

    it('should find no friends success', function(done) {
      Friend.load({
        userId: 1
      }, function(err, res) {
        assert.ok(!err, err);
        assert.equal(res.length, 0);
        done();
      });
    });

    it('should find friends success when specified userId', function(done) {
      var userId = 1;
      var friendIds = [2, 3, 4, 5];
      async.series({
        createFriends: function(cb) {
          helper.createFriends(userId, friendIds, cb);
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
  });

  describe('instance methods', function() {

    it('should create a new friend success', function(done) {

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

    it('should create and remove a friend success', function(done) {
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

    it('should update friend success', function(done) {
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
});

var ItemSuper = function() {

}

var ItemSub = function() {
  Item.call(this);
  ItemSuper.call(this);
  EventEmitter.call(this);
}

_.extend(ItemSub.prototype, Item.prototype);
_.extend(ItemSub.prototype, ItemSuper.prototype);
_.extend(ItemSub.prototype, EventEmitter.prototype);

describe('Item Model', function() {
  beforeEach(function(done) {
    Item.removeAll(function(err) {
      assert.ok(!err, err);
      done();
    });
  });

  describe('auto increment', function() {
    it('should create an item with an auto increment id', function(done) {
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

      var item = new Item();
      assert.throws(function() {
        item.create(function() {});
      });

    });

    it('should create many items success', function(done) {
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
  });

  describe('sub class', function() {
    it('should call CRUD success', function(done) {
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
  });
});

helper.createUser2s = function(count, cb) {

  var users = [];
  async.timesSeries(
    count,
    function(idx, cb) {
      var user = new User2();
      user.p('userId', idx);
      user.create(function(err) {
        assert.ok(!err, err);
        users.push(user);
        cb();
      })
    },
    function(err) {
      assert.ok(!err, err);
      cb(null, users);
    });
}

helper.createFriend2s = function(userId, friendIds, cb) {
  var friends = [];
  async.eachSeries(
    friendIds,
    function(friendId, cb) {
      var friend = new Friend2();
      friend.p({
        userId: userId,
        friendId: friendId,
        type: 0
      });
      friend.db.once('updated', function(err) {
        assert.ok(!err, err);
        helper.checkModelIsLoaded(friend);
        friends.push(friend);
        cb();
      })
      friend.create(function(err) {
        assert.ok(!err, err);
      });
    },
    function(err) {
      assert.ok(!err, err);
      cb(null, friends);
    });
}

helper.createItem2s = function(ids, cb) {
  var items = [];
  async.eachSeries(
    ids,
    function(id, cb) {
      var item = new Item2();
      item.p({
        id: id,
        itemId: 100,
      });
      item.db.once('updated', function(err) {
        assert.ok(!err, err);
        helper.checkModelIsLoaded(item);
        items.push(item);
        cb();
      })
      item.create(function(err) {
        assert.ok(!err, err);
      });
    },
    function(err) {
      assert.ok(!err, err);
      cb(null, items);
    })
}

describe('DataMySqlLate', function() {

  beforeEach(function(done) {

    async.parallel({
      clearUser: function(cb) {
        User2.removeAll(function(err) {
          assert.ok(!err, err);
          cb();
        })
      },

      clearFriend: function(cb) {
        Friend2.removeAll(function(err) {
          assert.ok(!err, err);
          cb();
        })
      },

      clearItem: function(cb) {
        Item2.removeAll(function(err) {
          assert.ok(!err, err);
          cb();
        });
      },
    }, function(err) {

      assert.ok(!err, err);
      done();
    })
  });

  describe('Static methods', function() {

    it('should remove all data from db and cache', function(done) {
      User2.removeAll(function(err) {
        assert.ok(!err, err);
        done();
      })
    });

    it('should find no users success', function(done) {
      User2.load({
        userId: 1
      }, function(err, res) {
        assert.ok(!err, err);
        assert.equal(res.length, 0);
        done();
      });
    });

    it('should find a user success', function(done) {
      var userId, name;
      async.series({

        createUser: function(cb) {
          var user = new User2();
          user.create(function(err) {
            assert.ok(!err, err);
            userId = user.p('userId');
            name = user.p('name');
            helper.checkModelIsLoaded(user);
            cb();
          });
        },

        findUserByUserId: function(cb) {
          User2.load({
            userId: userId
          }, function(err, res) {
            assert.ok(!err, err);
            assert.equal(res.length, 1);
            assert.equal(res[0].p('userId'), userId);
            assert.equal(res[0].p('name'), name);
            helper.checkModelIsLoaded(res[0]);
            cb();
          });
        },

        findUserByName: function(cb) {
          User2.load({
            name: name
          }, function(err, res) {

            assert.ok(!err, err);
            assert.equal(res.length, 1);
            assert.equal(res[0].p('userId'), userId);
            assert.equal(res[0].p('name'), name);
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
          var userIds = _(users).map(function(elem) {
            return elem.p('userId');
          });
          User2.load({
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
          User2.load({
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
          User2.loadAll(function(err, res) {
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

    it('should count all users success', function(done) {

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

    it('should count users by arguments success', function(done) {

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

    it('should remove users by arguments success', function(done) {

      var count = 5;
      var users;
      var userIds;
      async.series({

        createUsers: function(cb) {
          helper.createUsers(count, function(err, res) {
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

      var userId1 = 1;
      var friendIds1 = [2, 3, 4, 5];
      async.series({

        createFriends1: function(cb) {
          helper.createFriends(userId1, friendIds1, function(err) {
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

      var friendId = 5;
      var userId1 = 1;
      var userId2 = 2;
      async.series({

        createFriends1: function(cb) {
          helper.createFriends(userId1, [friendId], function(err) {
            assert.ok(!err, err);
            cb();
          });
        },

        createFriends2: function(cb) {
          helper.createFriends(userId2, [friendId], function(err) {
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

  describe('Instance methods', function() {

    it('should create a new user success', function(done) {

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

    it('should create and update a new friend async success', function(done) {

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
          friend2.db.load(function(err) {
            assert.ok(!err, err);
            assert.equal(friend2.db.p('type'), friend.type);
            cb();
          })
        }
      }, function(err) {
        assert.ok(!err, err);
        done();
      });
    });

    it('should create and update a new friend sync success', function(done) {

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
          friend2.db.load(function(err) {
            assert.ok(!err, err);
            assert.equal(friend2.db.p('type'), friend.type);
            cb();
          })
        }
      }, function(err) {
        assert.ok(!err, err);
        done();
      });
    });


    it('should access by property of object success', function(done) {

      var userId;

      async.series({
        create: function(cb) {

          var user = new User2();
          user.create(function(err) {
            assert.ok(!err, err);
            userId = user.userId;
            helper.checkModelIsLoaded(user);
            cb();
          });
        },

        load: function(cb) {

          var user = new User2();
          user.userId = userId;
          user.load(function(err) {
            assert.ok(!err, err);
            helper.checkModelIsLoaded(user);
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

          var user = new User2();
          user.create(function(err) {
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

    it('should update user success', function(done) {

      var userId, user, name;

      async.series({
        create: function(cb) {

          user = new User2();
          user.create(function(err) {
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

  describe('CronJob', function() {

    it('should run a job later success', function(done) {

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
      var count = 5;
      var updateCount = 0;

      var users;

      async.series({
        createUsers: function(cb) {
          helper.createUser2s(count, function(err, res) {
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

    it('should run many different jobs later success', function(done) {
      var count = 5;
      var updateCount = 0;
      var friendCount = 5;
      var friendUpdateCount = 0;
      var itemCount = 5;
      var itemUpdateCount = 0;

      var users, friends, items;

      async.auto({
        createUsers: function(cb) {
          helper.createUser2s(count, function(err, res) {
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
          helper.createFriend2s(userId, friendIds, function(err, res) {
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
          helper.createItem2s(ids, function(err, res) {
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
          item.cache.load(function(err) {
            assert.ok(!err, err);
            assert.ok(item.cache.isSaved);
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
            assert.ok(!item.db.isSaved);
          });
        },

        checkInCache: function(cb) {
          var item = new Item2();
          item.id = id;
          item.cache.load(function(err) {
            assert.ok(!err, err);
            assert.ok(item.cache.isSaved);
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

    it('should run many create jobs later success', function(done) {

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
                assert.ok(!item.db.isSaved);
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
          CGModel.restartCronJob('mysql_late', cb);
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
          CGModel.restartCronJob('mysql_late', cb);
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
});

describe('DataCache', function() {
  beforeEach(function(done) {
    Item3.cache.conn.flushall(done);
  })
  describe('Instance methods', function() {
    it('should create an item success', function(done) {

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
            assert.deepEqual(item.updateTime, item2.updateTime);
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

describe('DataMySql', function() {
  beforeEach(function(done) {
    async.parallel([

      Item4.removeAll.bind(Item4),

      Record.removeAll.bind(Record),
    ], function(err) {
      assert.ok(!err, err);
      done();
    })
  })
  describe('Instance methods', function() {
    it('should create an item success', function(done) {

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

    it('should create a record success', function(done) {
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
      }, function (err) {
        assert.ok(!err, err);
        done();
      })
    });
  });
});

describe('CGModel', function() {
  it('should restart cron job success', function(done) {
    CGModel.restartCronJob('mysql_late', done);
  });
});

describe('DataMem', function() {
  it('should check properties success', function() {

    var item = {};
    assert.throws(function() {
      Item5.checkProps(item);
    });

    item = {
      id: '1'
    };
    assert.throws(function() {
      Item5.checkProps(item);
    });

    item = {
      id: 1,
      itemId: 1,
      isLock: true,
      desc: '',
      updateTime: new Date(),
      properties1: {},
      properties2: [],
    };
    Item5.checkProps(item);

    item = {
      id: 1,
      itemId: 1,
      isLock: true,
      desc: '',
      updateTime: new Date().toString(),
      properties1: {},
      properties2: [],
    };
    assert.throws(function() {
      Item5.checkProps(item);
    });

    item = {
      id: 1,
      itemId: 1,
      isLock: true,
      desc: '',
      updateTime: new Date(),
      properties1: [],
      properties2: [],
    };
    assert.throws(function() {
      Item5.checkProps(item);
    });

    item = {
      id: 1,
      itemId: 1,
      isLock: true,
      desc: '',
      updateTime: new Date(),
      properties1: [],
      properties2: {},
    };
    assert.throws(function() {
      Item5.checkProps(item);
    });

    item = {
      id: 1,
      itemId: 1,
      isLock: false,
      desc: '',
      updateTime: new Date(),
      properties1: {},
      properties2: [],
    };
    Item5.checkProps(item);

  });

  it('should check item wrapper properties success', function() {
    var Item5Wrapper = CGModel.getModel('Item5Wrapper');
    var wrapper = {
      item: {
        id: 1,
        itemId: 1,
        isLock: false,
        desc: '',
        updateTime: new Date(),
        properties1: {},
        properties2: [],
      }
    };

    Item5Wrapper.checkProps(wrapper);

    wrapper = {};
    assert.throws(function() {
      Item5Wrapper.checkProps(wrapper);
    });

    wrapper = {
      item: {
        id: '1',
        itemId: 1,
        isLock: false,
        desc: '',
        updateTime: new Date(),
        properties1: {},
        properties2: [],
      }
    };
    assert.throws(function() {
      Item5Wrapper.checkProps(wrapper);
    });
  });

  it('should check item array properties success', function() {
    var Item5Array = CGModel.getModel('Item5Array');
    var array = {};

    assert.throws(function() {
      Item5Array.checkProps(array);
    });

    array = {
      items: {}
    };
    assert.throws(function() {
      Item5Array.checkProps(array);
    });

    array = {
      items: [{
        id: '1',
        itemId: 1,
        isLock: false,
        desc: '',
        updateTime: new Date(),
        properties1: {},
        properties2: [],
      }]
    };
    assert.throws(function() {
      Item5Array.checkProps(array);
    });
    array = {
      items: [{
        id: 1,
        itemId: 1,
        isLock: false,
        desc: '',
        updateTime: new Date(),
        properties1: {},
        properties2: [],
      }, {
        id: 1,
        itemId: 1,
        isLock: false,
        desc: '',
        updateTime: new Date().toString(),
        properties1: {},
        properties2: [],
      }]
    };
    assert.throws(function() {
      Item5Array.checkProps(array);
    });

    array = {
      items: [{
        id: 1,
        itemId: 1,
        isLock: false,
        desc: '',
        updateTime: new Date(),
        properties1: {},
        properties2: [],
      }, {
        id: 1,
        itemId: 1,
        isLock: false,
        desc: '',
        updateTime: new Date(),
        properties1: {},
        properties2: [],
      }]
    };
    Item5Array.checkProps(array);
  });


  it('should check item dict properties success', function() {
    var Item5Dict = CGModel.getModel('Item5Dict');
    var dict = {};

    assert.throws(function() {
      Item5Dict.checkProps(dict);
    });

    dict = {
      items: ''
    };
    assert.throws(function() {
      Item5Dict.checkProps(dict);
    });

    dict = {
      items: {}
    };
    Item5Dict.checkProps(dict);

    dict = {
      items: {
        item1: {}
      }
    };
    assert.throws(function() {
      Item5Dict.checkProps(dict);
    });

    dict = {
      items: {
        item1: {
          id: '1',
          itemId: 1,
          isLock: false,
          desc: '',
          updateTime: new Date(),
          properties1: {},
          properties2: [],
        }
      }
    };
    assert.throws(function() {
      Item5Dict.checkProps(dict);
    });

    dict = {
      items: {
        item1: {
          id: 1,
          itemId: 1,
          isLock: false,
          desc: '',
          updateTime: new Date(),
          properties1: {},
          properties2: [],
        },

        item2: {
          id: 1,
          itemId: 1,
          isLock: false,
          desc: '',
          updateTime: new Date().toString(),
          properties1: {},
          properties2: [],
        }
      }
    };
    assert.throws(function() {
      Item5Dict.checkProps(dict);
    });

    dict = {
      items: {
        item1: {
          id: 1,
          itemId: 1,
          isLock: false,
          desc: '',
          updateTime: new Date(),
          properties1: {},
          properties2: [],
        },

        item2: {
          id: 1,
          itemId: 1,
          isLock: false,
          desc: '',
          updateTime: new Date(),
          properties1: {},
          properties2: [],
        }
      }
    };
    Item5Dict.checkProps(dict);
  })
});