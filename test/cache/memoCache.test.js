const { MemoCache } = require('../../src/cache/memoCache');
const { fib } = require('../../src/fibonacci');

describe('MemoCache', () => {
  test('returns the correct value on a cache miss', async () => {
    const cache = new MemoCache(fib);

    const result = await cache.get(10);

    expect(result).toBe(55);
  });

  test('first call is slow (cache miss)', async () => {
    const cache = new MemoCache(fib);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  test('second call is fast (cache hit)', async () => {
    const cache = new MemoCache(fib);
    await cache.get(10);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('cache hit returns the same value as the miss', async () => {
    const cache = new MemoCache(fib);
    const first = await cache.get(10);
    const second = await cache.get(10);

    expect(second).toBe(first);
  });

  test('only calls the fetch function once for repeated keys', async () => {
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = new MemoCache(mockFib);

    await cache.get(10);
    await cache.get(10);
    await cache.get(10);

    expect(mockFib).toHaveBeenCalledTimes(1);
  });

  test('caches different keys independently', async () => {
    const cache = new MemoCache(fib);

    const a = await cache.get(5);
    const b = await cache.get(10);

    expect(a).toBe(5);
    expect(b).toBe(55);
  });

  test('calls fetch function once per unique key', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n * 2));
    const cache = new MemoCache(mockFib);

    await cache.get(1);
    await cache.get(2);
    await cache.get(1);
    await cache.get(2);

    expect(mockFib).toHaveBeenCalledTimes(2);
  });
});
