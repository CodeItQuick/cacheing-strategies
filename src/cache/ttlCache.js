const DEFAULT_TTL_MS = 5000;

class TtlCache {
  constructor(fetchFn, { ttlMs = DEFAULT_TTL_MS, now = () => Date.now() } = {}) {
    this.fetchFn = fetchFn;
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

    const value = await this.fetchFn(key);
    this.cache.set(key, { value, timestamp: this.now() });
    return value;
  }
}

module.exports = { TtlCache };
