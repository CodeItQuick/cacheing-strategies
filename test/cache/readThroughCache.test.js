const { ReadThroughCache } = require('../../src/cache/readThroughCache');
const { fib } = require('../../src/fibonacci');

function makeFibStore() {
  return { get: jest.fn(fib) };
}

describe('ReadThroughCache', () => {
  test('returns the correct value on a cache miss', async () => {
    const cache = new ReadThroughCache(makeFibStore());

    const result = await cache.get(10);

    expect(result).toBe(55);
  });

  test('first call is slow (cache miss)', async () => {
    const cache = new ReadThroughCache(makeFibStore());

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(100);
  });

  test('second call is fast (cache hit)', async () => {
    const cache = new ReadThroughCache(makeFibStore());
    await cache.get(10);

    const start = Date.now();
    await cache.get(10);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  test('only calls the backing store once for repeated keys', async () => {
    const store = makeFibStore();
    const cache = new ReadThroughCache(store);

    await cache.get(10);
    await cache.get(10);
    await cache.get(10);

    expect(store.get).toHaveBeenCalledTimes(1);
  });

  test('caller never interacts with the backing store directly', async () => {
    const store = makeFibStore();
    const cache = new ReadThroughCache(store);

    // caller only calls cache.get — store is completely hidden
    const result = await cache.get(10);

    expect(result).toBe(55);
    expect(store.get).toHaveBeenCalledTimes(1);
  });

  test('populates the cache after fetching from the backing store', async () => {
    const cache = new ReadThroughCache(makeFibStore());

    await cache.get(10);

    expect(cache.cache.has(10)).toBe(true);
    expect(cache.cache.get(10)).toBe(55);
  });

  test('fetches each unique key from the backing store exactly once', async () => {
    const store = makeFibStore();
    const cache = new ReadThroughCache(store);

    await cache.get(5);
    await cache.get(10);
    await cache.get(5);
    await cache.get(10);

    expect(store.get).toHaveBeenCalledTimes(2);
    expect(store.get).toHaveBeenCalledWith(5);
    expect(store.get).toHaveBeenCalledWith(10);
  });

  test('caches different keys independently', async () => {
    const cache = new ReadThroughCache(makeFibStore());

    const a = await cache.get(5);
    const b = await cache.get(10);

    expect(a).toBe(5);
    expect(b).toBe(55);
  });
});
