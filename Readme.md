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

- trieKey: the key prefixes for indexes, default 'trie:index:'
- metadataKey: the key prefixes for metadata, default 'trie:metadata'
- client: redis client
- host: redis host(only `client` not exist)
- port: redis port(only `client` not exist)
- password: redis password(only `client` not exist)
- others option see [ioredis](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options)

#### rtrie.add(key, value, id, priority) => {Promise}

add the `key` with a given `value` and `id` and `priority`.

- key: key for index
- value: data you may want to store directly on the index.
- id: id for metadata
- priority: the relevance of this item in comprassion of others.

#### rtrie.del(key, id) => {Promise}

del the `key`.

- key: key for index
- id: id for metadata

#### rtrie.search(key[, offset][, limit]) => {Promise}

search for a key.

- key: the search key
- offset: offset, default 0
- limit: limit, default 20

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

### Test

```
npm test
```