'use strict';
var util = require('util');
var Data = require('./data');
var consts = require('../consts');

module.exports = function(app, Model) {

  var DataNone = function(app, model) {
    Data.call(this, app, model);
    this.isLoaded = false;
  }

  DataNone.Model = Model;

  util.inherits(DataNone, Data);

  DataNone.prototype.create = 
  DataNone.prototype.load = 
  DataNone.prototype.update =
  DataNone.prototype.remove = function(cb) {
    cb();
  }

  DataNone.find =
  DataNone.load =
  DataNone.remove =
  DataNone.count = function (args, cb) {
    cb();
  }

  DataNone.findAll =
  DataNone.loadAll =
  DataNone.removeAll =
  DataNone.countAll = function (cb) {
    cb();
  }

  return DataNone;
}

module.exports.__type__ = consts.DataType.NONE;