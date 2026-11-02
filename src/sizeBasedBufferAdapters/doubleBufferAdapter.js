const { SizeBasedBufferStrategy } = require('../buffer/sizeBasedBufferStrategy');
const { DoubleBuffer } = require('../buffer/doubleBuffer');

class DoubleBufferAdapter extends SizeBasedBufferStrategy {
  constructor(bufferSize = 5) {
    super();
    this.bufferSize = bufferSize;
    this.buffer = new DoubleBuffer();
    this._staged = false;
  }

  // write into the back buffer — auto-flush via swap when bufferSize is reached
  write(item) {
    this.buffer.write(item);
    if (this.buffer.writeSize >= this.bufferSize) {
      this.buffer.swap();
      this.buffer.backBuffer = [];
      this._staged = true;
    }
  }

  // explicit flush — swap any remaining items regardless of size
  present() {
    if (this.buffer.writeSize > 0) {
      this.buffer.swap();
      this.buffer.backBuffer = [];
      this._staged = true;
    }
  }

  consume() {
    if (!this._staged) return [];
    this._staged = false;
    return this.buffer.drain();
  }

  size() {
    return this.buffer.writeSize;
  }
}

module.exports = { DoubleBufferAdapter };

