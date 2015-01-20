'use strict';
var _ = require('underscore');
var assert = require('assert');
var Data = require('./data');
var Crud = require('./crud');
var Props = require('./props');
var Static = require('./static');
var consts = require('./consts');

var DataType = consts.DataType;
var ConnType = consts.ConnType;

module.exports = function(lib) {

  return function(def) {

    assert.ok(!lib.models[def.name], 'Model name already exists:' + def.name);

    var DataMem = Data.factory(DataType.MEMORY)(lib);
    assert.ok(!!DataMem);

    var DataDB = Data.factory(def.db.type)(lib, def, ConnType.DB);
    assert.ok(!!DataDB, def.db.type);
    
    var DataCache = Data.factory(def.cache.type)(lib, def, ConnType.CACHE);
    assert.ok(!!DataCache, def.cache.type);

    var Model = lib.models[def.name] = function() {

      this.lib = lib;
      var mem = new DataMem(lib, this);
      var db = new DataDB(lib, this);
      var cache = new DataCache(lib, this);
      var readOnly = {
        def: def,
        mem: mem,
        db: db,
        cache: cache,
        p: mem.p.bind(mem),
      };
      var self = this;
      var prop;
      for (prop in readOnly) {
        if (readOnly.hasOwnProperty(prop)) {
          (function(prop) {
            assert.deepEqual(self[prop], undefined, prop);
            Object.defineProperty(self, prop, {
              get: function() {
                return readOnly[prop];
              },
            });
          })(prop);
        }
      }

      var props = def.props;
      for (prop in props) {
        if (props.hasOwnProperty(prop)) {
          (function(prop) {
            assert.deepEqual(self[prop], undefined, prop);
            Object.defineProperty(self, prop, {
              get: function() {
                return self.p(prop);
              },
              set: function(value) {
                self.p(prop, value);
              }
            });
          })(prop);
        }
      }
    };

    Model.lib = lib;
    Model.def = def;
    Model.mem = DataMem;
    Model.db = DataDB;
    Model.cache = DataCache;

    _(Model).extend(Static);
    _(Model).extend(Props);
    _(Model.prototype).extend(Crud);
    _(Model.prototype).extend(Props);

    Model.prototype.toModelJSON = function() {
      return {
        mem: this.mem.props,
        db: this.db.props,
        cache: this.cache.props,
      }
    }

    Model.prototype.dispose = function() {
      this.mem.dispose();
      this.db.dispose();
      this.cache.dispose();
    }

    return Model;
  }
}