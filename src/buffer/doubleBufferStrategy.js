const { BufferStrategy } = require('./bufferStrategy');
const { DoubleBuffer } = require('./doubleBuffer');

class DoubleBufferStrategy extends BufferStrategy {
  constructor() {
    super();
    this.buffer = new DoubleBuffer();
    this._staged = false;
  }

  write(item) {
    this.buffer.write(item);
  }

  present() {
    this.buffer.swap();
    this.buffer.backBuffer = [];
    this._staged = true;
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

module.exports = { DoubleBufferStrategy };
