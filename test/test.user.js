'use strict';
var async = require('async');
require('./user');
require('./init')();
var User = require('../lib').getModel('User');

var testCRUD = function() {

  var user = new User();
  var loadUser = new User();
  var updateUser = new User();
  var removeUser = new User();

  // user.p('userId', 1);

  async.series({

    create: function(cb) {
      console.log('============ create ============');
      user.create(cb);
    },

    load: function(cb) {
      console.log('============ load ============');
      loadUser.p('userId', user.p('userId'));
      loadUser.load(cb);
    },

    update: function(cb) {
      console.log('============ update ============');
      loadUser.p('name', '0' + loadUser.p('name'));
      loadUser.update(cb);
    },

    load2: function(cb) {
      console.log('============ load2 ============');
      updateUser.p('userId', loadUser.p('userId'));
      updateUser.load(cb);
    },

    remove: function(cb) {
      console.log('============ remove ============');
      loadUser.remove(cb);
    },

    load3: function(cb) {
      console.log('============ load3 ============');
      removeUser.p('userId', loadUser.p('userId'));
      removeUser.load(cb);
    }
  }, function(err) {
    console.log(err);
    process.exit(0);
  })

}

var testFindOneByUserId = function() {

  console.log('testFindOneByUserId');
  User.find({
    userId: 11
  }, function(err, res) {
    console.log(err, res);
    process.exit(0);
  });
}

var testFindManyByUserId = function () {
  
  console.log('testFindOneByUserId');
  User.find({
    userId: [11,12,13,14]
  }, function(err, res) {
    console.log(err, res);
    process.exit(0);
  });
}

var testFindOneByName = function () {
  
  console.log('testFindOneByName');
  User.find({
    name: 'test11'
  }, function(err, res) {
    console.log(err, res);
    process.exit(0);
  });
}

var testFindManyByName = function () {
  
  console.log('testFindManyByName');
  User.find({
    name: ['test11', 'test12', 'test13', 'test14']
  }, function(err, res) {
    console.log(err, res);
    process.exit(0);
  });
}
testCRUD();
// testFindOneByName();
// testFindOneByUserId();
// testFindManyByUserId();
// testFindManyByName();