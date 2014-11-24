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

var Friend = model.createModel({

  name: 'Friend',

  props: {
    userId: {
      type: 'number',
      primary: true,
    },
    friendId: {
      type: 'number',
      primary: true,
    },
    type: {
      type: 'number',
    },
    assistTime: {
      type: 'date',
      defaultValue: function(cb) {
        cb(null, new Date('2001-1-1'));
      }
    },
  },

  db: {
    type: 'mysql',
    tbl_name: 'friend',
  },

  cache: {
    type: 'redis',
    name: 'friend',
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
      var userId, name;
      async.series({

        createUser: function(cb) {
          var user = new User();
          user.create(function(err) {
            assert.ok(!err, err);
            userId = user.p('userId');
            name = user.p('name');
            helper.checkModelIsLoaded(user);
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
            helper.checkModelIsLoaded(res[0]);
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
            assert.equal(friend2.p('assistTime'), friend1.p('assistTime'));
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

var User2 = model.createModel({
  name: 'User2',

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
    type: 'mysql_late',
    tbl_name: 'user',
  },

  cache: {
    type: 'redis',
    name: 'user',
    prefix: 'test',
  },
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

var Friend2 = model.createModel({

  name: 'Friend2',

  props: {
    userId: {
      type: 'number',
      primary: true,
    },
    friendId: {
      type: 'number',
      primary: true,
    },
    type: {
      type: 'number',
    },
    assistTime: {
      type: 'date',
      defaultValue: function(cb) {
        cb(null, new Date('2001-1-1'));
      }
    },
  },

  db: {
    type: 'mysql_late',
    tbl_name: 'friend',
  },

  cache: {
    type: 'redis',
    name: 'friend',
    prefix: 'test',
  },
});

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

    model.startCronJob('mysql_late');
    done();
  });

  after(function(done) {

    model.stopCronJob('mysql_late');
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

    it('should run a job late success', function(done) {
      var user = new User2();
      user.p('userId', 1);

      user.create(function(err) {
        assert.ok(!err, err);

        user.p('name', '0' + user.p('name'));
        user.db.once('updated', function() {
          done();
        });
        user.update(function(err) {
          assert.ok(!err, err);
        });
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
              user.p('name', '0' + user.p('name'));
              user.update(function(err) {
                assert.ok(!err, err);
                cb();
              })
            },
            function (err) {
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