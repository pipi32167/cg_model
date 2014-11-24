'use strict';
var async = require('async');
var _ = require('underscore');
var Props = require('./props');

var pro = module.exports;

pro.getPrimaryKeys = Props.getPrimaryKeys;

var __loadAll = function(args, cb) {
  var Obj = this;
  var objs = _(args).map(function(elem) {
    var res = new Obj();
    res.p(elem);
    return res;
  });

  async.map(
    objs,
    function(obj, cb) {
      obj.load(cb);
    },
    function(err) {
      if (!!err) {
        cb(err);
        return;
      }
      cb(null, objs);
    });
}

pro.find = function(args, cb) {
  var self = this;
  self.db.find(args, function(err, res) {
    if (!!err) {
      self.logger.error('find in db failed: ', err, self.def.name);
      cb(err);
      return;
    }

    self.logger.debug('find in db success: ', self.def.name, ', find args:', args, ', result:', res);

    __loadAll.call(self, res, cb);
  });
}

pro.remove = function(args, cb) {

  var self = this;
  var primaryValues;
  async.series({

    removeFromDB: function(cb) {
      self.db.remove(args, function(err, res) {
        if (!err) {
          primaryValues = res;
        }
        cb(err);
      })
    },

    removeFromCache: function(cb) {
      self.cache.remove(primaryValues, cb);
    }
  }, cb);
}

/**
 * !!!JUST FOR TEST PURPOSE, DON'T USE IT!!!
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
pro.findAll = function(cb) {
  var self = this;
  self.db.findAll(function(err, res) {
    if (!!err) {
      self.logger.error('find all in db failed: ', err, self.def.name);
      cb(err);
      return;
    }

    self.logger.debug('find all in db success: ', self.def.name, ', result:', res);

    __loadAll.call(self, res, cb);
  });
}

/**
 * !!!JUST FOR TEST PURPOSE, DON'T USE IT!!!
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
pro.removeAll = function(cb) {

  var self = this;
  async.series({
    removeFromDB: function(cb) {
      self.db.removeAll(function(err) {
        if (!!err) {
          self.logger.error('remove all from db failed:', err);
        } else {
          self.logger.debug('remove all from db success');
        }
        cb(err);
      });
    },

    removeFromCache: function(cb) {
      self.cache.removeAll(function(err) {
        if (!!err) {
          self.logger.error('remove all from cache failed:', err);
        } else {
          self.logger.debug('remove all from cache success');
        }
        cb(err);
      });
    }
  }, cb);
}