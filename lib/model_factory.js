'use strict';
var _s = require('underscore.string');
var _ = require('underscore');
var assert = require('assert');
var Data = require('./data');
var Crud = require('./crud');
var Props = require('./props');
var Static = require('./static');
var consts = require('./consts');
var utils = require('./utils');

var DataType = consts.DataType;
var ConnType = consts.ConnType;

var convertValue = function(type, value) {

  var typeOfPropValue = utils.typeOf(value);
  switch (type) {
    case consts.PropType.BOOL:
      if (typeOfPropValue === consts.PropType.NUMBER) {
        return !!value;
      }
      break;
    case consts.PropType.OBJECT:
    case consts.PropType.ARRAY:
    case consts.PropType.DATE:
      if (typeOfPropValue === 'string') {
        return JSON.parse(value);
      }
      break;
  }
  return value;
}

module.exports = function(lib) {

  return function(def) {

    assert.ok(!lib.models[def.name], 'Model name already exists:' + def.name);

    var DataMem = Data.factory(DataType.MEMORY)(lib);
    assert.ok(!!DataMem);

    var DataDB = Data.factory(def.db.type)(lib, def, ConnType.DB);
    assert.ok(!!DataDB, def.db.type);

    var DataCache = Data.factory(def.cache.type)(lib, def, ConnType.CACHE);
    assert.ok(!!DataCache, def.cache.type);

    var Model = lib.models[def.name] = function(bucket) {
      this.__id = _.uniqueId();
      this.bucket = bucket;
      this.def = def;
      this.props = {};
      var prop;
      var props = def.props;
      for (prop in props) {
        this.props[prop] = undefined;
      }

      this.mem = new DataMem(lib, this);
      this.db = new DataDB(lib, this);
      this.cache = new DataCache(lib, this);
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

    for (var prop in def.props) {
      utils.defineProperty(Model, prop);
    }

    Model.prototype.toModelJSON = function() {
      return {
        props: this.props,
        mem: this.mem.__version,
        db: this.db.__version,
        cache: this.cache.__version,
      }
    }

    Model.prototype.dispose = function() {
      this.mem.dispose();
      this.db.dispose();
      this.cache.dispose();
    }

    /**
     * set or get properies, usage:
     * 1. set single key:     p('key', value)                   -> undefined
     * 2. set multiple keys:  p({ key1: value1, key2: value2 }) -> undefined
     * 3. get single key:     p('key')                          -> { key: value }
     * 4. get multiple keys:  p(['key1', 'key2'])               -> { key1: value1, key2: value2 }
     * 5. get all keys:       p()                               -> { key1: value1, key2: value2, ... }
     * @param  {Undefined|String|Object|Array}  key
     * @param  {AnyType}                        value
     * @return {Undefined|Object}
     */
    Model.prototype.p = function(key, value) {
      if (this.isRemoved) {
        return;
      }
      var typeOfKey = utils.typeOf(key);
      assert.ok(typeOfKey === 'undefined' ||
        typeOfKey === 'string' ||
        typeOfKey === 'array' ||
        typeOfKey === 'object', key);

      // get all keys
      if (typeOfKey === 'undefined') {
        return this.props;
      }

      // get multiple keys
      if (typeOfKey === 'array') {
        return _(this.props).pick(key);
      }

      var def = this.def;

      if (typeOfKey === 'string') {
        // get single key
        if (value === undefined) {
          return this.props[key];
        } else {
          if (this.props[key] !== undefined &&
            !_.isEqual(this.props[key], value) &&
            def.props[key].primary) {
            var err = _s.sprintf('[%s] primary key should not be changed:%s, original value:[%s], now value:[%s]', def.name, key, this.props[key], value);
            assert.ok(false, err);
          }

          var propType = def.props[key].type;
          value = convertValue(propType, value);
          utils.checkPropValueType(def.name, key, propType, value);
          // set single key 
          this.props[key] = utils.clonePropValue(value);
          this.incrVersion();
        }
        return;
      }

      // set multiple keys
      var props = key;
      for (key in def.props) {
        this.p(key, props[key]);
      }
      this.incrVersion();
    }

    Model.prototype.incrVersion = function() {
      this.mem.incrVersion();
      this.addToBucket();
    }

    Model.prototype.addToBucket = function() {
      if (this.mem.isLoaded && this.bucket) {
        this.bucket.add(this.__id, this);
      }
    }

    return Model;
  }
}