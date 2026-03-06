class ReadThroughCache {
  constructor(backingStore) {
    this.backingStore = backingStore;
    this.cache = new Map();
  }

  async get(key) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const value = await this.backingStore.get(key);
    this.cache.set(key, value);
    return value;
  }
}

module.exports = { ReadThroughCache };
