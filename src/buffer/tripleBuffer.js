class TripleBuffer {
  constructor() {
    this.writeBuffer = [];
    this.readyBuffer = [];
    this.displayBuffer = [];
  }

  write(item) {
    this.writeBuffer.push(item);
  }

  present() {
    // Completed frame overwrites the ready slot — producer never needs to wait for the consumer
    this.readyBuffer = this.writeBuffer;
    this.writeBuffer = [];
  }

  consume() {
    // Latest ready frame moves to display; ready slot is cleared for the next frame
    [this.readyBuffer, this.displayBuffer] = [[], this.readyBuffer];
    return [...this.displayBuffer];
  }

  get writeSize() {
    return this.writeBuffer.length;
  }

  get readySize() {
    return this.readyBuffer.length;
  }

  get displaySize() {
    return this.displayBuffer.length;
  }
}

module.exports = { TripleBuffer };
