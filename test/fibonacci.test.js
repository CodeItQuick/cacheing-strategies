const { fib } = require('../src/fibonacci');

describe('fib', () => {
  test('fib(0) returns 0', async () => {
    expect(await fib(0)).toBe(0);
  });

  test('fib(1) returns 1', async () => {
    expect(await fib(1)).toBe(1);
  });

  test('fib(2) returns 1', async () => {
    expect(await fib(2)).toBe(1);
  });

  test('fib(5) returns 5', async () => {
    expect(await fib(5)).toBe(5);
  });

  test('fib(10) returns 55', async () => {
    expect(await fib(10)).toBe(55);
  });

  test('fib(20) returns 6765', async () => {
    expect(await fib(20)).toBe(6765);
  });

  test('each call takes at least 100ms (simulated delay)', async () => {
    const start = Date.now();
    await fib(10);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});
