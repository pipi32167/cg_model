'use strict';
var _ = require('underscore');
var assert = require('assert');
var async = require('async');

var clients = {};
var models = {};

var exp = module.exports;

exp.debug_mode = false;

exp.logger = {

  info: function() {
    console.log.apply(console, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
  },

  warn: function() {
    console.warn.apply(console, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
  },

  error: function() {
    console.error.apply(console, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
  },

  debug: function() {
    if (exp.debug_mode) {
      console.log.apply(console, ['[cg_model]:'].concat(Array.prototype.slice.call(arguments, 0)));
    }
  }
};

exp.createModel = function(def) {

  assert.ok(!models[def.name]);

  var Model = models[def.name] = function() {
    this.props = {};
    this.__isLoaded = false;

    var prop;
    for (prop in def.props) {
      if (def.props.hasOwnProperty(prop)) {
        this.props[prop] = {
          value: undefined,
          oldValue: undefined,
        }
      }
    }

    var p = this.p.bind(this);
    this.db = {
      props: this.props,
      p: p,
      property: p,
      __isSaved: false,
    };

    Object.defineProperty(this.db, 'conn', {
      get: function() {
        return clients.db;
      }
    });
    _(this.db).extend(def.db.instance);

    this.cache = {
      props: this.props,
      p: p,
      property: p,
      __isSaved: false,
    };
    Object.defineProperty(this.cache, 'conn', {
      get: function() {
        return clients.cache;
      }
    });
    _(this.cache).extend(def.cache.instance);
  };

  Model.db = {};
  Object.defineProperty(Model.db, 'conn', {
    get: function() {
      return clients.db;
    }
  });
  _(Model.db).extend(def.db.static);

  Model.cache = {};
  Object.defineProperty(Model.cache, 'conn', {
    get: function() {
      return clients.cache;
    }
  });
  _(Model.cache).extend(def.cache.static);

  Model.find = function(args, cb) {
    var objs;
    this.db.find(args, function(err, res) {
      if (!!err) {
        cb(err);
        return;
      }

      objs = _(res).map(function(elem) {
        var res = new Model();
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

  Model.prototype.p = Model.prototype.property = function(key, value) {
    var typeOfKey = typeof key;
    assert.ok(typeOfKey === 'string' || typeOfKey === 'object', key);

    if (typeOfKey === 'string') {
      if (value === undefined) {
        return this.props[key].value;
      } else {
        this.props[key].oldValue = this.props[key].value;
        this.props[key].value = value;
      }
    } else {
      var props = key;
      for (key in def.props) {
        if (props.hasOwnProperty(key)) {
          this.p(key, props[key]);
        }
      }
    }
  }

  var __setDefaultValue = function () {
    
    var props = def.props;
    var prop;
    for (prop in props) {
      if (props.hasOwnProperty(prop) &&
        this.p(prop) === undefined) {
        this.p(prop, props[prop].defaultValue);
      }
    }
  }

  Model.prototype.create = function(cb) {

    __setDefaultValue.call(this);

    var self = this;
    async.series({

      createInDB: function(cb) {
        self.db.create(function(err) {
          if (!!err) {
            exp.logger.error('create in db failed:', err, self.toJSON());
          } else {
            self.__isLoaded = self.db.__isSaved = true;
            exp.logger.debug('create in db success:', self.toJSON());
          }
          cb(err);
        });
      },

      createInCache: function(cb) {
        self.cache.create(function(err) {
          if (!!err) {
            exp.logger.error('create in cache failed:', err, self.toJSON());
          } else {
            self.cache.__isSaved = true;
            exp.logger.debug('create in cache success:', self.toJSON());
          }
          cb(err);
        });
      }
    }, cb);
  };

  Model.prototype.remove = function(cb) {
    var self = this;

    async.parallel({
      removeFromDB: function(cb) {
        self.db.remove(function(err) {
          if (!!err) {
            exp.logger.error('remove from db failed:', err, self.toJSON());
          } else {
            self.__isLoaded = self.db.__isSaved = false;
            exp.logger.debug('remove from db success:', self.toJSON());
          }
          cb(err);
        });
      },

      removeFromCache: function(cb) {
        self.cache.remove(function(err) {
          if (!!err) {
            exp.logger.error('remove from cache failed:', err, self.toJSON());
          } else {
            self.cache.__isSaved = false;
            exp.logger.debug('remove from cache success:', self.toJSON());
          }
          cb(err);
        })
      }
    }, cb);
  }

  Model.prototype.load = function(cb) {

    var self = this;

    async.series({

      loadFromCache: function(cb) {

        self.cache.load(function(err, res) {
          if (!!err) {
            exp.logger.error('load from cache failed: ', err, self.toJSON());
          } else {
            if (!!res) {
              self.p(res);
              self.__isLoaded = self.cache.__isSaved = true;
              exp.logger.debug('load from cache success:', self.toJSON());
            } else {
              exp.logger.debug('load from cache failed: miss', self.toJSON());
            }
          }
          cb(err);
        });
      },

      loadFromDB: function(cb) {
        if (self.__isLoaded) {
          cb();
          return;
        }

        self.db.load(function(err, res) {
          if (!!err) {
            exp.logger.error('load from db failed: ', err, self.toJSON());
          } else {
            if (!!res) {
              self.p(res);
              self.__isLoaded = self.db.__isSaved = true;
              exp.logger.debug('load from db success: ', self.toJSON());
            } else {
              exp.logger.debug('load from db failed: miss', self.toJSON());
            }
          }
          cb(err);
        });
      },

      createInCache: function(cb) {
        if (self.cache.__isSaved) {
          cb();
          return;
        }

        if (!self.__isLoaded) {
          cb();
          return;
        }

        self.cache.create(function(err) {
          if (!!err) {
            exp.logger.error('create in cache failed: ', err, self.toJSON());
          } else {
            self.cache.__isSaved = true;
            exp.logger.debug('create in cache success: ', self.toJSON());
          }
          cb(err);
        });
      }
    }, cb);
  }

  Model.prototype.update = function(cb) {
    var self = this;
    async.parallel({
      updateDB: function(cb) {
        self.db.update(function(err) {
          if (!!err) {
            exp.logger.error('update db failed:', err, self.toJSON());
          } else {
            self.p(self.toJSON());
            exp.logger.debug('update db success:', self.toJSON());
          }
          cb(err);
        });
      },

      updateCache: function(cb) {
        self.cache.update(function(err) {
          if (!!err) {
            exp.logger.error('update cache failed:', err, self.toJSON());
          } else {
            exp.logger.debug('update cache success:', self.toJSON());
          }
          cb(err);
        });
      }
    }, cb);
  }

  Model.prototype.toJSON = function() {
    return _(this.props)
      .chain()
      .pairs()
      .map(function(elem) {
        return [elem[0], elem[1].value];
      })
      .object()
      .value();
  }

  return Model;
}

exp.setDBClient = function(dbClient) {
  clients.db = dbClient;
}

exp.setCacheClient = function(cacheClient) {
  clients.cache = cacheClient;
}

exp.setLogger = function(logger) {
  exp.logger = logger;
}

exp.getModel = function (name) {
  return models[name];
}