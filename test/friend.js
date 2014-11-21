'use strict';
var async = require('async');
var _ = require('underscore');
var model = require('../lib');

var def = {};

def.name = 'Friend';

def.props = {
  userId:               { type: 'number', },
  friendId:             { type: 'number', },
  type:                 { type: 'number', },
  assistTime:           { type: 'date', defaultValue: new Date('2001-1-1') },
  sendStrength:         { type: 'number', defaultValue: 0 },
  sendTime:             { type: 'date', defaultValue: new Date('2001-1-1') },
  recvStrength:         { type: 'number', defaultValue: 0 },
  recvTime:             { type: 'date', defaultValue: new Date('2001-1-1') },
  freeSuperSkillTime:   { type: 'date', defaultValue: new Date('2001-1-1') },
};

def.db = {};

def.db.static = {

  find: function(args, cb) {
    var self = this;
    var type;
    if (args.userId !== undefined) {
      if (_.isNumber(args.userId)) {
        cb(null, [{
          userId: args.userId
        }]);
        return;
      } 
    }
    assert.ok(false, 'unsupported find args:' + JSON.stringify(args));
  },
};

def.db.instance = {

  create: function(cb) {

    var self = this;
    async.series({

      create: function(cb) {
        var sql = 'insert into Friend ($$fields) values ($values)';
        var fields = _(self.props).keys();
        var values = _(fields).map(function (elem) {
          return self.p(elem);
        });
        var args = {
          fields: fields, 
          values: values,
        };
        self.conn.query(sql, args, cb);
      }
    }, cb);
  },

  remove: function(cb) {
    var sql = 'delete from Friend where userId = $userId and friendId = $friendId';
    var args = {
      userId: this.p('userId'),
      friendId: this.p('friendId'),
    };
    this.conn.query(sql, args, cb);
  },

  load: function(cb) {
    var sql = 'select * from Friend where userId = $userId and friendId = $friendId';
    var args = {
      userId: this.p('userId'),
      friendId: this.p('friendId'),
    };
    this.conn.query(sql, args, function(err, res) {
      if (!!err) {
        cb(err);
        return;
      }
      cb(null, res[0]);
    });
  },

  update: function(cb) {
    var sql = '\
update Friend set \
type = $type \
assistTime = $assistTime \
sendStrength = $sendStrength \
sendTime = $sendTime \
recvStrength = $recvStrength \
recvTime = $recvTime \
freeSuperSkillTime = $freeSuperSkillTime \
where userId = $userId and friendId = $friendId';
    var args = {
      userId: this.p('userId'),
      friendId: this.p('friendId'),
      type: this.p('type'),
      assistTime: this.p('assistTime'),
      sendStrength: this.p('sendStrength'),
      sendTime: this.p('sendTime'),
      recvStrength: this.p('recvStrength'),
      recvTime: this.p('recvTime'),
      freeSuperSkillTime: this.p('freeSuperSkillTime'),
    };
    this.conn.query(sql, args, cb);
  },
}

def.cache = {};

def.cache.static = {};

def.cache.instance = {

  getHashKey: function () {
    return 'friend:' + this.p('userId') + ':' + this.p('friendId'); 
  },

  create: function(cb) {
    this.update(cb);
  },

  remove: function(cb) {
    this.conn.del(this.getHashKey(), cb);
  },

  load: function(cb) {

    this.conn.hgetall(this.getHashKey(), cb);
  },

  update: function(cb) {
    var args = [this.getHashKey()];
    var props = this.props;
    var prop;
    for (prop in props) {
      if (props.hasOwnProperty(prop) && 
        this.isChange(prop)) {
        args.push(prop);
        args.push(this.p(prop));
      }
    }
    args.push(cb);

    this.conn.hmset.apply(this.conn, args);
  },
};

model.createModel(def);