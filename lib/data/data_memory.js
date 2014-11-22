'use strict';
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var Data = require('./data');
var consts = require('../consts');

var DataMemory = function (model) {
  Data.call(this, model);

  this.isLoaded = false;
}

DataMemory.__type__ = consts.DataType.MEMORY;

util.inherits(DataMemory, Data);

module.exports = DataMemory;