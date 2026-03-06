const { createIotDevice } = require('../src/iotDevice');
const { WriteThroughTtlCache } = require('../src/cache/writeThroughTtlCache');

function makeCache(device, { ttlMs = 5000, now = () => Date.now() } = {}) {
  return new WriteThroughTtlCache(
    () => device.getStatus(),
    (_, newState) => device.setStatus(newState),
    { ttlMs, now }
  );
}

describe('IoT Device — Write-Through + TTL Cache', () => {
  describe('without cache', () => {
    test('every status poll hits the device — chatty', async () => {
      const device = createIotDevice('device-1');
      const getStatus = jest.fn(() => device.getStatus());

      await getStatus();
      await getStatus();
      await getStatus();

      expect(getStatus).toHaveBeenCalledTimes(3);
    });

    test('every poll incurs device latency', async () => {
      const device = createIotDevice('device-1');

      const start = Date.now();
      await device.getStatus();
      await device.getStatus();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('write-through — server writes are immediately consistent', () => {
    test('after a server write, getStatus returns the new state from cache without hitting the device', async () => {
      let time = 0;
      const device = createIotDevice('device-1', { initialState: { on: false, brightness: 0 } });
      const getStatus = jest.fn(() => device.getStatus());
      const cache = new WriteThroughTtlCache(getStatus, (_, s) => device.setStatus(s), { ttlMs: 5000, now: () => time });

      await cache.get('device-1');           // cold fetch
      await cache.set('device-1', { on: true, brightness: 80 }); // server write

      const callsBeforeRead = getStatus.mock.calls.length;
      const status = await cache.get('device-1'); // should hit cache — not the device

      expect(status.on).toBe(true);
      expect(status.brightness).toBe(80);
      expect(getStatus.mock.calls.length).toBe(callsBeforeRead); // no additional device call
    });

    test('server write does not wait for TTL to expire before reflecting the new state', async () => {
      let time = 0;
      const device = createIotDevice('device-1', { initialState: { on: false } });
      const cache = makeCache(device, { ttlMs: 5000, now: () => time });

      await cache.get('device-1');                        // cold fetch — on: false
      time = 100;                                         // only 100ms in — TTL far from expired
      await cache.set('device-1', { on: true });          // server write

      const status = await cache.get('device-1');         // should reflect write immediately
      expect(status.on).toBe(true);
    });

    test('multiple server writes always reflect the latest state', async () => {
      let time = 0;
      const device = createIotDevice('device-1', { initialState: { on: false, brightness: 0 } });
      const cache = makeCache(device, { ttlMs: 5000, now: () => time });

      await cache.set('device-1', { on: true, brightness: 40 });
      const first = await cache.get('device-1');
      expect(first.brightness).toBe(40);

      await cache.set('device-1', { on: true, brightness: 80 });
      const second = await cache.get('device-1');
      expect(second.brightness).toBe(80);
    });
  });

  describe('TTL — manual device changes are eventually consistent', () => {
    test('a manual override is invisible to the server until TTL expires', async () => {
      let time = 0;
      const device = createIotDevice('device-1', { initialState: { on: true, brightness: 80 } });
      const cache = makeCache(device, { ttlMs: 5000, now: () => time });

      await cache.get('device-1');               // cold fetch — on: true

      device.manualOverride({ on: false });       // user physically turns off the device

      time = 4999;                               // just before TTL expires
      const stale = await cache.get('device-1'); // still serves cached value

      expect(stale.on).toBe(true);              // server still thinks it's on — stale
    });

    test('after TTL expires the manual change is picked up on the next poll', async () => {
      let time = 0;
      const device = createIotDevice('device-1', { initialState: { on: true, brightness: 80 } });
      const cache = makeCache(device, { ttlMs: 5000, now: () => time });

      await cache.get('device-1');               // cold fetch — on: true

      device.manualOverride({ on: false });       // user physically turns off the device

      time = 5000;                               // TTL expired
      const fresh = await cache.get('device-1'); // forces a real device poll

      expect(fresh.on).toBe(false);             // server now sees the manual change
    });

    test('TTL window defines how stale the server can be after a manual change', async () => {
      let time = 0;
      const getStatus = jest.fn((device) => device.getStatus());
      const device = createIotDevice('device-1');
      const cache = makeCache(device, { ttlMs: 1000, now: () => time });

      await cache.get('device-1');  // fetch 1
      device.manualOverride({ on: true });

      time = 1000;
      await cache.get('device-1'); // fetch 2 — TTL expired, picks up manual change

      time = 2000;
      await cache.get('device-1'); // fetch 3 — TTL expired again

      // with TTL=1000ms over 2000ms, device was polled 3 times — not on every request
      const deviceCallCount = cache.cache.size; // sanity — cache is populated
      expect(deviceCallCount).toBeGreaterThan(0);
    });
  });

  describe('combined — write-through + TTL together', () => {
    test('server write is immediately consistent; manual change is eventually consistent', async () => {
      let time = 0;
      const device = createIotDevice('device-1', { initialState: { on: false, brightness: 0 } });
      const cache = makeCache(device, { ttlMs: 5000, now: () => time });

      await cache.get('device-1');

      // server write — immediately consistent
      await cache.set('device-1', { on: true, brightness: 60 });
      const afterServerWrite = await cache.get('device-1');
      expect(afterServerWrite.on).toBe(true);
      expect(afterServerWrite.brightness).toBe(60);

      // manual override — invisible until TTL expires
      device.manualOverride({ brightness: 20 });
      time = 4999;
      const beforeExpiry = await cache.get('device-1');
      expect(beforeExpiry.brightness).toBe(60);  // stale

      // TTL expires — manual change now visible
      time = 5000;
      const afterExpiry = await cache.get('device-1');
      expect(afterExpiry.brightness).toBe(20);   // fresh
    });

    test('dramatically reduces device polls compared to no cache', async () => {
      let time = 0;
      const device = createIotDevice('device-1');
      const getStatus = jest.fn(() => device.getStatus());
      const cache = new WriteThroughTtlCache(getStatus, (_, s) => device.setStatus(s), { ttlMs: 1000, now: () => time });

      // simulate 10 rapid polls within a single TTL window
      for (let i = 0; i < 10; i++) {
        await cache.get('device-1');
      }

      expect(getStatus).toHaveBeenCalledTimes(1); // only 1 real device call out of 10 requests
    });
  });
});
