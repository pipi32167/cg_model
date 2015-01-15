'use strict';

var CGModel = require('../lib');

CGModel.createModel({
  name: 'LoadObject',

  props: {
    objId:             	{ type: 'number', primary: true, autoIncr: true },
    property1:          { type: 'number', defaultValue: 0 },
    property2:          { type: 'string', defaultValue: 'testtest' },
  },

  db: {
    type: 'mysql',
    db_name: 'cg_model_benchmark',
    tbl_name: 'LoadObject',
  },

  cache: {
    type: 'none',
  },
});

CGModel.createModel({
  name: 'LoadObject2',

  props: {
    objId:             	{ type: 'number', primary: true, autoIncr: true },
    property1:          { type: 'number', defaultValue: 0 },
    property2:          { type: 'string', defaultValue: 'testtest' },
  },

  db: {
    type: 'mysql',
    db_name: 'cg_model_benchmark',
    tbl_name: 'LoadObject',
  },

  cache: {
    type: 'redis',
    cache_name: 'cg_model_benchmark',
    name: 'loadobject',
    prefix: 'benchmark',
  },
});