const DEFAULT_CAPACITY = 3;

class FifoCache {
  constructor(fetchFn, { capacity = DEFAULT_CAPACITY } = {}) {
    this.fetchFn = fetchFn;
    this.capacity = capacity;
    this.cache = new Map();
  }

  async get(key) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const value = await this.fetchFn(key);

    if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, value);
    return value;
  }
}

module.exports = { FifoCache };
