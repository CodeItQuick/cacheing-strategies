const { createWifiDevice } = require('../src/wifiDevice');
const { EventDrivenCache } = require('../src/cache/eventDrivenCache');

function makeDeviceAndCache({ delay = 50 } = {}) {
  const device = createWifiDevice('device-1', { initialState: { on: false, brightness: 0 }, delay });
  const cache = new EventDrivenCache(() => device.getStatus());
  device.onPush((state) => cache.onPush(state.deviceId, state));
  device.onDisconnect(() => cache.clear());
  return { device, cache };
}

describe('WiFi IoT Device — Event-Driven Cache', () => {
  describe('without cache', () => {
    test('mobile opening the app always polls the device directly', async () => {
      const device = createWifiDevice('device-1');
      const getStatus = jest.fn(() => device.getStatus());

      await getStatus();
      await getStatus();
      await getStatus();

      expect(getStatus).toHaveBeenCalledTimes(3);
    });

    test('every app open incurs device latency', async () => {
      const device = createWifiDevice('device-1');

      const start = Date.now();
      await device.getStatus();
      await device.getStatus();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('wifi connected — push events keep cache warm', () => {
    test('mobile open is instant once the cache is warm from a push event', async () => {
      const { device, cache } = makeDeviceAndCache();

      device.manualOverride({ on: true }); // push fires — warms cache

      const start = Date.now();
      const status = await cache.get('device-1');
      const elapsed = Date.now() - start;

      expect(status.on).toBe(true);
      expect(elapsed).toBeLessThan(10);
    });

    test('manual change is immediately reflected in cache via push', async () => {
      const { device, cache } = makeDeviceAndCache();
      await cache.get('device-1'); // cold fetch

      device.manualOverride({ on: true, brightness: 90 });

      const status = await cache.get('device-1');
      expect(status.on).toBe(true);
      expect(status.brightness).toBe(90);
    });

    test('phone command is immediately reflected in cache via push', async () => {
      const { device, cache } = makeDeviceAndCache();
      await cache.get('device-1'); // cold fetch

      await device.setStatus({ on: true, brightness: 70 });

      const status = await cache.get('device-1');
      expect(status.on).toBe(true);
      expect(status.brightness).toBe(70);
    });

    test('mobile never polls the device directly while wifi pushes are arriving', async () => {
      const fallback = jest.fn();
      const device = createWifiDevice('device-1', { initialState: { on: false } });
      const cache = new EventDrivenCache(fallback);
      device.onPush((state) => cache.onPush(state.deviceId, state));

      device.manualOverride({ on: true }); // warms cache via push

      await cache.get('device-1');
      await cache.get('device-1');
      await cache.get('device-1');

      expect(fallback).not.toHaveBeenCalled();
    });
  });

  describe('wifi disconnected — cache is off, every request hits the device', () => {
    test('disconnecting clears the cache', async () => {
      const { device, cache } = makeDeviceAndCache();

      device.manualOverride({ on: true }); // warm cache
      expect(cache.cache.size).toBe(1);

      device.disconnectWifi();
      expect(cache.cache.size).toBe(0);
    });

    test('every status request incurs full device latency after disconnect', async () => {
      const { device, cache } = makeDeviceAndCache();

      device.manualOverride({ on: true }); // warm cache
      device.disconnectWifi();             // clears cache

      const start = Date.now();
      await cache.get('device-1');
      await cache.get('device-1');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    test('each request polls the device directly when cache is off', async () => {
      const device = createWifiDevice('device-1', { initialState: { on: true } });
      const fallback = jest.fn(() => device.getStatus());
      const cache = new EventDrivenCache(fallback);
      device.onPush((state) => cache.onPush(state.deviceId, state));
      device.onDisconnect(() => cache.clear());

      device.manualOverride({ on: true }); // warm cache
      device.disconnectWifi();             // clears cache

      await cache.get('device-1');
      await cache.get('device-1');
      await cache.get('device-1');

      expect(fallback).toHaveBeenCalledTimes(3);
    });
  });

  describe('wifi reconnects — cache warms up again', () => {
    test('reconnecting immediately pushes current state back into cache', async () => {
      const { device, cache } = makeDeviceAndCache();

      device.manualOverride({ on: true });  // warm cache
      device.disconnectWifi();              // clears cache
      device.manualOverride({ on: false }); // change while disconnected — not pushed

      device.reconnectWifi();               // broadcasts current state

      const status = await cache.get('device-1');
      expect(status.on).toBe(false);
    });

    test('mobile reads are instant again after reconnect', async () => {
      const { device, cache } = makeDeviceAndCache();

      device.disconnectWifi();
      device.reconnectWifi(); // push fires — cache warm

      const start = Date.now();
      await cache.get('device-1');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    test('device is not polled directly after reconnect warms the cache', async () => {
      const device = createWifiDevice('device-1', { initialState: { on: true } });
      const fallback = jest.fn();
      const cache = new EventDrivenCache(fallback);
      device.onPush((state) => cache.onPush(state.deviceId, state));
      device.onDisconnect(() => cache.clear());

      device.disconnectWifi();
      device.reconnectWifi(); // push fires — cache warm

      await cache.get('device-1');
      await cache.get('device-1');

      expect(fallback).not.toHaveBeenCalled();
    });
  });
});
