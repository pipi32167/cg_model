'use strict';
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var Data = require('./data');
var consts = require('../consts');

module.exports = function(Model) {

  var DataMemory = function(model) {
    Data.call(this, model);
    this.isLoaded = false;
  }

  DataMemory.Model = Model;

  util.inherits(DataMemory, Data);

  return DataMemory;
}

module.exports.__type__ = consts.DataType.MEMORY;