'use strict';

var _ = require('underscore');
var assert = require('assert');
var async = require('async');
var utils = require('../lib/utils');

var exp = module.exports;

var beforeDeepEqual = assert.deepEqual;
assert.deepEqual = function(v1, v2, m) {
	var type1 = utils.typeOf(v1);
	var type2 = utils.typeOf(v2);
	if (type1 === 'date' &&
		type2 === 'date') {
		beforeDeepEqual(v1.valueOf() - v1.getMilliseconds(), v2.valueOf() - v2.getMilliseconds(), m);
	} else {
		beforeDeepEqual(v1, v2, m);
	}
}

exp.createModels = function(Model, args, cb) {

	if (typeof args === 'number') {
		args = _(0)
			.chain()
			.range(args)
			.map(function() {
				return {};
			})
			.value();
	}
	assert.ok(_.isArray(args));
	var res = [];
	async.eachSeries(
		args,
		function(args, cb) {
			var model = new Model();
			model.p(args);
			model.createSync(function(err) {
				assert.ok(!err, err);
				res.push(model);
				cb();
			})
		},
		function(err) {
			assert.ok(!err, err);
			cb(null, res);
		});
}

exp.checkModelIsLoaded = function(obj) {

	assert.ok(obj.mem.isLoaded);
	assert.ok(obj.db.isSaved);
	assert.ok(obj.cache.isSaved);

	var props = obj.def.props;
	var prop;
	for (prop in props) {
		if (props.hasOwnProperty(prop)) {
			assert.deepEqual(obj.mem.p(prop), obj.db.p(prop));
			assert.deepEqual(obj.mem.p(prop), obj.cache.p(prop));
		}
	}
}

exp.checkModelIsUnloaded = function(obj) {

	assert.ok(!obj.mem.isLoaded);
	assert.ok(!obj.db.isSaved);
	assert.ok(!obj.cache.isSaved);
}