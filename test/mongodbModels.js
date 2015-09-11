'use strict';
var CGModel = require('../lib');

var i = 0;
var genUserId = function(cb) {
  cb(null, i++);
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
    type: 'mongodb',
    db_name: 'cg_model_test',
    coll_name: 'user',
  },

  cache: {
    type: 'none',
  },
});
