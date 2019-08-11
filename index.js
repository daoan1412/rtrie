'use strict';


var vietnameseMap = [{
    "a": ["à", "á", "ạ", "ả", "ã", "â", "ầ", "ấ", "ậ", "ẩ", "ẫ", "ă", "ằ", "ắ", "ặ", "ẳ", "ẵ"]
}, {
    "e": ["è", "é", "ẹ", "ẻ", "ẽ", "ê", "ề", "ế", "ệ", "ể", "ễ"]
}, {
    "i": ["ì", "í", "ị", "ỉ", "ĩ"]
}, {
    "o": ["ò", "ó", "ọ", "ỏ", "õ", "ô", "ồ", "ố", "ộ", "ổ", "ỗ", "ơ", "ờ", "ớ", "ợ", "ở", "ỡ"]
}, {
    "u": ["ù", "ú", "ụ", "ủ", "ũ", "ư", "ừ", "ứ", "ự", "ử", "ữ"]
}, {
    "y": ["ỳ", "ý", "ỵ", "ỷ", "ỹ"]
}, {
    "d": ["đ"]
}]
var Redis = require('ioredis');

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
    this.redis = options.client || new Redis(options);
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
    priority = priority || function() {
        return 0;
    };
    var _priority;
    if ('number' === typeof priority) {
        _priority = function() {
            return priority;
        };
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

    parts.forEach(function(part) {
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

    parts.forEach(function(part) {
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

    var indexKey = this.trieKey + normalize(key.trim().toLowerCase());
    var redis = this.redis;
    var metadataKey = this.metadataKey;

    return redis.zrevrange(indexKey, offset, offset + limit - 1)
        .then(function(ids) {
            if (!ids.length) {
                return [];
            }
            if (metadataKey === false) {
                return ids;
            }
            return redis
                .hmget(metadataKey, ids)
                .then(function(metadatas) {
                    return metadatas.map(JSON.parse);
                });
        });
};

/**
    Generate prefixes
 */

function replaceSpecialChars(string) {
    return string.replace(/-/g, ' ')
}

function stringToPhrases(string) {
    let words = string.split(' '),
        phrases = [];
    for (let i = 0; i < words.length; i++) {
        let phrase = words[i];
        for (let j = i + 1; j < words.length; j++) {
            phrase += ' ' + words[j]
        }
        phrases.push(phrase);
    }
    return phrases
}

function tokenize(phrase) {
    let prefixes = [],
        prefix = '',
        chars = phrase.split('');
    for (let i = 0; i < chars.length; i++) {
        prefix += chars[i];
        if (prefix.trim() == prefixes.slice(-1).pop()) {
            continue;
        }
        prefixes.push(prefix.trim())
    }
    return prefixes;
}

function prefixes(string) {
    let prefixes = []
    for (let phrase of stringToPhrases(normalize(string))) {
        prefixes.push(...tokenize(phrase))
    }
    return prefixes;
}

// normalize a string with Vietnamese
// into non-accent mark
function normalize(string) {
    string = replaceSpecialChars(string)
    return string
        .split('')
        .map(char => {
            for (let value of vietnameseMap) {
                if (Object.values(value)[0].indexOf(char) > -1) {
                    return Object.keys(value)[0]
                }
            }
            return char
        })
        .join('')
}

module.exports = Rtrie;