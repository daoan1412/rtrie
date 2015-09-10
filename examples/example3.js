'use strict';

var co = require('co');
var Rtrie = require('.');
var rtrie = new Rtrie({
  metadataKey: false
});

var user = {
  _id: '55d2b3bffad4f453dbbb590b',
  username: 'user',
  avatar: 'avatar'
};

var user1 = {
  _id: '55d2b3fb7b61adf480a08192',
  username: 'user1',
  avatar: 'avatar1'
};

var user11 = {
  _id: '55d2b3fb7b61adf480a08193',
  username: 'user11',
  avatar: 'avatar11'
};

var priority = function (key, value, id, part) {
  return 100 - ( key.length - part.length );
};

co(function* () {
  var res;
  yield rtrie.add(user.username, null, user._id, priority);
  yield rtrie.add(user1.username, null, user1._id, priority);
  yield rtrie.add(user11.username, null, user11._id, priority);
  res = yield rtrie.search('user');
  console.log(res);
  // [ '55d2b3bffad4f453dbbb590b',
  //   '55d2b3fb7b61adf480a08192',
  //   '55d2b3fb7b61adf480a08193' ]
});