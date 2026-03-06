const DEFAULT_TTL_MS = 5000;
const DEFAULT_REFRESH_THRESHOLD = 0.75; // refresh when 75% of TTL has elapsed

class RefreshAheadCache {
  constructor(fetchFn, { ttlMs = DEFAULT_TTL_MS, refreshThreshold = DEFAULT_REFRESH_THRESHOLD, now = () => Date.now() } = {}) {
    this.fetchFn = fetchFn;
    this.ttlMs = ttlMs;
    this.refreshThreshold = refreshThreshold;
    this.now = now;
    this.cache = new Map();
    this.refreshing = new Set();
  }

  async get(key) {
    const entry = this.cache.get(key);

    if (!entry || this._isExpired(entry)) {
      const value = await this.fetchFn(key);
      this.cache.set(key, { value, fetchedAt: this.now() });
      return value;
    }

    if (this._isNearExpiry(entry)) {
      this._refreshInBackground(key);
    }

    return entry.value;
  }

  _isExpired(entry) {
    return (this.now() - entry.fetchedAt) >= this.ttlMs;
  }

  _isNearExpiry(entry) {
    const elapsed = this.now() - entry.fetchedAt;
    return elapsed >= this.ttlMs * this.refreshThreshold;
  }

  _refreshInBackground(key) {
    if (this.refreshing.has(key)) return;
    this.refreshing.add(key);
    this.fetchFn(key)
      .then((value) => {
        this.cache.set(key, { value, fetchedAt: this.now() });
      })
      .finally(() => {
        this.refreshing.delete(key);
      });
  }
}

module.exports = { RefreshAheadCache };
