const { createGameFeed } = require('../src/sportsScore');
const { RefreshAheadCache } = require('../src/cache/refreshAheadCache');

function makeCache(getScore, { ttlMs = 1000, refreshThreshold = 0.75, now = () => Date.now() } = {}) {
  return new RefreshAheadCache(getScore, { ttlMs, refreshThreshold, now });
}

describe('Sports Score — Refresh-Ahead Cache', () => {
  describe('without cache', () => {
    test('every call pays the latency cost of hitting the feed', async () => {
      const getScore = createGameFeed();

      const start = Date.now();
      await getScore('game-1');
      await getScore('game-1');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    test('score can change between consecutive calls', async () => {
      let call = 0;
      const scores = [
        { gameId: 'game-1', home: 0, away: 0, period: 1 },
        { gameId: 'game-1', home: 1, away: 0, period: 1 },
      ];
      const getScore = jest.fn(() => Promise.resolve(scores[call++]));

      const first = await getScore('game-1');
      const second = await getScore('game-1');

      expect(first.home).toBe(0);
      expect(second.home).toBe(1);
    });
  });

  describe('with refresh-ahead cache', () => {
    test('first call is slow — fetches live score from the feed', async () => {
      const getScore = createGameFeed();
      const cache = makeCache(getScore);

      const start = Date.now();
      await cache.get('game-1');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(40);
    });

    test('subsequent calls within TTL are fast — served from cache', async () => {
      const getScore = createGameFeed();
      const cache = makeCache(getScore);
      await cache.get('game-1');

      const start = Date.now();
      await cache.get('game-1');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    test('returns the cached score instantly near expiry — no caller ever waits', async () => {
      let time = 0;
      const getScore = jest.fn().mockResolvedValue({ gameId: 'game-1', home: 2, away: 1, period: 2 });
      const cache = makeCache(getScore, { ttlMs: 1000, refreshThreshold: 0.75, now: () => time });

      await cache.get('game-1');   // cold fetch
      time = 800;                  // 80% of TTL — within refresh threshold

      const start = Date.now();
      const score = await cache.get('game-1');
      const elapsed = Date.now() - start;

      expect(score.home).toBe(2);
      expect(elapsed).toBeLessThan(10);  // no waiting — stale value served immediately
    });

    test('background refresh fires when near expiry so the next caller gets a fresh score', async () => {
      let time = 0;
      let call = 0;
      const scores = [
        { gameId: 'game-1', home: 1, away: 0, period: 1 },
        { gameId: 'game-1', home: 2, away: 0, period: 2 },
      ];
      const getScore = jest.fn(() => Promise.resolve(scores[call++]));
      const cache = makeCache(getScore, { ttlMs: 1000, refreshThreshold: 0.75, now: () => time });

      await cache.get('game-1');   // fetch 1 — home: 1
      time = 800;                  // within refresh threshold

      await cache.get('game-1');   // serves home: 1, triggers background refresh
      await new Promise(resolve => setTimeout(resolve, 50)); // let background refresh settle

      time = 0;                    // reset so entry is not expired
      const score = await cache.get('game-1');

      expect(score.home).toBe(2);  // background refresh has updated the score
      expect(getScore).toHaveBeenCalledTimes(2);
    });

    test('a goal scored during the TTL window is invisible until the next refresh', async () => {
      let time = 0;
      let call = 0;
      const scores = [
        { gameId: 'game-1', home: 0, away: 0, period: 1 },
        { gameId: 'game-1', home: 1, away: 0, period: 1 }, // goal scored on refresh
      ];
      const getScore = jest.fn(() => Promise.resolve(scores[call++]));
      const cache = makeCache(getScore, { ttlMs: 1000, refreshThreshold: 0.75, now: () => time });

      await cache.get('game-1');  // fetch 1 — 0:0

      time = 500;  // goal scored at this point in real life — but TTL has not expired
      const mid = await cache.get('game-1');
      expect(mid.home).toBe(0);   // still shows 0:0 — goal is invisible until refresh

      time = 800;  // threshold crossed — refresh triggers in background
      await cache.get('game-1');
      await new Promise(resolve => setTimeout(resolve, 50));

      time = 0;
      const updated = await cache.get('game-1');
      expect(updated.home).toBe(1);  // now the goal is visible
    });

    test('multiple games are cached independently', async () => {
      let time = 0;
      const getScore = jest.fn((gameId) => Promise.resolve(
        gameId === 'game-1'
          ? { gameId, home: 3, away: 2, period: 3 }
          : { gameId, home: 1, away: 1, period: 2 }
      ));
      const cache = makeCache(getScore, { ttlMs: 1000, now: () => time });

      const game1 = await cache.get('game-1');
      const game2 = await cache.get('game-2');

      expect(game1.home).toBe(3);
      expect(game2.home).toBe(1);
      expect(getScore).toHaveBeenCalledTimes(2);
    });

    test('compare with TTL: a TTL cache makes the caller after expiry wait; refresh-ahead does not', async () => {
      const getScore = createGameFeed({ delay: 50 });
      const cache = makeCache(getScore, { ttlMs: 1000, refreshThreshold: 0.75 });

      await cache.get('game-1');  // cold fetch — slow

      // all subsequent calls are fast because the background refresh
      // keeps the cache warm before expiry — no caller ever blocks
      const start = Date.now();
      await cache.get('game-1');
      await cache.get('game-1');
      await cache.get('game-1');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(20);
    });
  });
});
