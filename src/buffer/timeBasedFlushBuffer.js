const DEFAULT_INTERVAL_MS = 2000;

class TimeBasedFlushBuffer {
  constructor(flushFn, { intervalMs = DEFAULT_INTERVAL_MS } = {}) {
    this.flushFn = flushFn;
    this.buffer = [];
    this.timer = setInterval(() => this.flush(), intervalMs);
  }

  add(item) {
    this.buffer.push(item);
  }

  flush() {
    if (this.buffer.length === 0) return;
    const items = this.buffer;
    this.buffer = [];
    this.flushFn(items);
  }

  close() {
    clearInterval(this.timer);
    this.flush();
  }

  get size() {
    return this.buffer.length;
  }
}

module.exports = { TimeBasedFlushBuffer };
