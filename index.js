'use strict';

/**
 * @class Rtrie
 *
 * @param {Object} options
 * @param {String} options.trieKey the key prefixes for indexes
 * @param {String|false} options.metadataKey the key prefixes for metadata, if `false`, not save metadata to redis
 * @param {String} options.client redis client
 * @param {String} options.host redis host(only `client` not exist)
 * @param {String} options.port redis port(only `client` not exist)
 * @param {String} options.password redis password(only `client` not exist)
 */
function Rtrie(options) {
  options = options || {};
  this.trieKey = options.trieKey || 'trie:index:';
  this.metadataKey = options.metadataKey === false ? false : (options.metadataKey || 'trie:metadata');
  this.redis = options.client || new require('ioredis')(options);
}

/**
 * add the `key` with a given `value` and `id` and `priority`.
 *
 * @param {String} key key for index
 * @param {Object} value data you may want to store directly on the index.
 * @param {String} id id for metadata
 * @param {Number|Funcrion=>Number} priority the relevance of this item in comprassion of others.
 * @return {Promise} Promise
 * @api public
 */
Rtrie.prototype.add = function(key, value, id, priority) {
  if (arguments.length < 3) {
    return Promise.reject(new Error('`key` and `value` and `id` must be given!'));
  }
  priority = priority || function () { return 0; };
  var _priority;
  if ('number' === typeof priority) {
    _priority = function () { return priority; };
  } else if ('function' === typeof priority) {
    _priority = priority;
  } else {
    return Promise.reject(new Error('`priority` must be number or function!'));
  }

  var redis = this.redis;
  var trieKey = this.trieKey;
  var metadataKey = this.metadataKey;

  var parts = prefixes(key.toLowerCase());
  var multi = redis.multi();

  parts.forEach(function (part) {
    multi.zadd(trieKey + part, _priority.call(null, key, value, id, part), id);
  });

  if (metadataKey !== false) {
    multi.hset(metadataKey, id, JSON.stringify(value));
  }
  return multi.exec();
};

/**
 * del the `key`.
 *
 * @param {String} key key for index
 * @param {String} id id for metadata
 * @return {Promise} Promise
 * @api public
 */
Rtrie.prototype.del = function(key, id) {
  if (!key || !id) {
    return Promise.reject(new Error('`key` and `id` must be given!'));
  }

  var redis = this.redis;
  var trieKey = this.trieKey;
  var metadataKey = this.metadataKey;

  var parts = prefixes(key.toLowerCase());
  var multi = redis.multi();

  parts.forEach(function (part) {
    multi.zrem(trieKey + part, id);
  });
  
  if (metadataKey !== false) {
    multi.hdel(metadataKey, id);
  }
  return multi.exec();
};

/**
 * Searches for a key.
 * 
 * @param {String} key the search key
 * @param {Number} offset offset
 * @param {Number} limit limit
 * @return {Promise} Promise
 * @api public
 */
Rtrie.prototype.search = function(key, offset, limit) {
  if (!key) {
    return Promise.reject(new Error('`key` must be given!'));
  }
  offset = offset || 0;
  limit = limit || 20;

  var indexKey = this.trieKey + key.trim().toLowerCase();
  var redis = this.redis;
  var metadataKey = this.metadataKey;

  return redis.zrevrange(indexKey, offset, offset + limit - 1)
    .then(function (ids) {
      if (!ids.length) {
        return [];
      }
      if (metadataKey === false) {
        return ids;
      }
      return redis
        .hmget(metadataKey, ids)
        .then(function (metadatas) {
          return metadatas.map(JSON.parse);
        });
    });
};

/**
 * Return all the `term` prefixes.
 *
 * @param {String} term
 * @return {Array} prefixes of the term
 * @api private
 */
function prefixes(term) {
  return term
    .split(' ')
    .map(function (word) {
      word = word.trim();
      var prefixes = [];
      for (var i = 0; i < word.length; i++) {
        prefixes.push(word.slice(0, i + 1));
      }
      return prefixes;
    })
    .reduce(function (words, prefixes) {
      return words.concat(prefixes);
    });
}

module.exports = Rtrie;
