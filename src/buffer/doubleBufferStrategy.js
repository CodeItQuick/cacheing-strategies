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

  // stages the back buffer — swap is deferred to consume() to match TripleBuffer semantics
  present() {
    this._staged = true;
  }

  // swap() + drain() happen together so the caller sees the same present/consume contract as TripleBufferStrategy
  consume() {
    if (!this._staged) return [];
    this.buffer.swap();
    this._staged = false;
    return this.buffer.drain();
  }

  size() {
    return this.buffer.writeSize;
  }
}

module.exports = { DoubleBufferStrategy };
