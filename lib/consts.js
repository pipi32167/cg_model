'use strict';

var exp = module.exports;

exp.DataType = {

  MEMORY: 'memory',
  MEMORY_REMOTE: 'memory_remote', //remote process memory

  NONE: 'none',

  //db
  MYSQL: 'mysql',
  MYSQL_LATE: 'mysql_late',
  MYSQL_SHARDING: 'mysql_sharding',

  //cache
  REDIS: 'redis',
};

exp.ConnType = {

  DB: 'db',
  CACHE: 'cache',
};

exp.PropType = {

  NUMBER: 'number',
  DATE: 'date',
  STRING: 'string',
  ARRAY: 'array',
  OBJECT: 'object',
  BOOL: 'bool',
};