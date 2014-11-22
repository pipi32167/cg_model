// 'use strict';
// var async = require('async');
// require('./friend');
// require('./init')({
//   connectionLimit: 10,
//   host: 'localhost',
//   user: 'yqb',
//   password: 'yqb',
//   database: 'card',
// });
// var Friend = require('../lib').getModel('Friend');

// var testCRUD = function() {

//   var friend = new Friend();
//   // var loadUser = new User();
//   // var updateUser = new User();
//   // var removeUser = new User();

//   async.series({

//     create: function(cb) {
//       console.log('============ create ============');
//       friend.p({
//         userId: 1,
//         friendId: 4,
//         type: 0,
//       });
//       friend.create(cb);
//     },

//     // load: function(cb) {
//     //   console.log('============ load ============');
//     //   loadUser.p('userId', user.p('userId'));
//     //   loadUser.load(cb);
//     // },

//     // update: function(cb) {
//     //   console.log('============ update ============');
//     //   loadUser.p('name', '0' + loadUser.p('name'));
//     //   loadUser.update(cb);
//     // },

//     // load2: function(cb) {
//     //   console.log('============ load2 ============');
//     //   updateUser.p('userId', loadUser.p('userId'));
//     //   updateUser.load(cb);
//     // },

//     // remove: function(cb) {
//     //   console.log('============ remove ============');
//     //   loadUser.remove(cb);
//     // },

//     // load3: function(cb) {
//     //   console.log('============ load3 ============');
//     //   removeUser.p('userId', loadUser.p('userId'));
//     //   removeUser.load(cb);
//     // }
//   }, function(err) {
//     console.log(err);
//     process.exit(0);
//   })
// }

// testCRUD();