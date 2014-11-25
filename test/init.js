'use strict';
var mysql = require('mysql');
var redis = require('redis');
var CGModel = require('../lib');

// CGModel.debug_mode = true;

var pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'yqb',
  password: 'yqb',
  database: 'model_test',
  multipleStatements: true,
  // debug: ['ComQueryPacket'],
  // debug: ['ComQueryPacket', 'OkPacket'],
});

CGModel.setDBClient(pool);

var redisClient = redis.createClient();
CGModel.setCacheClient(redisClient);

CGModel.initialize(require('./cg_model'));