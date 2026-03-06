class EventDrivenCache {
  constructor(fallbackFn) {
    this.fallbackFn = fallbackFn;
    this.cache = new Map();
  }

  onPush(key, value) {
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }

  async get(key) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    return await this.fallbackFn(key);
  }
}

module.exports = { EventDrivenCache };
