const { WriteThroughCache } = require('../../src/cache/writeThroughCache');
const { fib } = require('../../src/fibonacci');

function makeBackingStore() {
  const store = new Map();
  return {
    set: jest.fn((key, value) => store.set(key, value)),
    get: (key) => store.get(key),
    has: (key) => store.has(key),
  };
}

describe('WriteThroughCache', () => {
  test('returns the correct value on a cache miss', async () => {
    const cache = new WriteThroughCache(fib, makeBackingStore());

    const result = await cache.get(10);

    expect(result).toBe(55);
  });

  test('first call is slow (cache miss)', async () => {
    const cache = new WriteThroughCache(fib, makeBackingStore());

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  test('second call is fast (cache hit)', async () => {
    const cache = new WriteThroughCache(fib, makeBackingStore());
    await cache.get(10);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('only calls fetch function once for repeated keys', async () => {
    const mockFib = jest.fn().mockResolvedValue(55);
    const cache = new WriteThroughCache(mockFib, makeBackingStore());

    await cache.get(10);
    await cache.get(10);
    await cache.get(10);

    expect(mockFib).toHaveBeenCalledTimes(1);
  });

  test('writes to the backing store on a cache miss', async () => {
    const backingStore = makeBackingStore();
    const cache = new WriteThroughCache(fib, backingStore);

    await cache.get(10);

    expect(backingStore.set).toHaveBeenCalledWith(10, 55);
  });

  test('writes to cache and backing store simultaneously on a miss', async () => {
    const backingStore = makeBackingStore();
    const cache = new WriteThroughCache(fib, backingStore);

    await cache.get(10);

    expect(cache.cache.has(10)).toBe(true);
    expect(backingStore.has(10)).toBe(true);
    expect(cache.cache.get(10)).toBe(backingStore.get(10));
  });

  test('does not write to the backing store on a cache hit', async () => {
    const backingStore = makeBackingStore();
    const cache = new WriteThroughCache(fib, backingStore);

    await cache.get(10);
    await cache.get(10);
    await cache.get(10);

    expect(backingStore.set).toHaveBeenCalledTimes(1);
  });

  test('writes each unique key through to the backing store once', async () => {
    const backingStore = makeBackingStore();
    const cache = new WriteThroughCache(fib, backingStore);

    await cache.get(5);
    await cache.get(10);
    await cache.get(5);
    await cache.get(10);

    expect(backingStore.set).toHaveBeenCalledTimes(2);
    expect(backingStore.get(5)).toBe(5);
    expect(backingStore.get(10)).toBe(55);
  });

  test('caches different keys independently', async () => {
    const cache = new WriteThroughCache(fib, makeBackingStore());

    const a = await cache.get(5);
    const b = await cache.get(10);

    expect(a).toBe(5);
    expect(b).toBe(55);
  });
});
