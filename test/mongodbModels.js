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

  name: 'Record10',

  props: {
    id:               { type: 'number', primary: true },
    recordTime:       { type: 'date' },
    propToBeDelete:   { type: 'number', defaultValue: 0 },
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


CGModel.createModel({

  name: 'Record12',

  props: {
    id:               { type: 'number', primary: true },
    recordTime:       { type: 'number' },
    propAdd:          { type: 'number', defaultValue: 0 },
  },

  db: {
    type: 'mongodb',
    db_name: 'cg_model_test',
    coll_name: 'user',
  },

  cache: {
    type: 'none',
  },

  upgradeFns: upgradeFns,
  version: 2,
});

CGModel.createModel({

  name: 'Record13',

  props: {
    id:               { type: 'number', primary: true },
    recordTime:       { type: 'number' },
    propAdd:          { type: 'array', defaultValue: [] },
  },

  db: {
    type: 'mongodb',
    db_name: 'cg_model_test',
    coll_name: 'user',
  },

  cache: {
    type: 'none',
  },

  upgradeFns: upgradeFns,
  version: 3,
});