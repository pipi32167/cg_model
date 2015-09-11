'use strict';
var assert = require('assert');
var _ = require('underscore');
var async = require('async');
var mongodb = require('mongodb');
var CGModel = require('../lib');

// CGModel.debug_mode = true;

var mongodbConfig = require('./config/mongodb');

module.exports = function(cb) {

	async.each(
		_(mongodbConfig).pairs(),
		function(elem, cb) {
			var key, config;
			key = elem[0];
			config = elem[1];
			mongodb.MongoClient.connect(config.url, function(err, db) {
				assert.ok(!err, err);
				CGModel.setDBClient(key, db);
				cb();
			});
		},
		function(err) {
			assert.ok(!err, err);
			CGModel.initialize(require('./config/cg_model_mongodb'));
			cb();
		});
}