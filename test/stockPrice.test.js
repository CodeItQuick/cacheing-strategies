const { createStockFeed } = require('../src/stockPrice');
const { TtlCache } = require('../src/cache/ttlCache');

describe('Stock Price — TTL Cache', () => {
  describe('without cache', () => {
    test('consecutive calls return different prices as the stock moves', async () => {
      let callCount = 0;
      const prices = [101.50, 102.30, 99.80];
      const getPrice = createStockFeed({ random: () => { callCount++; return prices[callCount - 1] / 100; } });

      const first = await getPrice('AAPL');
      const second = await getPrice('AAPL');

      expect(first.price).not.toBe(second.price);
    });

    test('each call hits the feed and incurs latency', async () => {
      const getPrice = createStockFeed();

      const start = Date.now();
      await getPrice('AAPL');
      await getPrice('AAPL');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('with TTL cache', () => {
    test('returns the same price on repeated calls within the TTL window', async () => {
      let time = 0;
      let callCount = 0;
      const prices = [101.50, 99.00];
      const getPrice = jest.fn(() => Promise.resolve({ ticker: 'AAPL', price: prices[callCount++] }));
      const cache = new TtlCache(getPrice, { ttlMs: 5000, now: () => time });

      const first = await cache.get('AAPL');
      time = 4999; // still within TTL
      const second = await cache.get('AAPL');

      expect(first.price).toBe(second.price);
      expect(getPrice).toHaveBeenCalledTimes(1);
    });

    test('first call is slow — fetches live price from the feed', async () => {
      const getPrice = createStockFeed();
      const cache = new TtlCache(getPrice, { ttlMs: 5000 });

      const start = Date.now();
      await cache.get('AAPL');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40);
    });

    test('subsequent calls within TTL are fast — served from cache', async () => {
      const getPrice = createStockFeed();
      const cache = new TtlCache(getPrice, { ttlMs: 5000 });
      await cache.get('AAPL');

      const start = Date.now();
      await cache.get('AAPL');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    test('returns a fresh price after TTL expires', async () => {
      let time = 0;
      let callCount = 0;
      const prices = [101.50, 99.00];
      const getPrice = jest.fn(() => Promise.resolve({ ticker: 'AAPL', price: prices[callCount++] }));
      const cache = new TtlCache(getPrice, { ttlMs: 5000, now: () => time });

      const first = await cache.get('AAPL');
      time = 5000; // TTL expired
      const second = await cache.get('AAPL');

      expect(first.price).toBe(101.50);
      expect(second.price).toBe(99.00);
      expect(getPrice).toHaveBeenCalledTimes(2);
    });

    test('each ticker is cached independently', async () => {
      let time = 0;
      const getPrice = jest.fn((ticker) => Promise.resolve({ ticker, price: ticker === 'AAPL' ? 101.50 : 220.00 }));
      const cache = new TtlCache(getPrice, { ttlMs: 5000, now: () => time });

      const aapl = await cache.get('AAPL');
      const msft = await cache.get('MSFT');

      expect(aapl.price).toBe(101.50);
      expect(msft.price).toBe(220.00);
      expect(getPrice).toHaveBeenCalledTimes(2);
    });

    test('a short TTL keeps prices fresher at the cost of more feed calls', async () => {
      let time = 0;
      const getPrice = jest.fn((ticker) => Promise.resolve({ ticker, price: 100 + time }));
      const cache = new TtlCache(getPrice, { ttlMs: 1000, now: () => time });

      await cache.get('AAPL'); // fetch 1
      time = 1000;
      await cache.get('AAPL'); // fetch 2 — expired after 1s
      time = 2000;
      await cache.get('AAPL'); // fetch 3 — expired again

      expect(getPrice).toHaveBeenCalledTimes(3);
    });

    test('a long TTL reduces feed calls at the cost of serving stale prices', async () => {
      let time = 0;
      const getPrice = jest.fn((ticker) => Promise.resolve({ ticker, price: 100 + time }));
      const cache = new TtlCache(getPrice, { ttlMs: 60000, now: () => time });

      await cache.get('AAPL'); // fetch 1
      time = 1000;
      await cache.get('AAPL'); // still fresh
      time = 30000;
      await cache.get('AAPL'); // still fresh — 30s in

      expect(getPrice).toHaveBeenCalledTimes(1);
    });
  });
});
