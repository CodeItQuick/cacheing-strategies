class DoubleBuffer {
  constructor() {
    this.backBuffer = [];
    this.frontBuffer = [];
  }

  write(item) {
    this.backBuffer.push(item);
  }

  swap() {
    const temp = this.frontBuffer;
    this.frontBuffer = this.backBuffer;
    this.backBuffer = temp;
  }

  drain() {
    const items = this.frontBuffer;
    this.frontBuffer = [];
    return items;
  }

  get writeSize() {
    return this.backBuffer.length;
  }

  get readSize() {
    return this.frontBuffer.length;
  }
}

module.exports = { DoubleBuffer };
