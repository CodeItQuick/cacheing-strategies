const { BufferStrategy } = require('./bufferStrategy');
const { TripleBuffer } = require('./tripleBuffer');

class TripleBufferStrategy extends BufferStrategy {
  constructor() {
    super();
    this.buffer = new TripleBuffer();
  }

  write(item) {
    this.buffer.write(item);
  }

  present() {
    this.buffer.present();
  }

  consume() {
    return this.buffer.consume();
  }

  size() {
    return this.buffer.writeSize;
  }
}

module.exports = { TripleBufferStrategy };
