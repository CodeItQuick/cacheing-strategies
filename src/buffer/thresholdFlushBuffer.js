const DEFAULT_CAPACITY = 8;
const DEFAULT_THRESHOLD = 0.75;

class ThresholdFlushBuffer {
  constructor(flushFn, { capacity = DEFAULT_CAPACITY, threshold = DEFAULT_THRESHOLD } = {}) {
    this.flushFn = flushFn;
    this.capacity = capacity;
    this.threshold = threshold;
    this.buffer = [];
  }

  add(item) {
    this.buffer.push(item);
    if (this.buffer.length >= this.capacity * this.threshold) {
      this.flush();
    }
  }

  flush() {
    if (this.buffer.length === 0) return;
    const items = this.buffer;
    this.buffer = [];
    this.flushFn(items);
  }

  get size() {
    return this.buffer.length;
  }
}

module.exports = { ThresholdFlushBuffer };
