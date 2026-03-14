const { BufferStrategy } = require('../buffer/bufferStrategy');
const { JournalingBuffer } = require('../buffer/journalingBuffer');

class JournalingBufferStrategy extends BufferStrategy {
  constructor() {
    super();
    this._staged = [];
    this.buffer = new JournalingBuffer((pending) => {
      this._staged = [...pending];
    });
  }

  write(item) {
    this.buffer.append(item);
  }

  present() {
    this._staged = [];
    this.buffer.checkpoint();
  }

  consume() {
    const items = this._staged;
    this._staged = [];
    return items;
  }

  size() {
    return this.buffer.pendingSize;
  }
}

module.exports = { JournalingBufferStrategy };
