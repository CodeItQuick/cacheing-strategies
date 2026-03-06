class WriteThroughCache {
  constructor(fetchFn, backingStore) {
    this.fetchFn = fetchFn;
    this.backingStore = backingStore;
    this.cache = new Map();
  }

  async get(key) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const value = await this.fetchFn(key);
    this._writeThrough(key, value);
    return value;
  }

  _writeThrough(key, value) {
    this.cache.set(key, value);
    this.backingStore.set(key, value);
  }
}

module.exports = { WriteThroughCache };
