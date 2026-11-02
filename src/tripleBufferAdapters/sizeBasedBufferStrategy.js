const { BufferStrategy } = require('../buffer/bufferStrategy');
const { SizeBasedFlushBuffer } = require('../buffer/sizeBasedFlushBuffer');


class SizeBasedBufferStrategy extends BufferStrategy {
  constructor(bufferSize = 5) {
    super();
    this._staged = [];
    this.buffer = new SizeBasedFlushBuffer(
      (items) => { this._staged = [...items]; },
      { bufferSize }
    );
  }

  // delegates to SizeBasedFlushBuffer — auto-flushes into _staged when bufferSize is reached
  write(item) {
    this.buffer.add(item);
  }

  // explicit flush — promotes any remaining items into _staged
  present() {
    this.buffer.flush();
  }

  // returns items captured by flushFn at auto-flush or present() time, then clears them
  consume() {
    const items = this._staged;
    this._staged = [];
    return items;
  }

  size() {
    return this.buffer.size;
  }
}

module.exports = { SizeBasedBufferStrategy };
