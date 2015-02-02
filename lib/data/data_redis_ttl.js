'use strict';
var async = require('async');
// var _s = require('underscore.string');
var _ = require('underscore');
// var assert = require('assert');
// var util = require('util');
var Data = require('./data');
var consts = require('../consts');
// var utils = require('../utils');

var getExpireMilliseconds = function(lib, def) {
	if (def.cache.expire) {
		return def.cache.expire;
	}

	var config = lib.get(consts.DataType.REDIS_TTL);
	if (config && config.expire) {
		return config.expire;
	}

	return 24 * 60 * 60 * 1000; //default expired in 24 hours
}

module.exports = function(lib, def, connType) {
	var DataRedisTTLBase = require('./data_redis')(lib, def, connType);

	var DataRedisTTL = function(lib, model) {
		DataRedisTTLBase.call(this, lib, model);

		this.expireMilliseconds = getExpireMilliseconds(lib, def);
	}

	_.extend(DataRedisTTL.prototype, DataRedisTTLBase.prototype);
	_.extend(DataRedisTTL, DataRedisTTLBase);

	DataRedisTTL.prototype.update = function(cb) {
		var unsavedProps = this.getUnsavedProps(this);
		if (unsavedProps.length === 0) {
			cb();
			return;
		}
		var self = this;
		var hashKey = this.genHashKey.call(this);
		// console.log('update', hashKey);
		var mem = this.model.mem;
		var props = this.model.def.props;
		var updateArgs = _(unsavedProps)
			.chain()
			.map(function(elem) {
				var res = self.convertUpdateValue(elem, props[elem].type, mem.p(elem));
				return [elem, res];
			})
			.flatten()
			.value();

		async.parallel({

			update: function(cb) {
				var args = [hashKey].concat(updateArgs).concat([cb]);
				self.conn.hmset.apply(self.conn, args);
			},

			setExpireTime: function(cb) {
				self.conn.pexpire(hashKey, self.expireMilliseconds, cb);
			}
		}, cb);
	}

	DataRedisTTL.init();

	return DataRedisTTL;
};

module.exports.__type__ = consts.DataType.REDIS_TTL;