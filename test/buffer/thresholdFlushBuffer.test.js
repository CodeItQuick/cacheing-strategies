const { ThresholdFlushBuffer } = require('../../src/buffer/thresholdFlushBuffer');

describe('ThresholdFlushBuffer', () => {
  describe('add', () => {
    test('does not flush below the threshold', () => {
      const flushFn = jest.fn();
      const buffer = new ThresholdFlushBuffer(flushFn, { capacity: 4, threshold: 0.75 });

      buffer.add('a');
      buffer.add('b');

      expect(flushFn).not.toHaveBeenCalled();
    });

    test('flushes when the threshold is reached', () => {
      const flushed = [];
      const buffer = new ThresholdFlushBuffer((items) => flushed.push(items), { capacity: 4, threshold: 0.75 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');

      expect(flushed.length).toBe(1);
    });

    test('flushes before the buffer is completely full', () => {
      const flushed = [];
      const buffer = new ThresholdFlushBuffer((items) => flushed.push(items), { capacity: 4, threshold: 0.75 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');

      expect(flushed.length).toBe(1);
      expect(buffer.size).toBe(0);
    });

    test('passes all buffered items to the flush function', () => {
      const flushed = [];
      const buffer = new ThresholdFlushBuffer((items) => flushed.push(items), { capacity: 4, threshold: 0.75 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');

      expect(flushed[0]).toEqual(['a', 'b', 'c']);
    });

    test('resets the buffer after a flush', () => {
      const flushed = [];
      const buffer = new ThresholdFlushBuffer((items) => flushed.push(items), { capacity: 4, threshold: 0.75 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');
      buffer.add('d');

      expect(flushed.length).toBe(1);
      expect(buffer.size).toBe(1);
    });

    test('flushes multiple times as the buffer fills repeatedly', () => {
      const flushed = [];
      const buffer = new ThresholdFlushBuffer((items) => flushed.push(items), { capacity: 4, threshold: 0.75 });

      for (let i = 0; i < 9; i++) buffer.add(i);

      expect(flushed.length).toBe(3);
    });

    test('each flush batch contains only its own items', () => {
      const flushed = [];
      const buffer = new ThresholdFlushBuffer((items) => flushed.push(items), { capacity: 4, threshold: 0.75 });

      for (let i = 0; i < 6; i++) buffer.add(i);

      expect(flushed[0]).toEqual([0, 1, 2]);
      expect(flushed[1]).toEqual([3, 4, 5]);
    });

    test('respects a threshold of 0.5', () => {
      const flushed = [];
      const buffer = new ThresholdFlushBuffer((items) => flushed.push(items), { capacity: 4, threshold: 0.5 });

      buffer.add('a');
      buffer.add('b');

      expect(flushed.length).toBe(1);
      expect(flushed[0]).toEqual(['a', 'b']);
    });

    test('respects a threshold of 1.0 (flush only when completely full)', () => {
      const flushed = [];
      const buffer = new ThresholdFlushBuffer((items) => flushed.push(items), { capacity: 4, threshold: 1.0 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');

      expect(flushed.length).toBe(0);

      buffer.add('d');

      expect(flushed.length).toBe(1);
    });
  });

  describe('flush', () => {
    test('does nothing when the buffer is empty', () => {
      const flushFn = jest.fn();
      const buffer = new ThresholdFlushBuffer(flushFn, { capacity: 4, threshold: 0.75 });

      buffer.flush();

      expect(flushFn).not.toHaveBeenCalled();
    });

    test('flushes all buffered items before the threshold is reached', () => {
      const flushed = [];
      const buffer = new ThresholdFlushBuffer((items) => flushed.push(items), { capacity: 4, threshold: 0.75 });

      buffer.add('x');
      buffer.add('y');
      buffer.flush();

      expect(flushed.length).toBe(1);
      expect(flushed[0]).toEqual(['x', 'y']);
    });

    test('resets the buffer after a manual flush', () => {
      const buffer = new ThresholdFlushBuffer(jest.fn(), { capacity: 4, threshold: 0.75 });

      buffer.add('x');
      buffer.flush();

      expect(buffer.size).toBe(0);
    });

    test('calling flush twice only flushes once when the buffer is not refilled', () => {
      const flushFn = jest.fn();
      const buffer = new ThresholdFlushBuffer(flushFn, { capacity: 4, threshold: 0.75 });

      buffer.add('x');
      buffer.flush();
      buffer.flush();

      expect(flushFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('size', () => {
    test('is 0 when the buffer is empty', () => {
      const buffer = new ThresholdFlushBuffer(jest.fn(), { capacity: 4, threshold: 0.75 });

      expect(buffer.size).toBe(0);
    });

    test('reflects the number of buffered items', () => {
      const buffer = new ThresholdFlushBuffer(jest.fn(), { capacity: 4, threshold: 0.75 });

      buffer.add('a');
      buffer.add('b');

      expect(buffer.size).toBe(2);
    });

    test('is 0 after the buffer flushes at the threshold', () => {
      const buffer = new ThresholdFlushBuffer(jest.fn(), { capacity: 4, threshold: 0.75 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');

      expect(buffer.size).toBe(0);
    });

    test('is 0 after a manual flush', () => {
      const buffer = new ThresholdFlushBuffer(jest.fn(), { capacity: 4, threshold: 0.75 });

      buffer.add('a');
      buffer.flush();

      expect(buffer.size).toBe(0);
    });
  });
});
