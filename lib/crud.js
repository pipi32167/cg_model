'use strict';
var async = require('async');

var pro = module.exports;

var __setDefaultValue = function(cb) {

  var props = this.def.props;
  var prop;
  var keys = [];
  for (prop in props) {
    if (props.hasOwnProperty(prop) &&
      this.mem.p(prop) === undefined) {
      keys.push(prop);
    }
  }

  var self = this;
  async.mapSeries(
    keys,
    function(key, cb) {
      if (typeof props[key].defaultValue === 'function') {
        props[key].defaultValue.call(self, function(err, res) {
          if (!err) {
            self.mem.p(key, res);
          }
          cb(err);
        });
      } else {
        self.mem.p(key, props[key].defaultValue);
        cb();
      }
    },
    cb);
}

pro.create = function(cb) {

  var self = this;
  async.series({

    setDefaultValue: function(cb) {
      __setDefaultValue.call(self, cb);
    },

    createInDB: function(cb) {
      self.db.create(function(err) {
        if (!!err) {
          self.logger.error('create in db failed:', err, self.def.name, self.toJSON());
        } else {
          self.mem.isLoaded = self.db.isSaved = true;
          self.db.p(self.mem.p());
          self.logger.debug('create in db success:', self.def.name, self.toJSON());
        }
        cb(err);
      });
    },

    createInCache: function(cb) {
      self.cache.create(function(err) {
        if (!!err) {
          self.logger.error('create in cache failed:', err, self.def.name, self.toJSON());
        } else {
          self.cache.isSaved = true;
          self.cache.p(self.mem.p());
          self.logger.debug('create in cache success:', self.def.name, self.toJSON());
        }
        cb(err);
      });
    }
  }, cb);
};

pro.remove = function(cb) {
  var self = this;

  async.parallel({
    removeFromDB: function(cb) {
      self.db.remove(function(err) {
        if (!!err) {
          self.logger.error('remove from db failed:', err, self.def.name, self.toJSON());
        } else {
          self.mem.isLoaded = self.db.isSaved = false;
          self.logger.debug('remove from db success:', self.def.name, self.toJSON());
        }
        cb(err);
      });
    },

    removeFromCache: function(cb) {
      self.cache.remove(function(err) {
        if (!!err) {
          self.logger.error('remove from cache failed:', err, self.def.name, self.toJSON());
        } else {
          self.cache.isSaved = false;
          self.logger.debug('remove from cache success:', self.def.name, self.toJSON());
        }
        cb(err);
      })
    }
  }, cb);
}

pro.load = function(cb) {

  var self = this;

  async.series({

    loadFromCache: function(cb) {

      self.cache.load(function(err, res) {
        if (!!err) {
          self.logger.error('load from cache failed: ', err, self.def.name, self.toJSON());
        } else {
          if (!!res) {
            self.mem.p(res);
            self.db.p(res);
            self.cache.p(res);
            self.mem.isLoaded = true;
            self.db.isSaved = true;
            self.cache.isSaved = true;
            self.logger.debug('load from cache success:', self.def.name, self.toJSON());
          } else {
            self.logger.debug('load from cache failed: miss', self.def.name, self.toJSON());
          }
        }
        cb(err);
      });
    },

    loadFromDB: function(cb) {
      if (self.mem.isLoaded) {
        cb();
        return;
      }

      self.db.load(function(err, res) {
        if (!!err) {
          self.logger.error('load from db failed: ', err, self.def.name, self.toJSON());
        } else {
          if (!!res) {
            self.p(res);
            self.mem.isLoaded = self.db.isSaved = true;
            self.logger.debug('load from db success: ', self.def.name, self.toJSON());
          } else {
            self.logger.debug('load from db failed: miss', self.def.name, self.toJSON());
          }
        }
        cb(err);
      });
    },

    createInCache: function(cb) {
      if (self.cache.isSaved) {
        cb();
        return;
      }

      if (!self.mem.isLoaded) {
        cb();
        return;
      }

      self.cache.create(function(err) {
        if (!!err) {
          self.logger.error('create in cache failed: ', err, self.def.name, self.toJSON());
        } else {
          self.cache.p(self.p());
          self.cache.isSaved = true;
          self.logger.debug('create in cache success: ', self.def.name, self.toJSON());
        }
        cb(err);
      });
    }
  }, cb);
}

pro.update = function(cb) {
  var self = this;
  async.parallel({
    updateDB: function(cb) {
      self.db.update(function(err) {
        if (!!err) {
          self.logger.error('update db failed:', err, self.def.name, self.toJSON());
        } else {
          // self.db.p(self.p());
          // may be update later, it should be updated by self.db itself
          self.logger.debug('update db success:', self.def.name, self.toJSON());
        }
        cb(err);
      });
    },

    updateCache: function(cb) {
      self.cache.update(function(err) {
        if (!!err) {
          self.logger.error('update cache failed:', err, self.def.name, self.toJSON());
        } else {
          self.cache.p(self.p());
          self.logger.debug('update cache success:', self.def.name, self.toJSON());
        }
        cb(err);
      });
    }
  }, cb);
}