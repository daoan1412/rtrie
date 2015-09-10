## redis-trie

Trie based autocomplete with Redis.

### Install

```
npm i redis-trie --save
```

### Usage

```
var rtrie = new Rtrie(options)
```

options:

- trieKey: {String} the key prefixes for indexes, default 'trie:index:'
- metadataKey: {String|false} the key prefixes for metadata, default 'trie:metadata', if `false`, not save metadata to redis.
- client: {Object} redis client
- host: {String} redis host(only `client` not exist)
- port: {String} redis port(only `client` not exist)
- password: {String} redis password(only `client` not exist)
- others option see [ioredis](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options)

#### rtrie.add(key, value, id, priority) => {Promise}

add the `key` with a given `value` and `id` and `priority`.

- key: {String} key for index
- value: {Object} data you may want to store directly on the index.
- id: {String} id for metadata
- priority: {Number|Funcrion=>Number} the relevance of this item in comprassion of others.

#### rtrie.del(key, id) => {Promise}

del the `key`.

- key: {String} key for index
- id: {String} id for metadata

#### rtrie.search(key[, offset][, limit]) => {Promise}

search for a key.

- key: {String} the search key
- offset: {Number} offset, default 0
- limit: {Number} limit, default 20

### Example

```
'use strict';

var co = require('co');
var Rtrie = require('.');
var rtrie = new Rtrie();

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

co(function* () {
  var res;
  yield rtrie.add(user1.username, user1, user1._id, dateFromObjectId(user1._id));
  res = yield rtrie.search('user');
  console.log(res);
  // [ { _id: '55d2b3bffad4f453dbbb590b',
  //     username: 'user1',
  //     avatar: 'avatar1' } ]
  res = yield rtrie.search('user1');
  console.log(res);
  // [ { _id: '55d2b3bffad4f453dbbb590b',
  //     username: 'user1',
  //     avatar: 'avatar1' } ]
  res = yield rtrie.search('user2');
  console.log(res);
  // []

  rtrie.add(user2.username, user2, user2._id, dateFromObjectId(user2._id));
  res = yield rtrie.search('user');
  console.log(res);
  // [ { _id: '55d2b3fb7b61adf480a08192',
  //     username: 'user2',
  //     avatar: 'avatar2' },
  //   { _id: '55d2b3bffad4f453dbbb590b',
  //     username: 'user1',
  //     avatar: 'avatar1' } ]
  res = yield rtrie.search('user1');
  console.log(res);
  // [ { _id: '55d2b3bffad4f453dbbb590b',
  //     username: 'user1',
  //     avatar: 'avatar1' } ]
  res = yield rtrie.search('user2');
  console.log(res);
  // [ { _id: '55d2b3fb7b61adf480a08192',
  //     username: 'user2',
  //     avatar: 'avatar2' } ]

  yield rtrie.del(user1.username, user1._id);

  res = yield rtrie.search('user');
  console.log(res);
  // [ { _id: '55d2b3fb7b61adf480a08192',
  //     username: 'user2',
  //     avatar: 'avatar2' } ]
  res = yield rtrie.search('user1');
  console.log(res);
  // []
  res = yield rtrie.search('user2');
  console.log(res);
  // [ { _id: '55d2b3fb7b61adf480a08192',
  //     username: 'user2',
  //     avatar: 'avatar2' } ]
});
```

or

```
'use strict';

var co = require('co');
var Rtrie = require('.');
var rtrie = new Rtrie();

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
  yield rtrie.add(user.username, user, user._id, priority);
  yield rtrie.add(user1.username, user1, user1._id, priority);
  yield rtrie.add(user11.username, user11, user11._id, priority);
  res = yield rtrie.search('user');
  console.log(res);
  // [ { _id: '55d2b3bffad4f453dbbb590b',
  //     username: 'user',
  //     avatar: 'avatar' },
  //   { _id: '55d2b3fb7b61adf480a08192',
  //     username: 'user1',
  //     avatar: 'avatar1' },
  //   { _id: '55d2b3fb7b61adf480a08193',
  //     username: 'user11',
  //     avatar: 'avatar11' } ]
});
```

when `metadataKey` is `false`:

```
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
```

### Test

```
npm test
```