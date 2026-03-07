const DEFAULT_CAPACITY = 60;

class SlidingWindowBuffer {
  constructor({ capacity = DEFAULT_CAPACITY } = {}) {
    this.capacity = capacity;
    this.window = [];
  }

  add(item) {
    if (this.window.length >= this.capacity) {
      this.window.shift();
    }
    this.window.push(item);
  }

  getWindow() {
    return [...this.window];
  }

  get size() {
    return this.window.length;
  }

  get isFull() {
    return this.window.length === this.capacity;
  }
}

module.exports = { SlidingWindowBuffer };
