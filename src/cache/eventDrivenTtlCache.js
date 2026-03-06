const DEFAULT_TTL_MS = 5000;

class EventDrivenTtlCache {
  constructor(fallbackFn, { ttlMs = DEFAULT_TTL_MS, now = () => Date.now() } = {}) {
    this.fallbackFn = fallbackFn;
    this.ttlMs = ttlMs;
    this.now = now;
    this.cache = new Map();
  }

  // called by the device push listener — no polling, no delay
  onPush(key, value) {
    this._writeToCache(key, value);
  }

  async get(key) {
    const entry = this.cache.get(key);
    const isExpired = !entry || (this.now() - entry.timestamp) >= this.ttlMs;

    if (!isExpired) {
      return entry.value;
    }

    // wifi likely down — fall back to direct device poll
    const value = await this.fallbackFn(key);
    this._writeToCache(key, value);
    return value;
  }

  _writeToCache(key, value) {
    this.cache.set(key, { value, timestamp: this.now() });
  }
}

module.exports = { EventDrivenTtlCache };
