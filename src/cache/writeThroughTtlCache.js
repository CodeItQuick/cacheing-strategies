const DEFAULT_TTL_MS = 5000;

class WriteThroughTtlCache {
  constructor(readFn, writeFn, { ttlMs = DEFAULT_TTL_MS, now = () => Date.now() } = {}) {
    this.readFn = readFn;
    this.writeFn = writeFn;
    this.ttlMs = ttlMs;
    this.now = now;
    this.cache = new Map();
  }

  async get(key) {
    const entry = this.cache.get(key);
    const isExpired = entry && (this.now() - entry.timestamp) >= this.ttlMs;

    if (entry && !isExpired) {
      return entry.value;
    }

    const value = await this.readFn(key);
    this._writeToCache(key, value);
    return value;
  }

  async set(key, value) {
    const result = await this.writeFn(key, value);
    this._writeToCache(key, result);
    return result;
  }

  _writeToCache(key, value) {
    this.cache.set(key, { value, timestamp: this.now() });
  }
}

module.exports = { WriteThroughTtlCache };
