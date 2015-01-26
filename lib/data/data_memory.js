'use strict';
var _ = require('underscore');
var Data = require('./data');
var consts = require('../consts');

module.exports = function() {

	var DataMemory = function(lib, model) {
		Data.call(this, lib, model);
		this.isLoaded = false;
	}

	_.extend(DataMemory.prototype, Data.prototype);
	_.extend(DataMemory, Data);

	return DataMemory;
}

module.exports.__type__ = consts.DataType.MEMORY;