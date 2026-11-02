const { SizeBasedBufferStrategy } = require('../buffer/sizeBasedBufferStrategy');
const { TripleBuffer } = require('../buffer/tripleBuffer');

class TripleBufferAdapter extends SizeBasedBufferStrategy {
  constructor(bufferSize = 5) {
    super();
    this.bufferSize = bufferSize;
    this.buffer = new TripleBuffer();
  }

  // write into the triple buffer — auto-flush via present() when bufferSize is reached
  write(item) {
    this.buffer.write(item);
    if (this.buffer.writeSize >= this.bufferSize) {
      this.buffer.present();
    }
  }

  // explicit flush — promotes any remaining pending items regardless of size
  present() {
    if (this.buffer.writeSize > 0) {
      this.buffer.present();
    }
  }

  consume() {
    return this.buffer.consume();
  }

  size() {
    return this.buffer.writeSize;
  }
}

module.exports = { TripleBufferAdapter };

