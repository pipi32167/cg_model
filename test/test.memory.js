'use strict';
var assert = require('assert');
var async = require('async');
var CGModel = require('../lib');
require('./init');
require('./models');
var helper = require('./helper');

describe('lib/data/data_memory', function() {

  describe('p', function() {

    it('should change user failed when the property type is invalid', function(done) {

      var User = CGModel.getModel('User');
      var userId, user;

      async.series({
        create: function(cb) {

          user = new User();
          user.create(function(err) {
            assert.ok(!err, err);
            userId = user.p('userId');
            helper.checkModelIsLoaded(user);
            cb();
          });
        },

        update: function(cb) {
          assert.throws(function() {
            user.p({
              userId: user.userId,
              name: 1,
            });
          });
          cb();
        },

      }, function(err) {
        assert.ok(!err, err);
        done();
      });
    });
  });

  describe('static checkProps', function() {

    it('should check properties success', function() {
      var Item5 = CGModel.getModel('Item5');

      var item = {};
      assert.throws(function() {
        Item5.checkProps(item);
      });

      item = {
        id: '1'
      };
      assert.throws(function() {
        Item5.checkProps(item);
      });

      item = {
        id: 1,
        itemId: 1,
        isLock: true,
        desc: '',
        updateTime: new Date(),
        properties1: {},
        properties2: [],
      };
      Item5.checkProps(item);

      item = {
        id: 1,
        itemId: 1,
        isLock: true,
        desc: '',
        updateTime: new Date().toString(),
        properties1: {},
        properties2: [],
      };
      assert.throws(function() {
        Item5.checkProps(item);
      });

      item = {
        id: 1,
        itemId: 1,
        isLock: true,
        desc: '',
        updateTime: new Date(),
        properties1: [],
        properties2: [],
      };
      assert.throws(function() {
        Item5.checkProps(item);
      });

      item = {
        id: 1,
        itemId: 1,
        isLock: true,
        desc: '',
        updateTime: new Date(),
        properties1: [],
        properties2: {},
      };
      assert.throws(function() {
        Item5.checkProps(item);
      });

      item = {
        id: 1,
        itemId: 1,
        isLock: false,
        desc: '',
        updateTime: new Date(),
        properties1: {},
        properties2: [],
      };
      Item5.checkProps(item);
    });

    it('should check item wrapper properties success', function() {
      var Item5Wrapper = CGModel.getModel('Item5Wrapper');
      var wrapper = {
        item: {
          id: 1,
          itemId: 1,
          isLock: false,
          desc: '',
          updateTime: new Date(),
          properties1: {},
          properties2: [],
        }
      };

      Item5Wrapper.checkProps(wrapper);

      wrapper = {};
      assert.throws(function() {
        Item5Wrapper.checkProps(wrapper);
      });

      wrapper = {
        item: {
          id: '1',
          itemId: 1,
          isLock: false,
          desc: '',
          updateTime: new Date(),
          properties1: {},
          properties2: [],
        }
      };
      assert.throws(function() {
        Item5Wrapper.checkProps(wrapper);
      });
    });

    it('should check item array properties success', function() {
      var Item5Array = CGModel.getModel('Item5Array');
      var array = {};

      assert.throws(function() {
        Item5Array.checkProps(array);
      });

      array = {
        items: {}
      };
      assert.throws(function() {
        Item5Array.checkProps(array);
      });

      array = {
        items: [{
          id: '1',
          itemId: 1,
          isLock: false,
          desc: '',
          updateTime: new Date(),
          properties1: {},
          properties2: [],
        }]
      };
      assert.throws(function() {
        Item5Array.checkProps(array);
      });
      array = {
        items: [{
          id: 1,
          itemId: 1,
          isLock: false,
          desc: '',
          updateTime: new Date(),
          properties1: {},
          properties2: [],
        }, {
          id: 1,
          itemId: 1,
          isLock: false,
          desc: '',
          updateTime: new Date().toString(),
          properties1: {},
          properties2: [],
        }]
      };
      assert.throws(function() {
        Item5Array.checkProps(array);
      });

      array = {
        items: [{
          id: 1,
          itemId: 1,
          isLock: false,
          desc: '',
          updateTime: new Date(),
          properties1: {},
          properties2: [],
        }, {
          id: 1,
          itemId: 1,
          isLock: false,
          desc: '',
          updateTime: new Date(),
          properties1: {},
          properties2: [],
        }]
      };
      Item5Array.checkProps(array);
    });

    it('should check item dict properties success', function() {
      var Item5Dict = CGModel.getModel('Item5Dict');
      var dict = {};

      assert.throws(function() {
        Item5Dict.checkProps(dict);
      });

      dict = {
        items: ''
      };
      assert.throws(function() {
        Item5Dict.checkProps(dict);
      });

      dict = {
        items: {}
      };
      Item5Dict.checkProps(dict);

      dict = {
        items: {
          item1: {}
        }
      };
      assert.throws(function() {
        Item5Dict.checkProps(dict);
      });

      dict = {
        items: {
          item1: {
            id: '1',
            itemId: 1,
            isLock: false,
            desc: '',
            updateTime: new Date(),
            properties1: {},
            properties2: [],
          }
        }
      };
      assert.throws(function() {
        Item5Dict.checkProps(dict);
      });

      dict = {
        items: {
          item1: {
            id: 1,
            itemId: 1,
            isLock: false,
            desc: '',
            updateTime: new Date(),
            properties1: {},
            properties2: [],
          },

          item2: {
            id: 1,
            itemId: 1,
            isLock: false,
            desc: '',
            updateTime: new Date().toString(),
            properties1: {},
            properties2: [],
          }
        }
      };
      assert.throws(function() {
        Item5Dict.checkProps(dict);
      });

      dict = {
        items: {
          item1: {
            id: 1,
            itemId: 1,
            isLock: false,
            desc: '',
            updateTime: new Date(),
            properties1: {},
            properties2: [],
          },

          item2: {
            id: 1,
            itemId: 1,
            isLock: false,
            desc: '',
            updateTime: new Date(),
            properties1: {},
            properties2: [],
          }
        }
      };
      Item5Dict.checkProps(dict);
    })
  });
});