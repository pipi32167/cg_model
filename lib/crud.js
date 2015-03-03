'use strict';
var _ = require('underscore');
var async = require('async');

var pro = module.exports;

var __setDefaultProperties = function(cb) {

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

var __init = function(cb) {
  var self = this;
  __setDefaultProperties.call(this, function(err) {
    if (!err) {
      //set properties before, just init other values
      self.mem.init({});
    }
    cb(err);
  });
}

var __afterCreateInDB = function(err) {
  if (!!err) {
    this.lib.logger.error('create in db failed:', err, this.def.name, this.toModelJSON());
  } else {
    this.db.init(this.mem.p());
    this.lib.logger.debug('create in db success:', this.def.name, this.toModelJSON());
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
      self.lib.logger.error('create in cache failed:', err, self.def.name, self.toModelJSON());
    } else {
      self.cache.init(self.mem.p());
      self.lib.logger.debug('create in cache success:', self.def.name, self.toModelJSON());
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
      self.lib.logger.error('createSync in db failed:', err, self.def.name, self.toModelJSON());
    } else {
      self.lib.logger.debug('createSync in db success:', self.def.name, self.toModelJSON());
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
          self.lib.logger.error('remove from db failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.lib.logger.debug('remove from db success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    },

    removeFromCache: function(cb) {
      self.cache.remove(function(err) {
        if (!!err) {
          self.lib.logger.error('remove from cache failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.lib.logger.debug('remove from cache success:', self.def.name, self.toModelJSON());
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

var loadFromCache = function(cb) {
  var self = this;
  self.cache.load(function(err) {
    if (!!err) {
      self.lib.logger.error('load from cache failed: ', err, self.def.name, self.toModelJSON());
    } else {
      if (self.cache.isSaved) {
        var data = self.cache.p();
        self.mem.init(data);
        self.db.init(data);
        self.lib.logger.debug('load from cache success:', self.def.name, self.toModelJSON());
      } else {
        self.lib.logger.debug('load from cache failed: miss', self.def.name, self.toModelJSON());
      }
    }
    cb(err);
  });
}

var afterLoadFromDB = function(err) {
  if (!!err) {
    this.lib.logger.error('load from db failed: ', err, this.def.name, this.toModelJSON());
  } else {
    if (this.db.isSaved) {
      this.mem.init(this.db.p());
      this.lib.logger.debug('load from db success: ', this.def.name, this.toModelJSON());
    } else {
      this.lib.logger.debug('load from db failed: miss', this.def.name, this.toModelJSON());
    }
  }
}

var loadFromDB = function(cb) {
  var self = this;
  if (self.mem.isLoaded) {
    cb();
    return;
  }

  self.db.load(function(err) {
    afterLoadFromDB.call(self, err);
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
      self.lib.logger.error('create in cache failed: ', err, self.def.name, self.toModelJSON());
    } else {
      self.cache.init(self.mem.p());
      self.lib.logger.debug('create in cache success: ', self.def.name, self.toModelJSON());
    }
    cb(err);
  });
}

pro.load = function(cb) {

  async.series({

    loadFromCache: loadFromCache.bind(this),

    loadFromDB: loadFromDB.bind(this),

    createInCache: createInCache.bind(this),

  }, cb);
}

pro.batchLoad = function(objs, cb) {

  var toBeLoadedFromDBObjs = [];
  var self = this;

  async.series({

    loadFromCache: function(cb) {

      async.each(
        objs,
        function(obj, cb) {

          loadFromCache.call(obj, function(err) {
            if (!err && !obj.mem.isLoaded) {
              toBeLoadedFromDBObjs.push(obj);
            }
            cb(err);
          })
        }, cb);
    },

    loadFromDB: function(cb) {

      if (toBeLoadedFromDBObjs.length === 0) {
        cb();
        return;
      }

      var dbObjs = _(toBeLoadedFromDBObjs).map(function(elem) {
        return elem.db;
      });

      dbObjs[0].batchLoad(dbObjs, function(err) {
        if (!!err) {
          self.lib.logger.error('batch load from db failed: ', err);
        } else {
          toBeLoadedFromDBObjs.forEach(function(elem) {
            afterLoadFromDB.call(elem);
          });
        }
        cb(err);
      });
    },

    createInCache: function(cb) {
      if (toBeLoadedFromDBObjs.length === 0) {
        cb();
        return;
      }

      async.each(
        objs,
        function(obj, cb) {
          createInCache.call(obj, cb);
        }, cb);
    }
  }, cb);

}

pro.update = function(cb) {
  var self = this;
  async.parallel({
    updateDB: function(cb) {
      self.db.update(function(err) {
        if (!!err) {
          self.lib.logger.error('update db failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.lib.logger.debug('update db success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    },

    updateCache: function(cb) {
      self.cache.update(function(err) {
        if (!!err) {
          self.lib.logger.error('update cache failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.lib.logger.debug('update cache success:', self.def.name, self.toModelJSON());
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
          self.lib.logger.error('updateSync db failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.lib.logger.debug('updateSync db success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    },

    updateCache: function(cb) {
      self.cache.update(function(err) {
        if (!!err) {
          self.lib.logger.error('update cache failed:', err, self.def.name, self.toModelJSON());
        } else {
          self.lib.logger.debug('update cache success:', self.def.name, self.toModelJSON());
        }
        cb(err);
      });
    }
  }, cb);
}