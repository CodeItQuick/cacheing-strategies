const { SizeBasedBufferStrategy } = require('../buffer/sizeBasedBufferStrategy');
const { SizeBasedFlushBuffer } = require('../buffer/sizeBasedFlushBuffer');

class SizeBasedBufferStrategyAdapter extends SizeBasedBufferStrategy {
  constructor(bufferSize = 5) {
    super();
    this._staged = [];
    // flushFn captures the auto-flushed batch into _staged so consume() can return it
    this.buffer = new SizeBasedFlushBuffer(
      (items) => { this._staged = [...items]; },
      { bufferSize }
    );
  }

  // auto-flushes into _staged when bufferSize is reached
  write(item) {
    this.buffer.add(item);
  }

  // explicit flush — promotes any remaining items below the threshold into _staged
  present() {
    this.buffer.flush();
  }

  // returns items captured by flushFn, then clears them
  consume() {
    const items = this._staged;
    this._staged = [];
    return items;
  }

  size() {
    return this.buffer.size;
  }
}

module.exports = { SizeBasedBufferStrategyAdapter };

