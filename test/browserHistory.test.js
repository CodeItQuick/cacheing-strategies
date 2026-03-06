const { createPageFetcher } = require('../src/browserHistory');
const { LruCache } = require('../src/cache/lruCache');

function makeCache(fetchPage, { capacity = 3 } = {}) {
  return new LruCache(fetchPage, { capacity });
}

describe('Browser History — LRU Cache', () => {
  describe('without cache', () => {
    test('every page visit pays the full load time', async () => {
      const fetchPage = createPageFetcher();

      const start = Date.now();
      await fetchPage('news.com');
      await fetchPage('news.com');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    test('revisiting a page is just as slow as the first visit', async () => {
      const fetchPage = createPageFetcher();
      await fetchPage('news.com');

      const start = Date.now();
      await fetchPage('news.com');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  describe('with LRU cache', () => {
    test('first visit is slow — page is fetched from the network', async () => {
      const cache = makeCache(createPageFetcher());

      const start = Date.now();
      await cache.get('news.com');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40);
    });

    test('revisiting a cached page is instant', async () => {
      const cache = makeCache(createPageFetcher());
      await cache.get('news.com');

      const start = Date.now();
      await cache.get('news.com');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    test('returns the correct page content', async () => {
      const cache = makeCache(createPageFetcher());

      const page = await cache.get('github.com');

      expect(page.url).toBe('github.com');
      expect(page.title).toBe('GitHub');
    });

    test('evicts the least recently visited page when cache is full', async () => {
      const fetchPage = jest.fn((url) => Promise.resolve({ url }));
      const cache = makeCache(fetchPage, { capacity: 3 });

      await cache.get('news.com');     // cache: [news, github, docs]
      await cache.get('github.com');
      await cache.get('docs.js.org');

      await cache.get('reddit.com');   // evicts news.com (LRU)
      expect(fetchPage).toHaveBeenCalledTimes(4);

      await cache.get('github.com');   // github still cached
      await cache.get('docs.js.org'); // docs still cached
      expect(fetchPage).toHaveBeenCalledTimes(4);

      await cache.get('news.com');     // news.com was evicted — re-fetched
      expect(fetchPage).toHaveBeenCalledTimes(5);
    });

    test('visiting a page promotes it and protects it from eviction', async () => {
      const fetchPage = jest.fn((url) => Promise.resolve({ url }));
      const cache = makeCache(fetchPage, { capacity: 3 });

      await cache.get('news.com');     // cache: [news, github, docs]
      await cache.get('github.com');
      await cache.get('docs.js.org');

      await cache.get('news.com');     // revisit news — promotes it, github is now LRU
      await cache.get('reddit.com');   // evicts github.com (now LRU)
      expect(fetchPage).toHaveBeenCalledTimes(4);

      await cache.get('github.com');   // github was evicted
      expect(fetchPage).toHaveBeenCalledTimes(5);

      await cache.get('news.com');     // news was protected — still cached
      expect(fetchPage).toHaveBeenCalledTimes(5);
    });

    test('simulates a browsing session — recently visited tabs reload instantly', async () => {
      const fetchPage = jest.fn((url) => Promise.resolve({ url }));
      const cache = makeCache(fetchPage, { capacity: 4 });

      // user opens 4 tabs
      await cache.get('news.com');
      await cache.get('github.com');
      await cache.get('docs.js.org');
      await cache.get('youtube.com');

      // user works in github and docs repeatedly
      await cache.get('github.com');
      await cache.get('docs.js.org');
      await cache.get('github.com');

      // opens a new tab — evicts least recently used (news.com)
      await cache.get('reddit.com');
      expect(fetchPage).toHaveBeenCalledTimes(5);

      // going back to active tabs is instant
      await cache.get('github.com');
      await cache.get('docs.js.org');
      await cache.get('youtube.com');
      expect(fetchPage).toHaveBeenCalledTimes(5);

      // going back to news requires a reload
      await cache.get('news.com');
      expect(fetchPage).toHaveBeenCalledTimes(6);
    });

    test('contrast with FIFO — LRU protects frequently revisited pages that FIFO would evict', async () => {
      const fetchPage = jest.fn((url) => Promise.resolve({ url }));
      const cache = makeCache(fetchPage, { capacity: 3 });

      await cache.get('news.com');    // inserted first
      await cache.get('github.com');
      await cache.get('docs.js.org');

      // user keeps revisiting news.com — in LRU this promotes it
      await cache.get('news.com');
      await cache.get('news.com');
      await cache.get('news.com');

      // new page added — FIFO would evict news.com (oldest insert), LRU evicts github.com (least recently used)
      await cache.get('reddit.com');
      expect(fetchPage).toHaveBeenCalledTimes(4);

      await cache.get('news.com');    // LRU kept news — still cached
      expect(fetchPage).toHaveBeenCalledTimes(4);

      await cache.get('github.com');  // github was evicted
      expect(fetchPage).toHaveBeenCalledTimes(5);
    });
  });
});
