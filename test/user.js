'use strict';
var async = require('async');
var _ = require('underscore');
var model = require('../lib');

var def = {};

def.name = 'User';

def.props = {
  userId: {
    type: 'number',
  },
  name: {
    type: 'string',
  },
};

def.db = {};

def.db.static = {

  findIdByName: function(name, cb) {
    var sql = 'select userId from user where name = $name';
    var args = {
      name: name
    };
    this.conn.query(sql, args, cb);
  },

  findIdByNames: function(names, cb) {
    var sql = 'select userId from user where name in ($names)';
    var args = {
      names: names
    };
    this.conn.query(sql, args, cb);
  },

  find: function(args, cb) {
    var self = this;
    var type;
    if (args.userId !== undefined) {

      if (_.isNumber(args.userId)) {
        cb(null, [{
          userId: args.userId
        }]);
        return;

      } else if (_.isArray(args.userId)) {
        cb(null, _(args.userId).map(function(elem) {
          return {
            userId: elem
          };
        }));
        return;
      }
    } else if (args.name !== undefined) {

      if (_.isString(args.name)) {
        self.findIdByName(args.name, cb);
        return;

      } else if (_.isArray(args.name)) {
        self.findIdByNames(args.name, cb);
        return;
      }
    }
    assert.ok(false, 'unsupported find args:' + JSON.stringify(args));
  },
};

def.db.instance = {

  idGenerator: function(cb) {
    var sql = 'call gen_userId($count)';
    this.conn.query(sql, {
      count: 1
    }, function(err, res) {
      if (!!err) {
        cb(err);
        return;
      }
      cb(err, res[0][0].id);
    });
  },

  create: function(cb) {

    var self = this;
    async.series({

      genUserId: function(cb) {
        self.idGenerator(function(err, id) {
          if (!err) {
            self.p('userId', id);
          }
          cb(err);
        });
      },

      create: function(cb) {
        if (!self.p('name')) {
          self.p('name', 'test' + self.p('userId'));
        }

        var sql = 'insert into user (userId, name) values($userId, $name)';
        var args = {
          userId: self.p('userId'),
          name: self.p('name'),
        };
        self.conn.query(sql, args, cb);
      }
    }, cb);
  },

  remove: function(cb) {
    var sql = 'delete from user where userId = $userId';
    var args = {
      userId: this.p('userId'),
    };
    this.conn.query(sql, args, cb);
  },

  load: function(cb) {
    var sql = 'select * from user where userId = $userId';
    var args = {
      userId: this.p('userId'),
    };
    var self = this;
    self.conn.query(sql, args, function(err, res) {
      if (!!err) {
        cb(err);
        return;
      }
      cb(null, res[0]);
    });
  },

  update: function(cb) {
    var sql = 'update user set name = $name where userId = $userId';
    var args = {
      userId: this.p('userId'),
      name: this.p('name'),
    };
    this.conn.query(sql, args, cb);
  },
}

def.cache = {};

def.cache.static = {};

def.cache.instance = {

  create: function(cb) {

    var self = this;
    async.parallel({

      create: function(cb) {
        self.conn.hmset(
          'user:' + self.p('userId'),
          'userId', self.p('userId'),
          'name', self.p('name'),
          cb);
      },

      // createUnique: function(cb) {
      //   self.conn.set(
      //     'user:name:' + self.p('name'),
      //     self.p('userId'),
      //     cb);
      // },
    }, cb);
  },

  remove: function(cb) {
    this.conn.del('user:' + this.p('userId'), cb);
  },

  load: function(cb) {

    this.conn.hgetall('user:' + this.p('userId'), cb);
  },

  update: function(cb) {
    this.conn.hmset(
      'user:' + this.p('userId'),
      'userId', this.p('userId'),
      'name', this.p('name'),
      cb);
  },
};

model.createModel(def);