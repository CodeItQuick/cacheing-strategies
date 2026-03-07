const { LogWriter } = require('../src/logWriter');
const { TimeBasedFlushBuffer } = require('../src/buffer/timeBasedFlushBuffer');

function makeWriter(bufferSize = 5, logFlushIntervalMs = 60000, writeIntervalMs = 60000) {
  const written = [];
  const writeBuffer = new TimeBasedFlushBuffer(
    (items) => items.forEach((item) => written.push(item)),
    { intervalMs: writeIntervalMs },
  );
  const logWriter = new LogWriter('app.log', {
    bufferSize,
    flushIntervalMs: logFlushIntervalMs,
    writer: (filePath, data) => writeBuffer.add({ filePath, data }),
  });
  return { logWriter, writeBuffer, written };
}

describe('LogWriter (time-based flush)', () => {
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
      writeBuffer.close();
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
      writeBuffer.close();
    });

    test('written array is empty until the write buffer flushes', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      for (let i = 0; i < 5; i++) logWriter.log(`msg${i}`);

      expect(written.length).toBe(0);
      logWriter.close();
      writeBuffer.close();
    });

    test('write buffer accumulates multiple log flushes before its own timer fires', () => {
      const { logWriter, writeBuffer } = makeWriter();

      for (let i = 0; i < 10; i++) logWriter.log(`msg${i}`);

      expect(writeBuffer.size).toBe(2);
      logWriter.close();
      writeBuffer.close();
    });
  });

  describe('write buffer flush', () => {
    test('does nothing when the write buffer is empty', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      writeBuffer.flush();

      expect(written.length).toBe(0);
      logWriter.close();
      writeBuffer.close();
    });

    test('surfaces all writes pending in the write buffer', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      for (let i = 0; i < 5; i++) logWriter.log(`msg${i}`);
      writeBuffer.flush();

      expect(written.length).toBe(1);
      logWriter.close();
      writeBuffer.close();
    });

    test('surfaces the correct file path', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      logWriter.log('hello');
      logWriter.flush();
      writeBuffer.flush();

      expect(written[0].filePath).toBe('app.log');
      logWriter.close();
      writeBuffer.close();
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
      writeBuffer.close();
    });

    test('resets the write buffer after flush', () => {
      const { logWriter, writeBuffer } = makeWriter();

      logWriter.log('a');
      logWriter.flush();
      writeBuffer.flush();

      expect(writeBuffer.size).toBe(0);
      logWriter.close();
      writeBuffer.close();
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
      writeBuffer.close();
    });
  });

  describe('write buffer timer flush', () => {
    test('flushes accumulated writes after the interval', () => {
      jest.useFakeTimers();
      const { logWriter, writeBuffer, written } = makeWriter(5, 60000, 2000);

      for (let i = 0; i < 5; i++) logWriter.log(`msg${i}`);

      expect(written.length).toBe(0);
      jest.advanceTimersByTime(2000);
      expect(written.length).toBe(1);

      logWriter.close();
      writeBuffer.close();
    });

    test('does not flush when the write buffer is empty at the interval', () => {
      jest.useFakeTimers();
      const { logWriter, writeBuffer, written } = makeWriter(5, 60000, 2000);

      jest.advanceTimersByTime(2000);

      expect(written.length).toBe(0);
      logWriter.close();
      writeBuffer.close();
    });

    test('delivers each accumulated log flush as a separate write', () => {
      jest.useFakeTimers();
      const { logWriter, writeBuffer, written } = makeWriter(5, 60000, 2000);

      for (let i = 0; i < 10; i++) logWriter.log(`msg${i}`);
      jest.advanceTimersByTime(2000);

      expect(written.length).toBe(2);
      logWriter.close();
      writeBuffer.close();
    });

    test('flushes again on the next interval after refilling', () => {
      jest.useFakeTimers();
      const { logWriter, writeBuffer, written } = makeWriter(5, 60000, 2000);

      for (let i = 0; i < 5; i++) logWriter.log(`msg${i}`);
      jest.advanceTimersByTime(2000);

      for (let i = 0; i < 5; i++) logWriter.log(`msg${i + 5}`);
      jest.advanceTimersByTime(2000);

      expect(written.length).toBe(2);
      logWriter.close();
      writeBuffer.close();
    });
  });

  describe('close', () => {
    test('flushes remaining writes in the write buffer on close', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      logWriter.log('final');
      logWriter.close();
      writeBuffer.close();

      expect(written.length).toBe(1);
      expect(written[0].data).toBe('final\n');
    });

    test('does not flush when the write buffer is empty on close', () => {
      const { logWriter, writeBuffer, written } = makeWriter();

      logWriter.close();
      writeBuffer.close();

      expect(written.length).toBe(0);
    });

    test('stops the write buffer timer so no further flushes occur after close', () => {
      jest.useFakeTimers();
      const { logWriter, writeBuffer, written } = makeWriter(5, 60000, 2000);

      for (let i = 0; i < 5; i++) logWriter.log(`msg${i}`);
      logWriter.close();
      writeBuffer.close();

      written.length = 0;
      jest.advanceTimersByTime(2000);

      expect(written.length).toBe(0);
    });
  });
});
