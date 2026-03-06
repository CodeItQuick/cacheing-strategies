const { FifoCache } = require('../../src/cache/fifoCache');
const { fib } = require('../../src/fibonacci');

describe('FifoCache', () => {
  test('returns the correct value on a cache miss', async () => {
    const cache = new FifoCache(fib);

    const result = await cache.get(10);

    expect(result).toBe(55);
  });

  test('first call is slow (cache miss)', async () => {
    const cache = new FifoCache(fib);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  test('second call is fast (cache hit)', async () => {
    const cache = new FifoCache(fib);
    await cache.get(10);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('only calls fetch function once for repeated keys', async () => {
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = new FifoCache(mockFib);

    await cache.get(10);
    await cache.get(10);
    await cache.get(10);

    expect(mockFib).toHaveBeenCalledTimes(1);
  });

  test('evicts the oldest entry when at capacity', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new FifoCache(mockFib, { capacity: 3 });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);
    // cache: [1, 2, 3] — 1 is oldest

    await cache.get(4); // evicts 1 (oldest), cache: [2, 3, 4]
    expect(mockFib).toHaveBeenCalledTimes(4);

    await cache.get(2); // 2 still in cache
    await cache.get(3); // 3 still in cache
    expect(mockFib).toHaveBeenCalledTimes(4);

    await cache.get(1); // 1 was evicted, must re-fetch
    expect(mockFib).toHaveBeenCalledTimes(5);
  });

  test('evicts by insertion order regardless of access frequency', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new FifoCache(mockFib, { capacity: 3 });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);

    await cache.get(1); // access 1 repeatedly — does NOT protect it from eviction
    await cache.get(1);
    await cache.get(1);

    await cache.get(4); // evicts 1 anyway — it was inserted first
    expect(mockFib).toHaveBeenCalledTimes(4);

    await cache.get(1); // 1 was evicted despite frequent use
    expect(mockFib).toHaveBeenCalledTimes(5);
  });

  test('does not exceed capacity', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new FifoCache(mockFib, { capacity: 3 });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);
    await cache.get(4);
    await cache.get(5);

    expect(cache.cache.size).toBe(3);
  });

  test('caches different keys independently', async () => {
    const cache = new FifoCache(fib, { capacity: 5 });

    const a = await cache.get(5);
    const b = await cache.get(10);

    expect(a).toBe(5);
    expect(b).toBe(55);
  });
});
