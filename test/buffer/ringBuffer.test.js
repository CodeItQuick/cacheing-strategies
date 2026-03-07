const { RingBuffer } = require('../../src/buffer/ringBuffer');

describe('RingBuffer', () => {
  describe('write', () => {
    test('adds an item to the buffer', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');

      expect(buffer.size).toBe(1);
    });

    test('adds multiple items up to capacity', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');
      buffer.write('d');

      expect(buffer.size).toBe(4);
    });

    test('does not exceed capacity when overwriting', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');
      buffer.write('d');
      buffer.write('e');

      expect(buffer.size).toBe(4);
    });

    test('overwrites the oldest item when full', () => {
      const buffer = new RingBuffer({ capacity: 3 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');
      buffer.write('d');

      expect(buffer.toArray()).toEqual(['b', 'c', 'd']);
    });

    test('overwrites correctly across multiple full cycles', () => {
      const buffer = new RingBuffer({ capacity: 3 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');
      buffer.write('d');
      buffer.write('e');
      buffer.write('f');

      expect(buffer.toArray()).toEqual(['d', 'e', 'f']);
    });
  });

  describe('read', () => {
    test('returns undefined when the buffer is empty', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      expect(buffer.read()).toBeUndefined();
    });

    test('returns the oldest item first', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');

      expect(buffer.read()).toBe('a');
    });

    test('returns items in insertion order', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');

      expect(buffer.read()).toBe('a');
      expect(buffer.read()).toBe('b');
      expect(buffer.read()).toBe('c');
    });

    test('removes the item from the buffer', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');
      buffer.write('b');
      buffer.read();

      expect(buffer.size).toBe(1);
    });

    test('returns the surviving items after overwrite has occurred', () => {
      const buffer = new RingBuffer({ capacity: 3 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');
      buffer.write('d');

      expect(buffer.read()).toBe('b');
      expect(buffer.read()).toBe('c');
      expect(buffer.read()).toBe('d');
    });

    test('interleaved writes and reads maintain correct order', () => {
      const buffer = new RingBuffer({ capacity: 3 });

      buffer.write('a');
      buffer.write('b');
      buffer.read();
      buffer.write('c');
      buffer.write('d');

      expect(buffer.read()).toBe('b');
      expect(buffer.read()).toBe('c');
      expect(buffer.read()).toBe('d');
    });
  });

  describe('toArray', () => {
    test('returns an empty array when the buffer is empty', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      expect(buffer.toArray()).toEqual([]);
    });

    test('returns items in insertion order', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');

      expect(buffer.toArray()).toEqual(['a', 'b', 'c']);
    });

    test('reflects only the surviving window after overwriting', () => {
      const buffer = new RingBuffer({ capacity: 3 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');
      buffer.write('d');

      expect(buffer.toArray()).toEqual(['b', 'c', 'd']);
    });

    test('does not modify the buffer state', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');
      buffer.write('b');
      buffer.toArray();

      expect(buffer.size).toBe(2);
      expect(buffer.read()).toBe('a');
    });
  });

  describe('isFull', () => {
    test('is false when the buffer is empty', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      expect(buffer.isFull).toBe(false);
    });

    test('is false when the buffer is partially filled', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');
      buffer.write('b');

      expect(buffer.isFull).toBe(false);
    });

    test('is true when the buffer reaches capacity', () => {
      const buffer = new RingBuffer({ capacity: 3 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');

      expect(buffer.isFull).toBe(true);
    });

    test('remains true after overwriting', () => {
      const buffer = new RingBuffer({ capacity: 3 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');
      buffer.write('d');

      expect(buffer.isFull).toBe(true);
    });

    test('is false after reading an item from a full buffer', () => {
      const buffer = new RingBuffer({ capacity: 3 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');
      buffer.read();

      expect(buffer.isFull).toBe(false);
    });
  });

  describe('isEmpty', () => {
    test('is true when the buffer is empty', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      expect(buffer.isEmpty).toBe(true);
    });

    test('is false when the buffer has items', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');

      expect(buffer.isEmpty).toBe(false);
    });

    test('is true after all items have been read', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');
      buffer.write('b');
      buffer.read();
      buffer.read();

      expect(buffer.isEmpty).toBe(true);
    });
  });

  describe('size', () => {
    test('is 0 when the buffer is empty', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      expect(buffer.size).toBe(0);
    });

    test('reflects the number of items written', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');
      buffer.write('b');

      expect(buffer.size).toBe(2);
    });

    test('does not exceed capacity when overwriting', () => {
      const buffer = new RingBuffer({ capacity: 3 });

      for (let i = 0; i < 10; i++) buffer.write(i);

      expect(buffer.size).toBe(3);
    });

    test('decreases by one after each read', () => {
      const buffer = new RingBuffer({ capacity: 4 });

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');
      buffer.read();

      expect(buffer.size).toBe(2);
    });
  });
});
