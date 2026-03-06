const { RefreshAheadCache } = require('../../src/cache/refreshAheadCache');
const { fib } = require('../../src/fibonacci');

function makeCache(mockFn, { ttlMs = 1000, refreshThreshold = 0.75, now = () => Date.now() } = {}) {
  return new RefreshAheadCache(mockFn, { ttlMs, refreshThreshold, now });
}

describe('RefreshAheadCache', () => {
  test('returns the correct value on a cache miss', async () => {
    const cache = makeCache(fib);

    const result = await cache.get(10);

    expect(result).toBe(55);
  });

  test('first call is slow (cache miss)', async () => {
    const cache = makeCache(fib);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  test('second call is fast (cache hit)', async () => {
    const cache = makeCache(fib);
    await cache.get(10);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('returns cached value immediately when near expiry rather than waiting', async () => {
    let time = 0;
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = makeCache(mockFib, { ttlMs: 1000, refreshThreshold: 0.75, now: () => time });

    await cache.get(10);     // miss — fetches and stores
    time = 750;              // 75% of TTL elapsed — within refresh threshold

    const start = Date.now();
    const result = await cache.get(10);  // returns stale value immediately
    const elapsed = Date.now() - start;

    expect(result).toBe(55);
    expect(elapsed).toBeLessThan(10);  // did not wait for background refresh
  });

  test('triggers a background refresh when near expiry', async () => {
    let time = 0;
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = makeCache(mockFib, { ttlMs: 1000, refreshThreshold: 0.75, now: () => time });

    await cache.get(10);  // miss
    time = 750;           // within refresh threshold

    await cache.get(10);  // hit — triggers background refresh

    await new Promise(resolve => setTimeout(resolve, 50)); // let background refresh complete

    expect(mockFib).toHaveBeenCalledTimes(2);
  });

  test('does not trigger a background refresh before the threshold', async () => {
    let time = 0;
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = makeCache(mockFib, { ttlMs: 1000, refreshThreshold: 0.75, now: () => time });

    await cache.get(10);  // miss
    time = 749;           // just under threshold

    await cache.get(10);  // hit — no background refresh

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockFib).toHaveBeenCalledTimes(1);
  });

  test('only triggers one background refresh at a time per key', async () => {
    let time = 0;
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = makeCache(mockFib, { ttlMs: 1000, refreshThreshold: 0.75, now: () => time });

    await cache.get(10);  // miss
    time = 750;           // within refresh threshold

    await cache.get(10);  // triggers background refresh
    await cache.get(10);  // refresh already in flight — does not trigger another
    await cache.get(10);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockFib).toHaveBeenCalledTimes(2); // 1 miss + 1 background refresh
  });

  test('re-fetches synchronously when entry is fully expired', async () => {
    let time = 0;
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = makeCache(mockFib, { ttlMs: 1000, refreshThreshold: 0.75, now: () => time });

    await cache.get(10);  // miss
    time = 1000;          // fully expired

    await cache.get(10);  // miss again — synchronous re-fetch

    expect(mockFib).toHaveBeenCalledTimes(2);
  });

  test('background refresh updates the cache with the new value', async () => {
    let time = 0;
    const mockFib = jest.fn()
      .mockResolvedValueOnce(55)
      .mockResolvedValueOnce(99);
    const cache = makeCache(mockFib, { ttlMs: 1000, refreshThreshold: 0.75, now: () => time });

    await cache.get(10);  // miss — stores 55
    time = 750;

    await cache.get(10);  // returns 55, triggers background refresh → stores 99

    await new Promise(resolve => setTimeout(resolve, 50));

    time = 0; // reset time so entry is not expired
    const result = await cache.get(10);
    expect(result).toBe(99);
  });

  test('caches different keys independently', async () => {
    const cache = makeCache(fib);

    const a = await cache.get(5);
    const b = await cache.get(10);

    expect(a).toBe(5);
    expect(b).toBe(55);
  });
});
