'use strict';

var deepEqual = require('deep-equal');
var redis = new require('ioredis')();
var Rtrie = require('..');
var rtrie = new Rtrie({
  client: redis
});

redis.on('error', function (err) {
  console.error(err);
  process.exit(1);
});

var user1 = {
  _id: '55d2b3bffad4f453dbbb590b', // timestamp: 1439871935000
  username: 'user1',
  avatar: 'avatar1'
};

var user2 = {
  _id: '55d2b3fb7b61adf480a08192', // timestamp: 1439871995000
  username: 'user2',
  avatar: 'avatar2'
};

var dateFromObjectId = function (objectId) {
  return new Date(parseInt(objectId.substring(0, 8), 16) * 1000).getTime();
};

describe('Test redis-trie', function () {
  it ('.add("user1")', function (done) {
    rtrie.add(user1.username, user1, user1._id, dateFromObjectId(user1._id))
      .then(function () {
        done();
      })
      .catch(done);
  });
  it ('.search("user") && .search("user1") && .search("user2")', function (done) {
    rtrie.search('user')
      .then(function (res) {
        if (!deepEqual(res[0], user1)) {
          return done(new Error('res[0] not equals to user1'));
        }
        return rtrie.search('user1');
      })
      .then(function (res) {
        if (!deepEqual(res[0], user1)) {
          return done(new Error('res[0] not equals to user1'));
        }
        return rtrie.search("user2");
      })
      .then(function (res) {
        if (!res || res.length) {
          return done(new Error('res should be []'));
        }
        done();
      })
      .catch(done);
  });
  it ('.add("user2")', function (done) {
    rtrie.add(user2.username, user2, user2._id, dateFromObjectId(user2._id))
      .then(function () {
        done();
      })
      .catch(done);
  });
  it ('.search("user") && .search("user1") && .search("user2")', function (done) {
    rtrie.search('user')
      .then(function (res) {
        if (!deepEqual(res, [user2, user1])) {
          return done(new Error('res not equals to [user2, user1]'));
        }
        return rtrie.search('user1');
      })
      .then(function (res) {
        if (!deepEqual(res[0], user1)) {
          return done(new Error('res[0] not equals to user1'));
        }
        return rtrie.search('user2');
      })
      .then(function (res) {
        if (!deepEqual(res[0], user2)) {
          return done(new Error('res[0] not equals to user2'));
        }
        done();
      })
      .catch(done);
  });
  it ('.del("user1")', function (done) {
    rtrie.del(user1.username, user1._id)
      .then(function () {
        done();
      })
      .catch(done);
  });
  it ('.search("user") && .search("user1") && .search("user2")', function (done) {
    rtrie.search('user')
      .then(function (res) {
        if (!deepEqual(res[0], user2)) {
          return done(new Error('res[0] not equals to user2'));
        }
        return rtrie.search('user1');
      })
      .then(function (res) {
        if (!res || res.length) {
          return done(new Error('res should be []'));
        }
        return rtrie.search('user2');
      })
      .then(function (res) {
        if (!deepEqual(res[0], user2)) {
          return done(new Error('res[0] not equals to user2'));
        }
        done();
      })
      .catch(done);
  });
  it ('.del("user2")', function (done) {
    rtrie.del(user2.username, user2._id)
      .then(function () {
        done();
      })
      .catch(done);
  });
  it ('.search("user")', function (done) {
    rtrie.search('user')
      .then(function (res) {
        if (!res || res.length) {
          return done(new Error('res should be []'));
        }
        done();
      })
      .catch(done);
  });
});