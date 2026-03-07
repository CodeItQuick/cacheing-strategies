const { SlidingWindowBuffer } = require('../../src/buffer/slidingWindowBuffer');

describe('SlidingWindowBuffer', () => {
  describe('add', () => {
    test('adds an item to the window', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 4 });

      buffer.add('a');

      expect(buffer.size).toBe(1);
    });

    test('accumulates multiple items up to capacity', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 4 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');
      buffer.add('d');

      expect(buffer.size).toBe(4);
    });

    test('drops the oldest item when capacity is reached', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 3 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');
      buffer.add('d');

      expect(buffer.getWindow()).toEqual(['b', 'c', 'd']);
    });

    test('drops multiple oldest items as more items are added beyond capacity', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 3 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');
      buffer.add('d');
      buffer.add('e');
      buffer.add('f');

      expect(buffer.getWindow()).toEqual(['d', 'e', 'f']);
    });

    test('does not exceed capacity after many adds', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 3 });

      for (let i = 0; i < 10; i++) buffer.add(i);

      expect(buffer.size).toBe(3);
    });
  });

  describe('getWindow', () => {
    test('returns an empty array when nothing has been added', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 4 });

      expect(buffer.getWindow()).toEqual([]);
    });

    test('returns items in insertion order with the oldest first', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 4 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');

      expect(buffer.getWindow()).toEqual(['a', 'b', 'c']);
    });

    test('returns only the most recent items when over capacity', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 3 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');
      buffer.add('d');

      expect(buffer.getWindow()).toEqual(['b', 'c', 'd']);
    });

    test('does not modify the buffer state', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 4 });

      buffer.add('a');
      buffer.add('b');
      buffer.getWindow();

      expect(buffer.size).toBe(2);
      expect(buffer.getWindow()).toEqual(['a', 'b']);
    });

    test('returns a snapshot — mutations to the returned array do not affect the buffer', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 4 });

      buffer.add('a');
      buffer.add('b');

      const snapshot = buffer.getWindow();
      snapshot.push('injected');

      expect(buffer.getWindow()).toEqual(['a', 'b']);
    });
  });

  describe('size', () => {
    test('is 0 initially', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 4 });

      expect(buffer.size).toBe(0);
    });

    test('reflects the current number of items', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 4 });

      buffer.add('a');
      buffer.add('b');

      expect(buffer.size).toBe(2);
    });

    test('does not exceed capacity', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 3 });

      for (let i = 0; i < 10; i++) buffer.add(i);

      expect(buffer.size).toBe(3);
    });
  });

  describe('isFull', () => {
    test('is false initially', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 4 });

      expect(buffer.isFull).toBe(false);
    });

    test('is false when partially filled', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 4 });

      buffer.add('a');
      buffer.add('b');

      expect(buffer.isFull).toBe(false);
    });

    test('is true when at capacity', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 3 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');

      expect(buffer.isFull).toBe(true);
    });

    test('remains true after adding beyond capacity', () => {
      const buffer = new SlidingWindowBuffer({ capacity: 3 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');
      buffer.add('d');

      expect(buffer.isFull).toBe(true);
    });
  });
});
