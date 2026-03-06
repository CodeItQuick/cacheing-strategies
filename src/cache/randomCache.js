const DEFAULT_CAPACITY = 3;

class RandomCache {
  constructor(fetchFn, { capacity = DEFAULT_CAPACITY, random = Math.random } = {}) {
    this.fetchFn = fetchFn;
    this.capacity = capacity;
    this.random = random;
    this.cache = new Map();
  }

  async get(key) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const value = await this.fetchFn(key);

    if (this.cache.size >= this.capacity) {
      this._evictRandom();
    }

    this.cache.set(key, value);
    return value;
  }

  _evictRandom() {
    const keys = Array.from(this.cache.keys());
    const index = Math.floor(this.random() * keys.length);
    this.cache.delete(keys[index]);
  }
}

module.exports = { RandomCache };
