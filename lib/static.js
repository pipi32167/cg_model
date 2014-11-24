'use strict';
var async = require('async');
var _ = require('underscore');
var Props = require('./props');

var pro = module.exports;

pro.getPrimaryKeys = Props.getPrimaryKeys;

pro.find = function(args, cb) {
  var objs;
  var Self = this;
  Self.db.find(args, function(err, res) {
    if (!!err) {
      Self.logger.error('find in db failed: ', err, Self.def.name);
      cb(err);
      return;
    }

    Self.logger.debug('find in db success: ', Self.def.name, ', find args:', args, ', result:', res);

    objs = _(res).map(function(elem) {
      var res = new Self();
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