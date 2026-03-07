const DEFAULT_CAPACITY = 8;

class RingBuffer {
  constructor({ capacity = DEFAULT_CAPACITY } = {}) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.tail = 0;
    this._size = 0;
  }

  write(item) {
    if (this._size === this.capacity) {
      this.head = (this.head + 1) % this.capacity;
    } else {
      this._size++;
    }
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
  }

  read() {
    if (this._size === 0) return undefined;
    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this._size--;
    return item;
  }

  toArray() {
    const result = [];
    for (let i = 0; i < this._size; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity]);
    }
    return result;
  }

  get size() {
    return this._size;
  }

  get isFull() {
    return this._size === this.capacity;
  }

  get isEmpty() {
    return this._size === 0;
  }
}

module.exports = { RingBuffer };
