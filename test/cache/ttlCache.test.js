const { TtlCache } = require('../../src/cache/ttlCache');
const { fib } = require('../../src/fibonacci');

describe('TtlCache', () => {
  test('returns the correct value on a cache miss', async () => {
    const cache = new TtlCache(fib);

    const result = await cache.get(10);

    expect(result).toBe(55);
  });

  test('first call is slow (cache miss)', async () => {
    const cache = new TtlCache(fib);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  test('second call is fast (cache hit)', async () => {
    const cache = new TtlCache(fib);
    await cache.get(10);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('only calls fetch function once while entry is fresh', async () => {
    let time = 0;
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = new TtlCache(mockFib, { ttlMs: 1000, now: () => time });

    await cache.get(10);
    time = 999;
    await cache.get(10);

    expect(mockFib).toHaveBeenCalledTimes(1);
  });

  test('re-fetches after TTL expires', async () => {
    let time = 0;
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = new TtlCache(mockFib, { ttlMs: 1000, now: () => time });

    await cache.get(10);
    time = 1000;
    await cache.get(10);

    expect(mockFib).toHaveBeenCalledTimes(2);
  });

  test('returns fresh value after TTL expires', async () => {
    let time = 0;
    const mockFib = jest.fn()
      .mockResolvedValueOnce(55)
      .mockResolvedValueOnce(99);
    const cache = new TtlCache(mockFib, { ttlMs: 1000, now: () => time });

    await cache.get(10);
    time = 1000;
    const result = await cache.get(10);

    expect(result).toBe(99);
  });

  test('caches different keys independently', async () => {
    const cache = new TtlCache(fib);

    const a = await cache.get(5);
    const b = await cache.get(10);

    expect(a).toBe(5);
    expect(b).toBe(55);
  });

  test('each key has its own TTL expiry', async () => {
    let time = 0;
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new TtlCache(mockFib, { ttlMs: 1000, now: () => time });

    await cache.get(1);
    time = 500;
    await cache.get(2);
    time = 1000;

    await cache.get(1); // expired
    await cache.get(2); // still fresh

    expect(mockFib).toHaveBeenCalledTimes(3);
  });
});
