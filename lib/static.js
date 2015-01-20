'use strict';
var assert = require('assert');
var async = require('async');
var _ = require('underscore');
var _s = require('underscore.string');
var Props = require('./props');
var utils = require('./utils');
var consts = require('./consts');

var pro = module.exports;

pro.getPrimaryKeys = Props.getPrimaryKeys;


/**
 * Just used to check memory Model values are all valid.
 * @param  {[type]} args [description]
 * @return {[type]}      [description]
 */
pro.checkProps = function(args) {

  var props = this.def.props;
  var modelName = this.def.name;
  var prop, prop2;
  var Model;
  var elem;
  var err;
  if (args === undefined) {
    err = _s.sprintf('model[%s] properties should not be undefined',
      modelName);
    assert.ok(false, err);
  }
  for (prop in props) {
    if (props.hasOwnProperty(prop)) {
      if (props[prop].type === consts.PropType.MODEL) {

        Model = this.lib.getModel(props[prop].modelName);
        Model.checkProps(args[prop]);

      } else if (props[prop].type === consts.PropType.MODEL_ARRAY) {
        Model = this.lib.getModel(props[prop].modelName);
        if (!_.isArray(args[prop])) {
          err = _s.sprintf('model[%s] property[%s] should be an array, but got: %s',
            modelName, prop, JSON.stringify(args[prop]));
          assert.ok(false, err);
        }
        for (var i = 0; i < args[prop].length; i++) {
          elem = args[prop][i];
          Model.checkProps(elem);
        }

      } else if (props[prop].type === consts.PropType.MODEL_DICT) {

        if (!_.isObject(args[prop])) {
          err = _s.sprintf('model[%s] property[%s] should be an object, but got: %s',
            modelName, prop, JSON.stringify(args[prop]));
          assert.ok(false, err);
        }
        Model = this.lib.getModel(props[prop].modelName);
        for (prop2 in args[prop]) {
          if (args[prop].hasOwnProperty(prop2)) {
            elem = args[prop][prop2];
            Model.checkProps(elem);
          }
        }
      } else {
        utils.checkPropValueType(modelName, prop, props[prop].type, args[prop]);
      }
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
      self.lib.logger.error('find failed: ', err, self.def.name);
      cb(err);
      return;
    }

    self.lib.logger.debug('find success: ', self.def.name, ', find args:', args, ', result:', res);
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
      self.lib.logger.error('find all failed: ', err, self.def.name);
      cb(err);
      return;
    }

    self.lib.logger.debug('find all success: ', self.def.name, ', result:', res);
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
          self.lib.logger.error('remove from db failed:', err, args);
        } else {
          primaryValues = res;
          self.lib.logger.debug('remove from db success', args);
        }
        cb(err);
      })
    },

    removeFromCache: function(cb) {
      self.cache.remove(primaryValues, function(err) {
        if (!!err) {
          self.lib.logger.error('remove from cache failed:', err, args);
        } else {
          self.lib.logger.debug('remove from cache success', args);
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
          self.lib.logger.error('remove all from db failed:', err);
        } else {
          self.lib.logger.debug('remove all from db success');
        }
        cb(err);
      });
    },

    removeFromCache: function(cb) {
      self.cache.removeAll(function(err) {
        if (!!err) {
          self.lib.logger.error('remove all from cache failed:', err);
        } else {
          self.lib.logger.debug('remove all from cache success');
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
      self.lib.logger.error('count from db failed:', err, args);
    } else {
      self.lib.logger.debug('count from db success', args);
    }
    cb(err, res);
  });
}

pro.countAll = function(cb) {
  var self = this;
  this.db.countAll(function(err, res) {
    if (!!err) {
      self.lib.logger.error('count all from db failed:', err);
    } else {
      self.lib.logger.debug('count all from db success');
    }
    cb(err, res);
  });
}

pro.update = function(args, cb) {
  assert.ok(!!args.$update);
  var load;
  if (args.$where) {
    load = this.load.bind(this, args.$where);
  } else {
    load = this.loadAll.bind(this);
  }
  load(function(err, results) {
    if (!!err) {
      cb(err);
      return;
    }
    async.each(
      results,
      function(elem, cb) {
        elem.p(args.$update);
        elem.update(cb);
      },
      cb);
  });
}