'use strict';
var async = require('async');
// var _s = require('underscore.string');
var _ = require('underscore');
// var assert = require('assert');
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

	DataRedisTTL.prototype.__update = function(cb) {

		var self = this;
		var hashKey = this.genHashKey.call(this);
		// console.log('update', hashKey);
		var model = this.model;
		var props = this.model.def.props;
		var updateArgs = [];
		for(var prop in props) {
			updateArgs.push(prop);
			updateArgs.push(self.convertUpdateValue(prop, props[prop].type, model.p(prop)));
		}

		async.parallel({

			update: function(cb) {
				var args = [hashKey].concat(updateArgs);
				lib.logger.debugRedis('hmset', args);
				args = args.concat([cb]);
				self.conn.hmset.apply(self.conn, args);
			},

			setExpireTime: function(cb) {
				lib.logger.debugRedis('pexpire', hashKey, self.expireMilliseconds);
				self.conn.pexpire(hashKey, self.expireMilliseconds, cb);
			}
		}, cb);
	}

	DataRedisTTL.init();

	return require('bluebird').promisifyAll(DataRedisTTL);
};

module.exports.__type__ = consts.DataType.REDIS_TTL;