'use strict';
var _ = require('underscore');
var async = require('async');
var assert = require('assert');
var lib = require('./');

var pro = {};

var __setDefaultProperties = function(cb) {

  var props = this.def.props;
  var prop;
  var keys = [];
  for (prop in props) {
    if (props.hasOwnProperty(prop) &&
      this.p(prop) === undefined) {
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
            self.p(key, res);
          }
          cb(err);
        });
      } else {
        self.p(key, props[key].defaultValue);
        cb();
      }
    },
    cb);
}

var __init = function(cb) {
  var self = this;
  __setDefaultProperties.call(this, function(err) {
    if (!err) {
      //set properties before, just init other values
      self.mem.init();
    }
    cb(err);
  });
}

var __afterCreateInDB = function(err) {
  if (!!err) {
    lib.logger.error('create in db failed:', err, this.def.name, this.toModelJSON());
  } else {
    this.db.init();
    lib.logger.debug('create in db success:', this.def.name, this.toModelJSON());
  }
}

var __createInDB = function(cb) {
  var self = this;
  self.db.create(function(err) {
    __afterCreateInDB.call(self, err);
    cb(err);
  });
}

var __createInCache = function(cb) {
  var self = this;
  self.cache.create(function(err) {
    if (!!err) {
      lib.logger.error('create in cache failed:', err, self.def.name, self.toModelJSON());
    } else {
      self.cache.init();
      lib.logger.debug('create in cache success:', self.def.name, self.toModelJSON());
    }
    cb(err);
  });
}

pro.create = function(cb) {

  async.series({

    init: __init.bind(this),

    createInDB: __createInDB.bind(this),

    createInCache: __createInCache.bind(this),

  }, cb);
};

var __createInDBSync = function(cb) {
  var self = this;
  self.db.createSync(function(err) {
    if (!!err) {
      lib.logger.error('createSync in db failed:', err, self.def.name, self.toModelJSON());
    } else {
      self.db.init();
      lib.logger.debug('createSync in db success:', self.def.name, self.toModelJSON());
    }
    cb(err);
  });
}

pro.createSync = function(cb) {

  async.series({

    init: __init.bind(this),

    createInDB: __createInDBSync.bind(this),

    createInCache: __createInCache.bind(this),

  }, cb);
};

pro.remove = function(cb) {
  var self = this;

  async.parallel({
    removeFromDB: function(cb) {
      self.db.remove(function(err) {
        if (!!err) {
          lib.logger.error('remove from db failed:', err, self.def.name, self.toModelJSON());
        } else {
          lib.logger.debug('remove from db success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    },

    removeFromCache: function(cb) {
      self.cache.remove(function(err) {
        if (!!err) {
          lib.logger.error('remove from cache failed:', err, self.def.name, self.toModelJSON());
        } else {
          lib.logger.debug('remove from cache success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      })
    }
  }, function(err) {
    if (!err) {
      self.isRemoved = true;
      self.mem.isLoaded = false;
      self.cache.isSaved = false;
      self.db.isSaved = false;
    }
    cb(err);
  });
}

var loadFromCache = function(cb) {
  var self = this;
  self.cache.load(function(err, res) {
    if (!!err) {
      lib.logger.error('load from cache failed: ', err, self.def.name, self.toModelJSON());
    } else {
      if (!!res) {
        self.p(_(res).omit(self.getPrimaryKeys()));
        self.mem.init();
        self.db.init();
        self.cache.init();
        lib.logger.debug('load from cache success:', self.def.name, self.toModelJSON());
      } else {
        lib.logger.debug('load from cache failed: miss', self.def.name, self.toModelJSON());
      }
    }
    cb(err);
  });
}

var afterLoadFromDB = function(err, res) {
  if (!!err) {
    lib.logger.error('load from db failed: ', err, this.def.name, this.toModelJSON());
  } else {
    if (!!res) {
      this.p(_(res).omit(this.getPrimaryKeys()));
      this.mem.init();
      this.db.init();
      lib.logger.debug('load from db success: ', this.def.name, this.toModelJSON());
    } else {
      lib.logger.debug('load from db failed: miss', this.def.name, this.toModelJSON());
    }
  }
}

var loadFromDB = function(cb) {
  var self = this;
  if (self.mem.isLoaded) {
    cb();
    return;
  }
  self.db.load(function(err, res) {
    afterLoadFromDB.call(self, err, res);
    cb(err);
  });
}

var createInCache = function(cb) {
  var self = this;
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
      lib.logger.error('create in cache failed: ', err, self.def.name, self.toModelJSON());
    } else {
      self.cache.init();
      lib.logger.debug('create in cache success: ', self.def.name, self.toModelJSON());
    }
    cb(err);
  });
}

pro.load = function(cb) {

  assert.ok(!this.mem.isLoaded);

  async.series({

    loadFromCache: loadFromCache.bind(this),

    loadFromDB: loadFromDB.bind(this),

    createInCache: createInCache.bind(this),

  }, cb);
}

pro.forceLoad = function(cb) {
  assert.ok(this.readonly);
  this.mem.isLoaded = false;
  this.db.isSaved = false;
  this.db.isSaved = false;
  this.load(cb);
}

pro.update = function(cb) {
  var self = this;
  async.parallel({
    updateDB: function(cb) {
      self.db.update(function(err) {
        if (!!err) {
          lib.logger.error('update db failed:', err, self.def.name, self.toModelJSON());
        } else {
          lib.logger.debug('update db success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    },

    updateCache: function(cb) {
      self.cache.update(function(err) {
        if (!!err) {
          lib.logger.error('update cache failed:', err, self.def.name, self.toModelJSON());
        } else {
          lib.logger.debug('update cache success:', self.def.name, self.toModelJSON());
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
          lib.logger.error('updateSync db failed:', err, self.def.name, self.toModelJSON());
        } else {
          lib.logger.debug('updateSync db success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    },

    updateCache: function(cb) {
      self.cache.update(function(err) {
        if (!!err) {
          lib.logger.error('update cache failed:', err, self.def.name, self.toModelJSON());
        } else {
          lib.logger.debug('update cache success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    }
  }, cb);
}

module.exports = require('bluebird').promisifyAll(pro);