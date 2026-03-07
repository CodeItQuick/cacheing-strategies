const { LogWriter } = require('../src/logWriter');
const { ThresholdFlushBuffer } = require('../src/buffer/thresholdFlushBuffer');

function makeWriter(bufferSize = 5, flushIntervalMs = 60000, writeCapacity = 4, writeThreshold = 0.75) {
  const written = [];
  const writeBuffer = new ThresholdFlushBuffer(
    (items) => items.forEach((item) => written.push(item)),
    { capacity: writeCapacity, threshold: writeThreshold },
  );
  const logWriter = new LogWriter('app.log', {
    bufferSize,
    flushIntervalMs,
    writer: (filePath, data) => writeBuffer.add({ filePath, data }),
  });
  return { logWriter, writeBuffer, written };
}

describe('LogWriter (threshold flush)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('buffering', () => {
    test('does not deliver to the write buffer before the log buffer is full', () => {
      const { logWriter, writeBuffer } = makeWriter();

      logWriter.log('a');
      logWriter.log('b');
      logWriter.log('c');
      logWriter.log('d');

      expect(writeBuffer.size).toBe(0);
      logWriter.close();
    });

    test('delivers to the write buffer when the log buffer reaches capacity', () => {
      const { logWriter, writeBuffer } = makeWriter();

      logWriter.log('a');
      logWriter.log('b');
      logWriter.log('c');
      logWriter.log('d');
      logWriter.log('e');

      expect(writeBuffer.size).toBe(1);
      logWriter.close();
    });

    test('written array is empty while the write buffer is below its threshold', () => {
      const { logWriter, written } = makeWriter();

      // two LogWriter flushes (10 messages) — writeBuffer threshold is 3, so no auto-flush yet
      for (let i = 0; i < 10; i++) logWriter.log(`msg${i}`);

      expect(written.length).toBe(0);
      logWriter.close();
    });

    test('write buffer accumulates multiple log flushes below the threshold', () => {
      const { logWriter, writeBuffer } = makeWriter();

      // two LogWriter flushes land in writeBuffer without triggering its threshold
      for (let i = 0; i < 10; i++) logWriter.log(`msg${i}`);

      expect(writeBuffer.size).toBe(2);
      logWriter.close();
    });
  });

  describe('write buffer flush', () => {
    test('does nothing when the write buffer is empty', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      writeBuffer.flush();

      expect(written.length).toBe(0);
      logWriter.close();
    });

    test('surfaces all writes pending in the write buffer', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      for (let i = 0; i < 5; i++) logWriter.log(`msg${i}`);
      writeBuffer.flush();

      expect(written.length).toBe(1);
      logWriter.close();
    });

    test('surfaces the correct file path', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      logWriter.log('hello');
      logWriter.flush();
      writeBuffer.flush();

      expect(written[0].filePath).toBe('app.log');
      logWriter.close();
    });

    test('surfaces messages formatted as newline-separated lines', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      logWriter.log('x');
      logWriter.log('y');
      logWriter.log('z');
      logWriter.flush();
      writeBuffer.flush();

      expect(written[0].data).toBe('x\ny\nz\n');
      logWriter.close();
    });

    test('resets the write buffer after flush', () => {
      const { logWriter, writeBuffer } = makeWriter();

      logWriter.log('a');
      logWriter.flush();
      writeBuffer.flush();

      expect(writeBuffer.size).toBe(0);
      logWriter.close();
    });

    test('each flush surfaces only writes accumulated since the last flush', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      for (let i = 0; i < 5; i++) logWriter.log(`msg${i}`);
      writeBuffer.flush();

      for (let i = 0; i < 5; i++) logWriter.log(`msg${i + 5}`);
      writeBuffer.flush();

      expect(written.length).toBe(2);
      expect(written[0].data).toBe('msg0\nmsg1\nmsg2\nmsg3\nmsg4\n');
      expect(written[1].data).toBe('msg5\nmsg6\nmsg7\nmsg8\nmsg9\n');
      logWriter.close();
    });
  });

  describe('write buffer threshold flush', () => {
    test('auto-flushes when the write buffer reaches the threshold', () => {
      const { logWriter, written } = makeWriter();

      // three LogWriter flushes fill the writeBuffer to its threshold (3 of 4 slots)
      for (let i = 0; i < 15; i++) logWriter.log(`msg${i}`);

      expect(written.length).toBe(3);
      logWriter.close();
    });

    test('flushes before the write buffer is completely full', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      // threshold is 75% — flush fires at 3 items, leaving the 4th slot unused
      for (let i = 0; i < 15; i++) logWriter.log(`msg${i}`);

      expect(written.length).toBe(3);
      expect(writeBuffer.size).toBe(0);
      logWriter.close();
    });

    test('does not auto-flush when the write buffer is below the threshold', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      // two LogWriter flushes — one short of the threshold of 3
      for (let i = 0; i < 10; i++) logWriter.log(`msg${i}`);

      expect(written.length).toBe(0);
      expect(writeBuffer.size).toBe(2);
      logWriter.close();
    });

    test('resets the write buffer after a threshold flush', () => {
      const { logWriter, writeBuffer } = makeWriter();

      for (let i = 0; i < 15; i++) logWriter.log(`msg${i}`);

      expect(writeBuffer.size).toBe(0);
      logWriter.close();
    });

    test('flushes multiple times as the write buffer fills and refills', () => {
      const { logWriter, written } = makeWriter();

      // six LogWriter flushes → two writeBuffer threshold flushes of 3 writes each
      for (let i = 0; i < 30; i++) logWriter.log(`msg${i}`);

      expect(written.length).toBe(6);
      logWriter.close();
    });
  });

  describe('timer flush', () => {
    test('log writer timer flush lands in the write buffer', () => {
      jest.useFakeTimers();
      const { logWriter, writeBuffer, written } = makeWriter(5, 2000);

      logWriter.log('a');
      logWriter.log('b');

      jest.advanceTimersByTime(2000);

      expect(writeBuffer.size).toBe(1);
      expect(written.length).toBe(0);

      writeBuffer.flush();
      expect(written[0].data).toBe('a\nb\n');

      logWriter.close();
    });

    test('does not flush when the log buffer is empty at the interval', () => {
      jest.useFakeTimers();
      const { logWriter, writeBuffer } = makeWriter(5, 2000);

      jest.advanceTimersByTime(2000);

      expect(writeBuffer.size).toBe(0);
      logWriter.close();
    });
  });

  describe('close', () => {
    test('flushes remaining writes in the write buffer on close', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      logWriter.log('final');
      logWriter.close();
      writeBuffer.flush();

      expect(written.length).toBe(1);
      expect(written[0].data).toBe('final\n');
    });

    test('does not flush when both buffers are empty on close', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      logWriter.close();
      writeBuffer.flush();

      expect(written.length).toBe(0);
    });
  });
});
