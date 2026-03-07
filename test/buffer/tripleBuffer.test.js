const { TripleBuffer } = require('../../src/buffer/tripleBuffer');

describe('TripleBuffer', () => {
  describe('write', () => {
    test('adds an item to the write buffer', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');

      expect(buffer.writeSize).toBe(1);
    });

    test('does not affect the ready buffer', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');

      expect(buffer.readySize).toBe(0);
    });

    test('accumulates multiple items in the write buffer', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');

      expect(buffer.writeSize).toBe(3);
    });
  });

  describe('present', () => {
    test('moves write buffer contents to the ready buffer', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.present();

      expect(buffer.readySize).toBe(2);
    });

    test('clears the write buffer after presenting', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.present();

      expect(buffer.writeSize).toBe(0);
    });

    test('overwrites the ready buffer when called a second time before consume', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.present();

      buffer.write('c');
      buffer.present();

      expect(buffer.readySize).toBe(1);
    });

    test('presenting with an empty write buffer clears the ready buffer', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.present();
      buffer.present();

      expect(buffer.readySize).toBe(0);
    });
  });

  describe('consume', () => {
    test('returns an empty array when nothing has been presented', () => {
      const buffer = new TripleBuffer();

      expect(buffer.consume()).toEqual([]);
    });

    test('returns all items from the ready buffer', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.write('c');
      buffer.present();

      expect(buffer.consume()).toEqual(['a', 'b', 'c']);
    });

    test('returns items in insertion order', () => {
      const buffer = new TripleBuffer();

      buffer.write('x');
      buffer.write('y');
      buffer.write('z');
      buffer.present();

      const items = buffer.consume();

      expect(items[0]).toBe('x');
      expect(items[1]).toBe('y');
      expect(items[2]).toBe('z');
    });

    test('clears the ready buffer after consuming', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.present();
      buffer.consume();

      expect(buffer.readySize).toBe(0);
    });

    test('does not affect the write buffer', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.present();
      buffer.write('b');
      buffer.consume();

      expect(buffer.writeSize).toBe(1);
    });

    test('returns an empty array on a second consecutive consume with no new present', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.present();
      buffer.consume();

      expect(buffer.consume()).toEqual([]);
    });
  });

  describe('non-blocking producer', () => {
    test('consumer gets the most recently presented frame when the producer presents multiple times', () => {
      const buffer = new TripleBuffer();

      buffer.write('frame1');
      buffer.present();
      buffer.write('frame2');
      buffer.present();

      expect(buffer.consume()).toEqual(['frame2']);
    });

    test('frames presented before the consumer reads are silently overwritten', () => {
      const buffer = new TripleBuffer();

      buffer.write('stale');
      buffer.present();
      buffer.write('latest');
      buffer.present();

      const items = buffer.consume();

      expect(items).not.toContain('stale');
      expect(items).toContain('latest');
    });

    test('producer can write to the write buffer while the display buffer holds the previous frame', () => {
      const buffer = new TripleBuffer();

      buffer.write('frame1');
      buffer.present();
      buffer.consume();

      buffer.write('frame2');
      buffer.present();

      expect(buffer.displaySize).toBe(1);
      expect(buffer.readySize).toBe(1);
    });
  });

  describe('write/present/consume cycle', () => {
    test('each consume returns only the frame from the most recent present', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.present();
      const first = buffer.consume();

      buffer.write('b');
      buffer.write('c');
      buffer.present();
      const second = buffer.consume();

      expect(first).toEqual(['a']);
      expect(second).toEqual(['b', 'c']);
    });

    test('producer can continue writing immediately after present without waiting for consume', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.present();
      buffer.write('b');

      expect(buffer.writeSize).toBe(1);
      expect(buffer.readySize).toBe(1);
    });
  });

  describe('writeSize', () => {
    test('is 0 initially', () => {
      const buffer = new TripleBuffer();

      expect(buffer.writeSize).toBe(0);
    });

    test('reflects the number of items in the write buffer', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.write('b');

      expect(buffer.writeSize).toBe(2);
    });

    test('is 0 after present', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.present();

      expect(buffer.writeSize).toBe(0);
    });
  });

  describe('readySize', () => {
    test('is 0 initially', () => {
      const buffer = new TripleBuffer();

      expect(buffer.readySize).toBe(0);
    });

    test('reflects the number of items after present', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.present();

      expect(buffer.readySize).toBe(2);
    });

    test('is 0 after consume', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.present();
      buffer.consume();

      expect(buffer.readySize).toBe(0);
    });
  });

  describe('displaySize', () => {
    test('is 0 initially', () => {
      const buffer = new TripleBuffer();

      expect(buffer.displaySize).toBe(0);
    });

    test('reflects the items being displayed after consume', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.write('b');
      buffer.present();
      buffer.consume();

      expect(buffer.displaySize).toBe(2);
    });

    test('is 0 after a second consume with no new present', () => {
      const buffer = new TripleBuffer();

      buffer.write('a');
      buffer.present();
      buffer.consume();
      buffer.consume();

      expect(buffer.displaySize).toBe(0);
    });
  });
});
