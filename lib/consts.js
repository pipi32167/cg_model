'use strict';

var exp = module.exports;

exp.DataType = {
  MEMORY: 'memory',

  //db
  MYSQL: 'mysql',
  MYSQL_LATE: 'mysql_late',
  MYSQL_SHARDING: 'mysql_sharding',

  //cache
  REDIS: 'redis',
};