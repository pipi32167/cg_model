'use strict';
var _ = require('underscore');
var assert = require('assert');
var util = require('util');
var Data = require('./data');
var consts = require('../consts');

module.exports = function(app, Model) {

  var DataMemory = function(app, model) {
    Data.call(this, app, model);
    this.isLoaded = false;
  }

  DataMemory.Model = Model;

  util.inherits(DataMemory, Data);

  return DataMemory;
}

module.exports.__type__ = consts.DataType.MEMORY;