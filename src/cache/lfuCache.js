const DEFAULT_CAPACITY = 3;

class LfuCache {
  constructor(fetchFn, { capacity = DEFAULT_CAPACITY } = {}) {
    this.fetchFn = fetchFn;
    this.capacity = capacity;
    this.keyMap = new Map();   // key → { value, freq }
    this.freqMap = new Map();  // freq → Set of keys (insertion order = LRU tiebreaker)
    this.minFreq = 0;
  }

  async get(key) {
    if (this.keyMap.has(key)) {
      this._incrementFreq(key);
      return this.keyMap.get(key).value;
    }

    const value = await this.fetchFn(key);

    if (this.keyMap.size >= this.capacity) {
      this._evict();
    }

    this.keyMap.set(key, { value, freq: 1 });
    this._addToFreqBucket(1, key);
    this.minFreq = 1;

    return value;
  }

  _incrementFreq(key) {
    const entry = this.keyMap.get(key);
    const { freq } = entry;
    const nextFreq = freq + 1;

    entry.freq = nextFreq;
    this._removeFromFreqBucket(freq, key);
    this._addToFreqBucket(nextFreq, key);

    if (this.minFreq === freq && this.freqMap.get(freq).size === 0) {
      this.minFreq = nextFreq;
    }
  }

  _evict() {
    const keys = this.freqMap.get(this.minFreq);
    const lfuKey = keys.values().next().value;
    keys.delete(lfuKey);
    this.keyMap.delete(lfuKey);
  }

  _addToFreqBucket(freq, key) {
    if (!this.freqMap.has(freq)) {
      this.freqMap.set(freq, new Set());
    }
    this.freqMap.get(freq).add(key);
  }

  _removeFromFreqBucket(freq, key) {
    this.freqMap.get(freq).delete(key);
  }
}

module.exports = { LfuCache };
