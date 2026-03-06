const { LfuCache } = require('../../src/cache/lfuCache');
const { fib } = require('../../src/fibonacci');

describe('LfuCache', () => {
  test('returns the correct value on a cache miss', async () => {
    const cache = new LfuCache(fib);

    const result = await cache.get(10);

    expect(result).toBe(55);
  });

  test('first call is slow (cache miss)', async () => {
    const cache = new LfuCache(fib);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  test('second call is fast (cache hit)', async () => {
    const cache = new LfuCache(fib);
    await cache.get(10);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('only calls fetch function once for repeated keys', async () => {
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = new LfuCache(mockFib);

    await cache.get(10);
    await cache.get(10);
    await cache.get(10);

    expect(mockFib).toHaveBeenCalledTimes(1);
  });

  test('evicts the least frequently used entry when at capacity', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new LfuCache(mockFib, { capacity: 3 });

    await cache.get(1); // freq: 1:1, 2:1, 3:1
    await cache.get(2);
    await cache.get(3);
    await cache.get(1); // freq: 1:2, 2:1, 3:1
    await cache.get(1); // freq: 1:3, 2:1, 3:1
    await cache.get(2); // freq: 1:3, 2:2, 3:1 — 3 is LFU

    await cache.get(4); // evicts 3 (freq=1)
    expect(mockFib).toHaveBeenCalledTimes(4);

    await cache.get(3); // 3 was evicted, must re-fetch
    expect(mockFib).toHaveBeenCalledTimes(5);

    await cache.get(1); // 1 still in cache
    await cache.get(2); // 2 still in cache
    expect(mockFib).toHaveBeenCalledTimes(5);
  });

  test('uses LRU as a tiebreaker among entries with equal frequency', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new LfuCache(mockFib, { capacity: 3 });

    await cache.get(1); // all freq=1, insertion order: 1, 2, 3
    await cache.get(2);
    await cache.get(3);

    await cache.get(4); // evicts 1 (LRU tiebreaker among freq=1), cache: {2, 3, 4}
    expect(mockFib).toHaveBeenCalledTimes(4);

    await cache.get(2); // 2 still in cache
    await cache.get(3); // 3 still in cache
    expect(mockFib).toHaveBeenCalledTimes(4);

    await cache.get(1); // 1 was evicted, must re-fetch
    expect(mockFib).toHaveBeenCalledTimes(5);
  });

  test('increments frequency on each cache hit', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new LfuCache(mockFib, { capacity: 3 });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);

    await cache.get(1); // freq 1 → 2
    await cache.get(1); // freq 2 → 3
    await cache.get(2); // freq 1 → 2 — LFU is now 3 (freq=1)

    await cache.get(4); // evicts 3
    expect(mockFib).toHaveBeenCalledTimes(4);

    await cache.get(3); // 3 was evicted
    expect(mockFib).toHaveBeenCalledTimes(5);

    await cache.get(1); // 1 still in cache
    await cache.get(2); // 2 still in cache
    expect(mockFib).toHaveBeenCalledTimes(5);
  });

  test('does not exceed capacity', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new LfuCache(mockFib, { capacity: 3 });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);
    await cache.get(4);
    await cache.get(5);

    expect(cache.keyMap.size).toBe(3);
  });

  test('caches different keys independently', async () => {
    const cache = new LfuCache(fib, { capacity: 5 });

    const a = await cache.get(5);
    const b = await cache.get(10);

    expect(a).toBe(5);
    expect(b).toBe(55);
  });
});
