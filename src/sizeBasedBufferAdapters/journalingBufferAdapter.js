const { SizeBasedBufferStrategy } = require('../buffer/sizeBasedBufferStrategy');
const { JournalingBuffer } = require('../buffer/journalingBuffer');

class JournalingBufferAdapter extends SizeBasedBufferStrategy {
  constructor(bufferSize = 5) {
    super();
    this.bufferSize = bufferSize;
    this._staged = [];
    // applyFn captures the committed batch into _staged so consume() can return it
    this.buffer = new JournalingBuffer((pending) => {
      this._staged = [...pending];
    });
  }

  // append to the journal — auto-checkpoint when bufferSize is reached
  write(item) {
    this.buffer.append(item);
    if (this.buffer.pendingSize >= this.bufferSize) {
      this._staged = [];
      this.buffer.checkpoint();
    }
  }

  // explicit flush — checkpoint any remaining pending items regardless of size
  present() {
    if (this.buffer.pendingSize > 0) {
      this._staged = [];
      this.buffer.checkpoint();
    }
  }

  // returns items captured by applyFn at checkpoint time, then clears them
  consume() {
    const items = this._staged;
    this._staged = [];
    return items;
  }

  size() {
    return this.buffer.pendingSize;
  }
}

module.exports = { JournalingBufferAdapter };

