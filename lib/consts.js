'use strict';

var exp = module.exports;

exp.RESERVED = {
  JOBS: 'jobs',
};

exp.DataType = {

  MEMORY: 'memory',
  MEMORY_REMOTE: 'memory_remote', //remote process memory

  NONE: 'none',

  //db
  MYSQL: 'mysql',
  MYSQL_LATE: 'mysql_late',
  MYSQL_SHARD: 'mysql_shard',

  //cache
  REDIS: 'redis',
  REDIS_TTL: 'redis_ttl',
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
  MODEL: 'model',
  MODEL_ARRAY: 'model_array',
  MODEL_DICT: 'model_dict',
};

exp.DebugType = {
  INFO: 'info',
  SQL: 'sql',
  REDIS: 'redis',
  PROFILE: 'profile',
};

exp.Event = {
  UPDATED: 'updated',
  LOADED: 'loaded',
};

exp.MYSQL_SHARD_DB = 'mysql_shard_db';

exp.DEFAULT_BATCH_COUNT = 100;

exp.DEFAULT_BATCH_LOAD_INTERVAL = 50;