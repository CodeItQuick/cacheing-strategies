const DEFAULT_BUFFER_SIZE = 5;

class SizeBasedFlushBuffer {
  constructor(flushFn, { bufferSize = DEFAULT_BUFFER_SIZE } = {}) {
    this.flushFn = flushFn;
    this.bufferSize = bufferSize;
    this.buffer = [];
  }

  add(item) {
    this.buffer.push(item);
    if (this.buffer.length >= this.bufferSize) {
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

module.exports = { SizeBasedFlushBuffer };
