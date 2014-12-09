'use strict';
var async = require('async');
var _ = require('underscore');
var Props = require('./props');
var utils = require('./utils');

var pro = module.exports;

pro.getPrimaryKeys = Props.getPrimaryKeys;


/**
 * Used to check Model values are all valid
 * @param  {[type]} args [description]
 * @return {[type]}      [description]
 */
pro.checkProps = function(args) {
  var props = this.def.props;
  var modelName = this.def.name;
  var prop;

  for (prop in props) {
    if (props.hasOwnProperty(prop)) {
      utils.checkPropValueType(modelName, prop, props[prop].type, args[prop]);
    }
  }
}

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

/**
 * Find by args, return primary key values.
 * @param  {[type]}   args [description]
 * @param  {Function} cb   [description]
 * @return {[type]}        [description]
 */
pro.find = function(args, cb) {
  var self = this;
  self.db.find(args, function(err, res) {
    if (!!err) {
      self.logger.error('find failed: ', err, self.def.name);
      cb(err);
      return;
    }

    self.logger.debug('find success: ', self.def.name, ', find args:', args, ', result:', res);
    cb(null, res);
  });
}

/**
 * !!!CAUTION: IT WOULD RETURN ALL OBJECTS!!!
 * return all primary key values.
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
pro.findAll = function(cb) {
  var self = this;
  self.db.findAll(function(err, res) {
    if (!!err) {
      self.logger.error('find all failed: ', err, self.def.name);
      cb(err);
      return;
    }

    self.logger.debug('find all success: ', self.def.name, ', result:', res);
    cb(null, res);
  });
}


/**
 * Find by args, return loaded objects
 * @param  {[type]}   args [description]
 * @param  {Function} cb   [description]
 * @return {[type]}        [description]
 */
pro.load = function(args, cb) {
  var self = this;
  self.find(args, function(err, res) {
    if (!!err) {
      cb(err);
      return;
    }
    __loadAll.call(self, res, cb);
  });
}

/**
 * !!!CAUTION: IT WOULD RETURN ALL OBJECTS!!!
 * return all loaded objects.
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
pro.loadAll = function(cb) {
  var self = this;
  self.findAll(function(err, res) {
    if (!!err) {
      cb(err);
      return;
    }
    __loadAll.call(self, res, cb);
  });
}

/**
 * Remove object in db and cache by args.
 * @param  {[type]}   args [description]
 * @param  {Function} cb   [description]
 * @return {[type]}        [description]
 */
pro.remove = function(args, cb) {

  var self = this;
  var primaryValues;
  async.series({

    removeFromDB: function(cb) {
      self.db.remove(args, function(err, res) {
        if (!!err) {
          self.logger.error('remove from db failed:', err, args);
        } else {
          primaryValues = res;
          self.logger.debug('remove from db success', args);
        }
        cb(err);
      })
    },

    removeFromCache: function(cb) {
      self.cache.remove(primaryValues, function(err) {
        if (!!err) {
          self.logger.error('remove from cache failed:', err, args);
        } else {
          self.logger.debug('remove from cache success', args);
        }
        cb(err);
      });
    }
  }, cb);
}

/**
 * !!!CAUTION: IT WOULD REMOVE ALL OBJECTS!!!
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

pro.count = function(args, cb) {
  var self = this;
  this.db.count(args, function(err, res) {
    if (!!err) {
      self.logger.error('count from db failed:', err, args);
    } else {
      self.logger.debug('count from db success', args);
    }
    cb(err, res);
  });
}

pro.countAll = function(cb) {
  var self = this;
  this.db.countAll(function(err, res) {
    if (!!err) {
      self.logger.error('count all from db failed:', err);
    } else {
      self.logger.debug('count all from db success');
    }
    cb(err, res);
  });
}