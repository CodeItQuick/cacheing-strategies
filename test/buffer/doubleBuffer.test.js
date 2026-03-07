const { DoubleBuffer } = require('../../src/buffer/doubleBuffer');

describe('DoubleBuffer', () => {
  describe('write', () => {
    test('adds an item to the back buffer', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');

      expect(buffer.writeSize).toBe(1);
    });

    test('does not affect the front buffer', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.write('b');

      expect(buffer.readSize).toBe(0);
    });

    test('accumulates multiple items in the back buffer', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');

      expect(buffer.writeSize).toBe(3);
    });
  });

  describe('swap', () => {
    test('moves back buffer items to the front buffer', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.swap();

      expect(buffer.readSize).toBe(2);
    });

    test('clears the back buffer', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.swap();

      expect(buffer.writeSize).toBe(0);
    });

    test('swapping an empty back buffer clears the front buffer', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.swap();
      buffer.swap();

      expect(buffer.readSize).toBe(0);
    });

    test('items written after a swap go to the new back buffer, not the front', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.swap();
      buffer.write('b');

      expect(buffer.writeSize).toBe(1);
      expect(buffer.readSize).toBe(1);
    });
  });

  describe('drain', () => {
    test('returns an empty array when the front buffer is empty', () => {
      const buffer = new DoubleBuffer();

      expect(buffer.drain()).toEqual([]);
    });

    test('returns all items from the front buffer', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');
      buffer.swap();

      expect(buffer.drain()).toEqual(['a', 'b', 'c']);
    });

    test('returns items in insertion order', () => {
      const buffer = new DoubleBuffer();

      buffer.write('x');
      buffer.write('y');
      buffer.write('z');
      buffer.swap();

      const items = buffer.drain();

      expect(items[0]).toBe('x');
      expect(items[1]).toBe('y');
      expect(items[2]).toBe('z');
    });

    test('clears the front buffer after draining', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.swap();
      buffer.drain();

      expect(buffer.readSize).toBe(0);
    });

    test('does not affect the back buffer', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.swap();
      buffer.write('b');
      buffer.drain();

      expect(buffer.writeSize).toBe(1);
    });
  });

  describe('write/swap/drain cycle', () => {
    test('producer can write while consumer drains independently', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.swap();

      buffer.write('c');
      buffer.write('d');

      const consumed = buffer.drain();

      expect(consumed).toEqual(['a', 'b']);
      expect(buffer.writeSize).toBe(2);
    });

    test('second swap makes the next batch available for draining', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.swap();
      buffer.drain();

      buffer.write('c');
      buffer.write('d');
      buffer.swap();

      expect(buffer.drain()).toEqual(['c', 'd']);
    });

    test('each drain returns only the batch from the preceding swap', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.swap();
      const first = buffer.drain();

      buffer.write('b');
      buffer.write('c');
      buffer.swap();
      const second = buffer.drain();

      expect(first).toEqual(['a']);
      expect(second).toEqual(['b', 'c']);
    });
  });

  describe('writeSize', () => {
    test('is 0 initially', () => {
      const buffer = new DoubleBuffer();

      expect(buffer.writeSize).toBe(0);
    });

    test('reflects the number of items in the back buffer', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.write('b');

      expect(buffer.writeSize).toBe(2);
    });

    test('is 0 after a swap', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.swap();

      expect(buffer.writeSize).toBe(0);
    });
  });

  describe('readSize', () => {
    test('is 0 initially', () => {
      const buffer = new DoubleBuffer();

      expect(buffer.readSize).toBe(0);
    });

    test('reflects the number of items in the front buffer after a swap', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.swap();

      expect(buffer.readSize).toBe(2);
    });

    test('is 0 after draining', () => {
      const buffer = new DoubleBuffer();

      buffer.write('a');
      buffer.swap();
      buffer.drain();

      expect(buffer.readSize).toBe(0);
    });
  });
});
