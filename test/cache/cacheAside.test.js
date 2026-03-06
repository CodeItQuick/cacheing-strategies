const { CacheAside } = require('../../src/cache/cacheAside');
const { fib } = require('../../src/fibonacci');

async function getFromCacheOrFetch(cache, key, fetchFn) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const value = await fetchFn(key);
  cache.set(key, value);
  return value;
}

describe('CacheAside', () => {
  describe('cache store', () => {
    test('returns undefined for a key that has not been set', () => {
      const cache = new CacheAside();

      expect(cache.get(10)).toBeUndefined();
    });

    test('returns the value after it has been set', () => {
      const cache = new CacheAside();

      cache.set(10, 55);

      expect(cache.get(10)).toBe(55);
    });

    test('has() returns false for a missing key', () => {
      const cache = new CacheAside();

      expect(cache.has(10)).toBe(false);
    });

    test('has() returns true for a stored key', () => {
      const cache = new CacheAside();

      cache.set(10, 55);

      expect(cache.has(10)).toBe(true);
    });
  });

  describe('cache-aside pattern', () => {
    test('fetches and stores on a cache miss', async () => {
      const cache = new CacheAside();
      const mockFib = jest.fn().mockResolvedValue(55);

      await getFromCacheOrFetch(cache, 10, mockFib);

      expect(mockFib).toHaveBeenCalledTimes(1);
      expect(cache.get(10)).toBe(55);
    });

    test('first call is slow (cache miss)', async () => {
      const cache = new CacheAside();

      const start = Date.now();
      await getFromCacheOrFetch(cache, 10, fib);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    test('second call is fast (cache hit)', async () => {
      const cache = new CacheAside();
      await getFromCacheOrFetch(cache, 10, fib);

      const start = Date.now();
      await getFromCacheOrFetch(cache, 10, fib);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    test('does not call fetch on a cache hit', async () => {
      const cache = new CacheAside();
      const mockFib = jest.fn().mockResolvedValue(55);

      await getFromCacheOrFetch(cache, 10, mockFib);
      await getFromCacheOrFetch(cache, 10, mockFib);
      await getFromCacheOrFetch(cache, 10, mockFib);

      expect(mockFib).toHaveBeenCalledTimes(1);
    });

    test('caller can choose not to cache the result', async () => {
      const cache = new CacheAside();
      const mockFib = jest.fn().mockResolvedValue(55);

      if (!cache.has(10)) {
        await mockFib(10); // fetched but deliberately not stored
      }

      expect(cache.has(10)).toBe(false);
      expect(mockFib).toHaveBeenCalledTimes(1);
    });

    test('caller can conditionally store based on the result', async () => {
      const cache = new CacheAside();
      const mockFib = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(55);

      // first call returns null — caller skips caching
      if (!cache.has(10)) {
        const value = await mockFib(10);
        if (value !== null) cache.set(10, value);
      }
      expect(cache.has(10)).toBe(false);

      // second call returns a valid value — caller stores it
      if (!cache.has(10)) {
        const value = await mockFib(10);
        if (value !== null) cache.set(10, value);
      }
      expect(cache.has(10)).toBe(true);
      expect(cache.get(10)).toBe(55);
    });

    test('caches different keys independently', async () => {
      const cache = new CacheAside();

      const a = await getFromCacheOrFetch(cache, 5, fib);
      const b = await getFromCacheOrFetch(cache, 10, fib);

      expect(a).toBe(5);
      expect(b).toBe(55);
    });
  });
});
