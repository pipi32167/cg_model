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
          self.logger.error('create in db failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.mem.isLoaded = true;
          self.logger.debug('create in db success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    },

    createInCache: function(cb) {
      self.cache.create(function(err) {
        if (!!err) {
          self.logger.error('create in cache failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.logger.debug('create in cache success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    }
  }, cb);
};

pro.createSync = function(cb) {

  var self = this;
  async.series({

    setDefaultValue: function(cb) {
      __setDefaultValue.call(self, cb);
    },

    createInDB: function(cb) {
      self.db.createSync(function(err) {
        if (!!err) {
          self.logger.error('createSync in db failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.mem.isLoaded = true;
          self.logger.debug('createSync in db success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    },

    createInCache: function(cb) {
      self.cache.create(function(err) {
        if (!!err) {
          self.logger.error('create in cache failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.logger.debug('create in cache success:', self.def.name, self.toModelJSON());
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
          self.logger.error('remove from db failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.logger.debug('remove from db success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    },

    removeFromCache: function(cb) {
      self.cache.remove(function(err) {
        if (!!err) {
          self.logger.error('remove from cache failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.logger.debug('remove from cache success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      })
    }
  }, function(err) {
    if (!err) {
      self.mem.isLoaded = false;
    }
    cb(err);
  });
}

pro.load = function(cb) {

  var self = this;

  async.series({

    loadFromCache: function(cb) {

      self.cache.load(function(err) {
        if (!!err) {
          self.logger.error('load from cache failed: ', err, self.def.name, self.toModelJSON());
        } else {
          if (self.cache.isSaved) {
            self.mem.isLoaded = true;
            self.mem.p(self.cache.p());
            self.db.isSaved = true;
            self.db.p(self.cache.p());
            self.logger.debug('load from cache success:', self.def.name, self.toModelJSON());
          } else {
            self.logger.debug('load from cache failed: miss', self.def.name, self.toModelJSON());
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

      self.db.load(function(err) {
        if (!!err) {
          self.logger.error('load from db failed: ', err, self.def.name, self.toModelJSON());
        } else {
          if (self.db.isSaved) {
            self.mem.isLoaded = true;
            self.mem.p(self.db.p());
            self.logger.debug('load from db success: ', self.def.name, self.toModelJSON());
          } else {
            self.logger.debug('load from db failed: miss', self.def.name, self.toModelJSON());
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
          self.logger.error('create in cache failed: ', err, self.def.name, self.toModelJSON());
        } else {
          self.logger.debug('create in cache success: ', self.def.name, self.toModelJSON());
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
          self.logger.error('update db failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.logger.debug('update db success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    },

    updateCache: function(cb) {
      self.cache.update(function(err) {
        if (!!err) {
          self.logger.error('update cache failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.cache.p(self.p());
          self.logger.debug('update cache success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    }
  }, cb);
}

pro.updateSync = function(cb) {
  var self = this;
  async.parallel({
    updateDB: function(cb) {
      self.db.updateSync(function(err) {
        if (!!err) {
          self.logger.error('updateSync db failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.logger.debug('updateSync db success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    },

    updateCache: function(cb) {
      self.cache.update(function(err) {
        if (!!err) {
          self.logger.error('update cache failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.cache.p(self.p());
          self.logger.debug('update cache success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    }
  }, cb);
}