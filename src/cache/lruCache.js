const DEFAULT_CAPACITY = 3;

class LruCache {
  constructor(fetchFn, { capacity = DEFAULT_CAPACITY } = {}) {
    this.fetchFn = fetchFn;
    this.capacity = capacity;
    this.cache = new Map();
  }

  async get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }

    const value = await this.fetchFn(key);

    if (this.cache.size >= this.capacity) {
      const lruKey = this.cache.keys().next().value;
      this.cache.delete(lruKey);
    }

    this.cache.set(key, value);
    return value;
  }
}

module.exports = { LruCache };
