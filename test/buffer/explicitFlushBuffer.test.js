const { ExplicitFlushBuffer } = require('../../src/buffer/explicitFlushBuffer');

describe('ExplicitFlushBuffer', () => {
  describe('add', () => {
    test('never flushes when items are added', () => {
      const flushFn = jest.fn();
      const buffer = new ExplicitFlushBuffer(flushFn);

      for (let i = 0; i < 100; i++) buffer.add(i);

      expect(flushFn).not.toHaveBeenCalled();
    });

    test('accumulates items in the buffer', () => {
      const buffer = new ExplicitFlushBuffer(jest.fn());

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');

      expect(buffer.size).toBe(3);
    });
  });

  describe('flush', () => {
    test('does nothing when the buffer is empty', () => {
      const flushFn = jest.fn();
      const buffer = new ExplicitFlushBuffer(flushFn);

      buffer.flush();

      expect(flushFn).not.toHaveBeenCalled();
    });

    test('flushes all buffered items', () => {
      const flushed = [];
      const buffer = new ExplicitFlushBuffer((items) => flushed.push(items));

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');
      buffer.flush();

      expect(flushed.length).toBe(1);
    });

    test('passes all buffered items to the flush function', () => {
      const flushed = [];
      const buffer = new ExplicitFlushBuffer((items) => flushed.push(items));

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');
      buffer.flush();

      expect(flushed[0]).toEqual(['a', 'b', 'c']);
    });

    test('resets the buffer after a flush', () => {
      const buffer = new ExplicitFlushBuffer(jest.fn());

      buffer.add('a');
      buffer.flush();

      expect(buffer.size).toBe(0);
    });

    test('calling flush twice only flushes once when the buffer is not refilled', () => {
      const flushFn = jest.fn();
      const buffer = new ExplicitFlushBuffer(flushFn);

      buffer.add('a');
      buffer.flush();
      buffer.flush();

      expect(flushFn).toHaveBeenCalledTimes(1);
    });

    test('flushes multiple times as items are added between flushes', () => {
      const flushed = [];
      const buffer = new ExplicitFlushBuffer((items) => flushed.push(items));

      buffer.add('a');
      buffer.flush();

      buffer.add('b');
      buffer.flush();

      buffer.add('c');
      buffer.flush();

      expect(flushed.length).toBe(3);
    });

    test('each flush batch contains only items added since the last flush', () => {
      const flushed = [];
      const buffer = new ExplicitFlushBuffer((items) => flushed.push(items));

      buffer.add('a');
      buffer.add('b');
      buffer.flush();

      buffer.add('c');
      buffer.flush();

      expect(flushed[0]).toEqual(['a', 'b']);
      expect(flushed[1]).toEqual(['c']);
    });
  });

  describe('size', () => {
    test('is 0 when the buffer is empty', () => {
      const buffer = new ExplicitFlushBuffer(jest.fn());

      expect(buffer.size).toBe(0);
    });

    test('reflects the number of buffered items', () => {
      const buffer = new ExplicitFlushBuffer(jest.fn());

      buffer.add('a');
      buffer.add('b');

      expect(buffer.size).toBe(2);
    });

    test('is 0 after a flush', () => {
      const buffer = new ExplicitFlushBuffer(jest.fn());

      buffer.add('a');
      buffer.flush();

      expect(buffer.size).toBe(0);
    });
  });
});
