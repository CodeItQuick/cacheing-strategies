const { LruCache } = require('../../src/cache/lruCache');
const { fib } = require('../../src/fibonacci');

describe('LruCache', () => {
  test('returns the correct value on a cache miss', async () => {
    const cache = new LruCache(fib);

    const result = await cache.get(10);

    expect(result).toBe(55);
  });

  test('first call is slow (cache miss)', async () => {
    const cache = new LruCache(fib);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  test('second call is fast (cache hit)', async () => {
    const cache = new LruCache(fib);
    await cache.get(10);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('only calls fetch function once for repeated keys', async () => {
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = new LruCache(mockFib);

    await cache.get(10);
    await cache.get(10);
    await cache.get(10);

    expect(mockFib).toHaveBeenCalledTimes(1);
  });

  test('evicts the least recently used entry when at capacity', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new LruCache(mockFib, { capacity: 3 });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);
    // cache: [1, 2, 3]

    await cache.get(2); // promote 2 — LRU is now 1
    await cache.get(4); // evicts 1 (LRU), cache: [2, 3, 4]

    expect(mockFib).toHaveBeenCalledTimes(4);

    await cache.get(1); // 1 was evicted, must re-fetch
    expect(mockFib).toHaveBeenCalledTimes(5);

    await cache.get(2); // 2 still in cache
    expect(mockFib).toHaveBeenCalledTimes(5);
  });

  test('accessing an entry promotes it and protects it from eviction', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new LruCache(mockFib, { capacity: 3 });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);
    await cache.get(1); // promote 1 — now 2 is LRU
    await cache.get(4); // evicts 2

    expect(mockFib).toHaveBeenCalledTimes(4);

    await cache.get(2); // 2 was evicted, must re-fetch
    expect(mockFib).toHaveBeenCalledTimes(5);

    await cache.get(1); // 1 still in cache
    expect(mockFib).toHaveBeenCalledTimes(5);
  });

  test('does not exceed capacity', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new LruCache(mockFib, { capacity: 3 });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);
    await cache.get(4);
    await cache.get(5);

    expect(cache.cache.size).toBe(3);
  });

  test('caches different keys independently', async () => {
    const cache = new LruCache(fib, { capacity: 5 });

    const a = await cache.get(5);
    const b = await cache.get(10);

    expect(a).toBe(5);
    expect(b).toBe(55);
  });
});
