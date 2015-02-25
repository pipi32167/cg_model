'use strict';
var assert = require('assert');
var CGModel = require('../lib');
require('./init');
require('./models');

describe('lib/data/data_memory', function() {
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