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
    db_name: 'model_test',
    tbl_name: 'user',
  },

  cache: {
    type: 'redis',
    cache_name: 'model_test',
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
    db_name: 'model_test',
    tbl_name: 'user',
  },

  cache: {
    type: 'redis',
    cache_name: 'model_test',
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
    db_name: 'model_test',
    tbl_name: 'friend',
  },

  cache: {
    type: 'redis',
    cache_name: 'model_test',
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
    db_name: 'model_test',
    tbl_name: 'friend',
  },

  cache: {
    type: 'redis',
    cache_name: 'model_test',
    name: 'friend',
    prefix: 'test',
  },
});

CGModel.createModel({

  name: 'Item',

  props: {
    id:               { type: 'number', primary: true, autoIncr: true },
    itemId:           { type: 'number', index: true, },
    isLock:           { type: 'bool', defaultValue: false },
    desc:             { type: 'string', defaultValue: '' },
    updateTime:       { type: 'date', defaultValue: new Date('2014-1-1'), }
  },

  db: {
    type: 'mysql',
    db_name: 'model_test',
    tbl_name: 'item',
  },

  cache: {
    type: 'redis',
    cache_name: 'model_test',
    name: 'item',
    prefix: 'test',
  },
})