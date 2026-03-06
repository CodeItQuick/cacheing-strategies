class MemoCache {
  constructor(fetchFn) {
    this.fetchFn = fetchFn;
    this.cache = new Map();
  }

  async get(key) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const value = await this.fetchFn(key);
    this.cache.set(key, value);
    return value;
  }
}

module.exports = { MemoCache };
