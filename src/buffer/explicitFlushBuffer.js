class ExplicitFlushBuffer {
  constructor(flushFn) {
    this.flushFn = flushFn;
    this.buffer = [];
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

  get size() {
    return this.buffer.length;
  }
}

module.exports = { ExplicitFlushBuffer };
