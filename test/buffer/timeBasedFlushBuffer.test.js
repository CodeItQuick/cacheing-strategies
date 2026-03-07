const { TimeBasedFlushBuffer } = require('../../src/buffer/timeBasedFlushBuffer');

describe('TimeBasedFlushBuffer', () => {
  describe('add', () => {
    test('does not flush when an item is added', () => {
      const flushFn = jest.fn();
      const buffer = new TimeBasedFlushBuffer(flushFn, { intervalMs: 60000 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');

      expect(flushFn).not.toHaveBeenCalled();
      buffer.close();
    });

    test('accumulates items in the buffer', () => {
      const buffer = new TimeBasedFlushBuffer(jest.fn(), { intervalMs: 60000 });

      buffer.add('a');
      buffer.add('b');
      buffer.add('c');

      expect(buffer.size).toBe(3);
      buffer.close();
    });
  });

  describe('timer flush', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    test('flushes automatically after the interval', () => {
      jest.useFakeTimers();
      const flushed = [];
      const buffer = new TimeBasedFlushBuffer((items) => flushed.push(items), { intervalMs: 2000 });

      buffer.add('a');
      buffer.add('b');

      expect(flushed.length).toBe(0);
      jest.advanceTimersByTime(2000);
      expect(flushed.length).toBe(1);

      buffer.close();
    });

    test('passes all buffered items to the flush function', () => {
      jest.useFakeTimers();
      const flushed = [];
      const buffer = new TimeBasedFlushBuffer((items) => flushed.push(items), { intervalMs: 2000 });

      buffer.add('a');
      buffer.add('b');
      jest.advanceTimersByTime(2000);

      expect(flushed[0]).toEqual(['a', 'b']);

      buffer.close();
    });

    test('resets the buffer after a timer flush', () => {
      jest.useFakeTimers();
      const buffer = new TimeBasedFlushBuffer(jest.fn(), { intervalMs: 2000 });

      buffer.add('a');
      jest.advanceTimersByTime(2000);

      expect(buffer.size).toBe(0);

      buffer.close();
    });

    test('does not flush when the buffer is empty at the interval', () => {
      jest.useFakeTimers();
      const flushFn = jest.fn();
      const buffer = new TimeBasedFlushBuffer(flushFn, { intervalMs: 2000 });

      jest.advanceTimersByTime(2000);

      expect(flushFn).not.toHaveBeenCalled();

      buffer.close();
    });

    test('flushes repeatedly on each interval', () => {
      jest.useFakeTimers();
      const flushed = [];
      const buffer = new TimeBasedFlushBuffer((items) => flushed.push(items), { intervalMs: 2000 });

      buffer.add('a');
      jest.advanceTimersByTime(2000);

      buffer.add('b');
      jest.advanceTimersByTime(2000);

      expect(flushed.length).toBe(2);
      expect(flushed[0]).toEqual(['a']);
      expect(flushed[1]).toEqual(['b']);

      buffer.close();
    });

    test('each flush batch contains only items added since the last flush', () => {
      jest.useFakeTimers();
      const flushed = [];
      const buffer = new TimeBasedFlushBuffer((items) => flushed.push(items), { intervalMs: 2000 });

      buffer.add('a');
      buffer.add('b');
      jest.advanceTimersByTime(2000);

      buffer.add('c');
      jest.advanceTimersByTime(2000);

      expect(flushed[0]).toEqual(['a', 'b']);
      expect(flushed[1]).toEqual(['c']);

      buffer.close();
    });
  });

  describe('flush', () => {
    test('does nothing when the buffer is empty', () => {
      const flushFn = jest.fn();
      const buffer = new TimeBasedFlushBuffer(flushFn, { intervalMs: 60000 });

      buffer.flush();

      expect(flushFn).not.toHaveBeenCalled();
      buffer.close();
    });

    test('flushes all buffered items before the interval fires', () => {
      const flushed = [];
      const buffer = new TimeBasedFlushBuffer((items) => flushed.push(items), { intervalMs: 60000 });

      buffer.add('x');
      buffer.add('y');
      buffer.flush();

      expect(flushed.length).toBe(1);
      expect(flushed[0]).toEqual(['x', 'y']);
      buffer.close();
    });

    test('resets the buffer after a manual flush', () => {
      const buffer = new TimeBasedFlushBuffer(jest.fn(), { intervalMs: 60000 });

      buffer.add('x');
      buffer.flush();

      expect(buffer.size).toBe(0);
      buffer.close();
    });

    test('calling flush twice only flushes once when the buffer is not refilled', () => {
      const flushFn = jest.fn();
      const buffer = new TimeBasedFlushBuffer(flushFn, { intervalMs: 60000 });

      buffer.add('x');
      buffer.flush();
      buffer.flush();

      expect(flushFn).toHaveBeenCalledTimes(1);
      buffer.close();
    });
  });

  describe('close', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    test('flushes remaining items on close', () => {
      const flushed = [];
      const buffer = new TimeBasedFlushBuffer((items) => flushed.push(items), { intervalMs: 60000 });

      buffer.add('final');
      buffer.close();

      expect(flushed.length).toBe(1);
      expect(flushed[0]).toEqual(['final']);
    });

    test('does not flush on close when the buffer is empty', () => {
      const flushFn = jest.fn();
      const buffer = new TimeBasedFlushBuffer(flushFn, { intervalMs: 60000 });

      buffer.close();

      expect(flushFn).not.toHaveBeenCalled();
    });

    test('stops the timer so no further flushes occur after close', () => {
      jest.useFakeTimers();
      const flushFn = jest.fn();
      const buffer = new TimeBasedFlushBuffer(flushFn, { intervalMs: 2000 });

      buffer.add('a');
      buffer.close();

      flushFn.mockClear();
      jest.advanceTimersByTime(2000);

      expect(flushFn).not.toHaveBeenCalled();
    });
  });

  describe('size', () => {
    test('is 0 when the buffer is empty', () => {
      const buffer = new TimeBasedFlushBuffer(jest.fn(), { intervalMs: 60000 });

      expect(buffer.size).toBe(0);
      buffer.close();
    });

    test('reflects the number of buffered items', () => {
      const buffer = new TimeBasedFlushBuffer(jest.fn(), { intervalMs: 60000 });

      buffer.add('a');
      buffer.add('b');

      expect(buffer.size).toBe(2);
      buffer.close();
    });

    test('is 0 after a timer flush', () => {
      jest.useFakeTimers();
      const buffer = new TimeBasedFlushBuffer(jest.fn(), { intervalMs: 2000 });

      buffer.add('a');
      jest.advanceTimersByTime(2000);

      expect(buffer.size).toBe(0);
      buffer.close();
      jest.useRealTimers();
    });

    test('is 0 after a manual flush', () => {
      const buffer = new TimeBasedFlushBuffer(jest.fn(), { intervalMs: 60000 });

      buffer.add('a');
      buffer.flush();

      expect(buffer.size).toBe(0);
      buffer.close();
    });
  });
});
