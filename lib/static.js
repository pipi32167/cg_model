'use strict';
var async = require('async');
var _ = require('underscore');

var pro = module.exports;

pro.find = function(query, cb) {
  var objs;
  var Self = this;
  Self.db.find(query, function(err, res) {
    if (!!err) {
      cb(err);
      return;
    }

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