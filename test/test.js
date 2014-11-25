'use strict';
var _ = require('underscore');
var assert = require('assert');
var async = require('async');
var CGModel = require('../lib');
require('./init');
require('./models');

CGModel.debug_mode = false;

var User = CGModel.getModel('User');
var User2 = CGModel.getModel('User2');
var Friend = CGModel.getModel('Friend');
var Friend2 = CGModel.getModel('Friend2');
var Item = CGModel.getModel('Item');

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
      User.find({
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
          User.find({
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
          User.find({
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
          User.find({
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
          User.find({
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
          User.findAll(function(err, res) {
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
      Friend.find({
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
          Friend.find({
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
          Friend.find({
            friendId: 2
          }, function(err, res) {
            assert.ok(!err, err);
            assert.equal(res.length, 1);
            helper.checkModelIsLoaded(res[0]);
            cb();
          });
        },

        find3: function(cb) {
          Friend.find({
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
          Friend.find({
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
          Friend.find({
            userId: 2,
            friendId: [2, 3]
          }, function(err, res) {
            assert.ok(!err, err);
            assert.equal(res.length, 0);
            cb();
          });
        },

        find6: function(cb) {
          Friend.find({
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

    it('should create an item failed when not provide all required properties', function(done) {

      var item = new Item();
      item.create(function(err) {
        assert.ok(!!err, err);
        assert.ok(item.id === undefined);
        done();
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

        check: function(cb) {

          var item = new Item();
          item.id = itemInfo.id;
          item.load(function(err) {

            assert.ok(!err, err);
            helper.checkModelIsLoaded(item);
            assert.deepEqual(item.itemId, itemInfo.itemId);
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
      friend.create(function(err) {
        assert.ok(!err, err);
        assert.ok(friend.mem.isLoaded);
        assert.ok(friend.db.isSaved);
        assert.ok(friend.cache.isSaved);
        friends.push(friend);
        cb();
      });
    },
    function(err) {
      assert.ok(!err, err);
      cb(null, friends);
    });
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
      }
    }, function(err) {

      assert.ok(!err, err);
      done();
    })
  });

  before(function(done) {

    CGModel.startCronJob('mysql_late');
    done();
  });

  after(function(done) {

    CGModel.stopCronJob('mysql_late');
    done();
  });

  describe('Static methods', function() {

    it('should remove all data from db and cache', function(done) {
      User2.removeAll(function(err) {
        assert.ok(!err, err);
        done();
      })
    });

    it('should find no users success', function(done) {
      User2.find({
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
          User2.find({
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
          User2.find({
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
          User2.find({
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
          User2.find({
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
          User2.findAll(function(err, res) {
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

      var userId, user;

      async.series({
        create: function(cb) {

          user = new User2();
          user.create(function(err) {
            assert.ok(!err, err);
            userId = user.p('userId');
            helper.checkModelIsLoaded(user);
            cb();
          });
        },

        update: function(cb) {
          user.p('name', '0' + user.p('name'));
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
              done();
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

            assert.equal(user.registerTime, registerTime);
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

      var users, friends;

      async.auto({
        createUsers: function(cb) {
          helper.createUser2s(count, function(err, res) {
            assert.ok(!err, err);
            users = res;
            cb();
          });
        },

        createFriends: function(cb) {
          var userId = 1;
          var friendIds = _.range(2, 2 + friendCount);
          helper.createFriend2s(userId, friendIds, function(err, res) {
            assert.ok(!err, err);
            friends = res;
            cb();
          })
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
      }, function(err) {
        assert.ok(!err, err);
        done();
      })
    });
  });
});