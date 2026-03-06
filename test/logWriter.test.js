const { LogWriter } = require('../src/logWriter');

function makeWriter(bufferSize = 5, flushIntervalMs = 60000) {
  const written = [];
  const mockWriter = (filePath, data) => written.push({ filePath, data });
  const logWriter = new LogWriter('app.log', { bufferSize, flushIntervalMs, writer: mockWriter });
  return { logWriter, written };
}

describe('LogWriter', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('buffering', () => {
    test('does not write before buffer is full', () => {
      const { logWriter, written } = makeWriter();

      logWriter.log('a');
      logWriter.log('b');
      logWriter.log('c');
      logWriter.log('d');

      expect(written.length).toBe(0);
      logWriter.close();
    });

    test('flushes when buffer reaches capacity', () => {
      const { logWriter, written } = makeWriter();

      logWriter.log('a');
      logWriter.log('b');
      logWriter.log('c');
      logWriter.log('d');
      logWriter.log('e');

      expect(written.length).toBe(1);
      expect(written[0].data).toBe('a\nb\nc\nd\ne\n');
      logWriter.close();
    });

    test('resets buffer after flush', () => {
      const { logWriter, written } = makeWriter();

      for (let i = 0; i < 5; i++) logWriter.log(`msg${i}`);
      for (let i = 0; i < 4; i++) logWriter.log(`msg${i + 5}`);

      expect(written.length).toBe(1);
      expect(logWriter.buffer.length).toBe(4);
      logWriter.close();
    });

    test('flushes multiple times as buffer fills repeatedly', () => {
      const { logWriter, written } = makeWriter();

      for (let i = 0; i < 10; i++) logWriter.log(`msg${i}`);

      expect(written.length).toBe(2);
      logWriter.close();
    });
  });

  describe('flush', () => {
    test('does nothing when buffer is empty', () => {
      const { logWriter, written } = makeWriter();

      logWriter.flush();

      expect(written.length).toBe(0);
      logWriter.close();
    });

    test('writes buffered messages to the correct file path', () => {
      const { logWriter, written } = makeWriter();

      logWriter.log('hello');
      logWriter.flush();

      expect(written[0].filePath).toBe('app.log');
      logWriter.close();
    });

    test('writes all buffered messages as newline-separated lines', () => {
      const { logWriter, written } = makeWriter();

      logWriter.log('x');
      logWriter.log('y');
      logWriter.log('z');
      logWriter.flush();

      expect(written[0].data).toBe('x\ny\nz\n');
      logWriter.close();
    });
  });

  describe('timer flush', () => {
    test('flushes automatically after interval', () => {
      jest.useFakeTimers();
      const { logWriter, written } = makeWriter(5, 2000);

      logWriter.log('a');
      logWriter.log('b');

      expect(written.length).toBe(0);
      jest.advanceTimersByTime(2000);
      expect(written.length).toBe(1);
      expect(written[0].data).toBe('a\nb\n');

      logWriter.close();
    });

    test('does not flush on timer when buffer is empty', () => {
      jest.useFakeTimers();
      const { logWriter, written } = makeWriter(5, 2000);

      jest.advanceTimersByTime(2000);

      expect(written.length).toBe(0);
      logWriter.close();
    });
  });

  describe('close', () => {
    test('flushes remaining messages on close', () => {
      const { logWriter, written } = makeWriter();

      logWriter.log('final');
      logWriter.close();

      expect(written.length).toBe(1);
      expect(written[0].data).toBe('final\n');
    });

    test('stops the timer on close', () => {
      jest.useFakeTimers();
      const { logWriter, written } = makeWriter(5, 2000);

      logWriter.log('a');
      logWriter.close();

      written.length = 0;
      jest.advanceTimersByTime(2000);

      expect(written.length).toBe(0);
    });
  });
});
