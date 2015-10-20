'use strict';
var assert = require('assert');
var _ = require('underscore');
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

var genNowTime = function (cb) {
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
    db_name: 'cg_model_test',
    tbl_name: 'user',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
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
    db_name: 'cg_model_test',
    tbl_name: 'user',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
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
    db_name: 'cg_model_test',
    tbl_name: 'friend',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
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
    db_name: 'cg_model_test',
    tbl_name: 'friend',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
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
    updateTime:       { type: 'date', defaultValue: new Date('2014-1-1'), },
    properties1:      { type: 'object', defaultValue: {}, },
    properties2:      { type: 'array', defaultValue: [], },
  },

  db: {
    type: 'mysql',
    db_name: 'cg_model_test',
    tbl_name: 'item',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
    name: 'item',
    prefix: 'test',
  },
})

CGModel.createModel({

  name: 'Item2',

  props: {
    id:               { type: 'number', primary: true, autoIncr: true },
    itemId:           { type: 'number', index: true, },
    isLock:           { type: 'bool', defaultValue: false },
    desc:             { type: 'string', defaultValue: '' },
    updateTime:       { type: 'date', defaultValue: new Date('2014-1-1'), },
    properties1:      { type: 'object', defaultValue: {}, },
    properties2:      { type: 'array', defaultValue: [], },
  },

  db: {
    type: 'mysql_late',
    db_name: 'cg_model_test',
    tbl_name: 'item',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
    name: 'item',
    prefix: 'test',
  },
});

CGModel.createModel({

  name: 'Item2NoAutoIncr',

  props: {
    id:               { type: 'number', primary: true },
    itemId:           { type: 'number', index: true, },
    isLock:           { type: 'bool', defaultValue: false },
    desc:             { type: 'string', defaultValue: '' },
    updateTime:       { type: 'date', defaultValue: new Date('2014-1-1'), },
    properties1:      { type: 'object', defaultValue: {}, },
    properties2:      { type: 'array', defaultValue: [], },
  },

  db: {
    type: 'mysql_late',
    db_name: 'cg_model_test',
    tbl_name: 'item',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
    name: 'item',
    prefix: 'test',
  },
});


CGModel.createModel({

  name: 'Item3',

  props: {
    id:               { type: 'number', primary: true },
    itemId:           { type: 'number' },
    isLock:           { type: 'bool', defaultValue: false },
    desc:             { type: 'string', defaultValue: '' },
    updateTime:       { type: 'date', defaultValue: new Date('2014-1-1'), },
    properties1:      { type: 'object', defaultValue: {}, },
    properties2:      { type: 'array', defaultValue: [], },
  },

  db: {
    type: 'none',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
    name: 'item',
    prefix: 'test',
  },
});

CGModel.createModel({

  name: 'Item4',

  props: {
    id:               { type: 'number', primary: true, autoIncr: true },
    itemId:           { type: 'number', index: true, },
    isLock:           { type: 'bool', defaultValue: false },
    desc:             { type: 'string', defaultValue: '' },
    updateTime:       { type: 'date', defaultValue: new Date('2014-1-1'), },
    properties1:      { type: 'object', defaultValue: {}, },
    properties2:      { type: 'array', defaultValue: [], },
  },

  db: {
    type: 'mysql_late',
    db_name: 'cg_model_test',
    tbl_name: 'item',
  },

  cache: {
    type: 'none',
  },
});

CGModel.createModel({

  name: 'Item5',

  props: {
    id:               { type: 'number'  },
    itemId:           { type: 'number'  },
    isLock:           { type: 'bool'  },
    desc:             { type: 'string'  },
    updateTime:       { type: 'date'  },
    properties1:      { type: 'object'  },
    properties2:      { type: 'array'  },
  },

  db: {
    type: 'none',
  },

  cache: {
    type: 'none',
  },
});


CGModel.createModel({

  name: 'Item5Wrapper',

  props: {
    item:             { type: 'model', modelName: 'Item5' },
  },

  db: {
    type: 'none',
  },

  cache: {
    type: 'none',
  },
});


CGModel.createModel({

  name: 'Item5Array',

  props: {
    items:            { type: 'model_array', modelName: 'Item5' },
  },

  db: {
    type: 'none',
  },

  cache: {
    type: 'none',
  },
});


CGModel.createModel({

  name: 'Item5Dict',

  props: {
    items:            { type: 'model_dict', modelName: 'Item5' },
  },

  db: {
    type: 'none',
  },

  cache: {
    type: 'none',
  },
});

CGModel.createModel({

  name: 'Item6',

  props: {
    id:               { type: 'number', primary: true, autoIncr: true },
    itemId:           { type: 'number', index: true, defaultValue: 1 },
    isLock:           { type: 'bool', defaultValue: false },
    desc:             { type: 'string', defaultValue: '' },
    updateTime:       { type: 'date', defaultValue: new Date('2014-1-1'), },
    properties1:      { type: 'object', defaultValue: {}, },
    properties2:      { type: 'array', defaultValue: [], },
  },

  db: {
    type: 'mysql_late',
    db_name: 'cg_model_test',
    tbl_name: 'item',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
    name: 'item',
    prefix: 'test',
  },
});

CGModel.createModel({

  name: 'Record',

  props: {
    recordTime:       { type: 'date', primary: true },
  },

  db: {
    type: 'mysql',
    db_name: 'cg_model_test',
    tbl_name: 'record',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
    name: 'record',
    prefix: 'test',
  },
});


var upgradeFns = {};
upgradeFns[1] = function (data, cb) {
  
  if (isNaN(data.recordTime)) {
    data.recordTime = new Date(data.recordTime).getTime();
  } else {
    data.recordTime = new Date(Number(data.recordTime)).getTime();
  }
  cb();
}

upgradeFns[2] = function (data, cb) {
  
  delete data.propToBeDelete;
  var defaultValue = this.def.props.propAdd.defaultValue;
  if (defaultValue instanceof Function) {
    
    defaultValue(function(err, res) {
      if (!err) {
        data.propAdd = res;
      }
      cb(err);
    });
  } else {
    data.propAdd = defaultValue;
    cb();
  }
}

upgradeFns[3] = function (data, cb) {
  data.propAdd = [parseInt(data.propAdd, 10)];
  cb();
}

CGModel.createModel({

  name: 'Record0',

  props: {
    id:               { type: 'number', primary: true },
    recordTime:       { type: 'date' },
    propToBeDelete:   { type: 'number', defaultValue: 0 },
  },

  db: {
    type: 'none',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
    name: 'record',
    prefix: 'test',
  },
});


CGModel.createModel({

  name: 'Record2',

  props: {
    id:               { type: 'number', primary: true },
    recordTime:       { type: 'number' },
    propAdd:          { type: 'number', defaultValue: 0 },
  },

  db: {
    type: 'none',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
    name: 'record',
    prefix: 'test',
  },

  upgradeFns: upgradeFns,
  version: 2,
});

CGModel.createModel({

  name: 'Record3',

  props: {
    id:               { type: 'number', primary: true },
    recordTime:       { type: 'number' },
    propAdd:          { type: 'array', defaultValue: [] },
  },

  db: {
    type: 'none',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_test',
    name: 'record',
    prefix: 'test',
  },

  upgradeFns: upgradeFns,
  version: 3,
});