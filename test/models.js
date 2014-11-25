'use strict';
require('./init');
var CGModel = require('../lib');

var genUserId = function(cb) {
  var sql = 'call gen_userId(1)';
  this.db.conn.query(sql, [], function(err, res) {
    if (!!err) {
      cb(err);
      return;
    }
    cb(null, res[0][0].id);
  });
}

var genName = function(cb) {
  cb(null, 'test' + this.p('userId'));
}

var genRegisterTime = function(cb) {
  cb(null, new Date());
}

CGModel.createModel({
  name: 'User',

  props: {
    userId:             { type: 'number', primary: true, defaultValue: genUserId, },
    name:               { type: 'string', unique: true, defaultValue: genName, },
    money:              { type: 'number', sync: true, defaultValue: 0, },
    registerTime:       { type: 'date', defaultValue: genRegisterTime, },
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

CGModel.createModel({
  name: 'User2',

  props: {
    userId:             { type: 'number', primary: true, defaultValue: genUserId, },
    name:               { type: 'string', unique: true, defaultValue: genName },
    money:              { type: 'number', sync: true, defaultValue: 0, },
    registerTime:       { type: 'date', defaultValue: genRegisterTime },
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

var genAssistTime = function(cb) {
  cb(null, new Date('2001-1-1'));
};

CGModel.createModel({

  name: 'Friend',

  props: {
    userId:             { type: 'number', primary: true, },
    friendId:           { type: 'number', primary: true, },
    type:               { type: 'number', },
    assistTime:         { type: 'date', defaultValue: genAssistTime },
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

CGModel.createModel({

  name: 'Friend2',

  props: {
    userId:             { type: 'number', primary: true, },
    friendId:           { type: 'number', primary: true, },
    type:               { type: 'number', },
    assistTime:         { type: 'date', defaultValue: genAssistTime },
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

CGModel.createModel({

  name: 'Item',

  props: {
    id:               { type: 'number', primary: true, autoIncr: true },
    itemId:           { type: 'number', index: true, },
  },

  db: {
    type: 'mysql',
    tbl_name: 'item',
  },

  cache: {
    type: 'redis',
    name: 'item',
    prefix: 'test',
  },
})