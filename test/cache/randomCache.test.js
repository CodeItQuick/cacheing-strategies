const { RandomCache } = require('../../src/cache/randomCache');
const { fib } = require('../../src/fibonacci');

describe('RandomCache', () => {
  test('returns the correct value on a cache miss', async () => {
    const cache = new RandomCache(fib);

    const result = await cache.get(10);

    expect(result).toBe(55);
  });

  test('first call is slow (cache miss)', async () => {
    const cache = new RandomCache(fib);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(90);
  });

  test('second call is fast (cache hit)', async () => {
    const cache = new RandomCache(fib);
    await cache.get(10);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('only calls fetch function once for repeated keys', async () => {
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = new RandomCache(mockFib);

    await cache.get(10);
    await cache.get(10);
    await cache.get(10);

    expect(mockFib).toHaveBeenCalledTimes(1);
  });

  test('does not exceed capacity', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new RandomCache(mockFib, { capacity: 3 });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);
    await cache.get(4);
    await cache.get(5);

    expect(cache.cache.size).toBe(3);
  });

  test('evicts one entry when at capacity', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const cache = new RandomCache(mockFib, { capacity: 3 });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);
    await cache.get(4); // triggers eviction

    expect(cache.cache.size).toBe(3);
    expect(cache.cache.has(4)).toBe(true); // new entry is always stored
  });

  test('evicts the entry at the index chosen by the random function', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const alwaysFirst = () => 0; // always picks index 0
    const cache = new RandomCache(mockFib, { capacity: 3, random: alwaysFirst });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);
    // cache: [1, 2, 3] — index 0 is key 1

    await cache.get(4); // evicts key at index 0 (key 1)

    expect(cache.cache.has(1)).toBe(false);
    expect(cache.cache.has(2)).toBe(true);
    expect(cache.cache.has(3)).toBe(true);
    expect(cache.cache.has(4)).toBe(true);
  });

  test('evicts a different entry when random picks a different index', async () => {
    const mockFib = jest.fn((n) => Promise.resolve(n));
    const alwaysLast = () => 0.99; // always picks last index
    const cache = new RandomCache(mockFib, { capacity: 3, random: alwaysLast });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);
    // cache: [1, 2, 3] — last index is key 3

    await cache.get(4); // evicts key at last index (key 3)

    expect(cache.cache.has(3)).toBe(false);
    expect(cache.cache.has(1)).toBe(true);
    expect(cache.cache.has(2)).toBe(true);
    expect(cache.cache.has(4)).toBe(true);
  });

  test('caches different keys independently', async () => {
    const cache = new RandomCache(fib, { capacity: 5 });

    const a = await cache.get(5);
    const b = await cache.get(10);

    expect(a).toBe(5);
    expect(b).toBe(55);
  });
});
