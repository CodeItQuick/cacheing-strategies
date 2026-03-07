const { NetworkFlowMonitor } = require('../src/networkFlowMonitor');

describe('NetworkFlowMonitor', () => {
  describe('tick', () => {
    test('adds a bucket to the window', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 5 });

      monitor.tick(10);

      expect(monitor.getWindow()).toEqual([10]);
    });

    test('defaults to 0 packets when no count is given', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 5 });

      monitor.tick();

      expect(monitor.getWindow()).toEqual([0]);
    });

    test('advances the window with each call', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 5 });

      monitor.tick(10);
      monitor.tick(20);
      monitor.tick(30);

      expect(monitor.getWindow()).toEqual([10, 20, 30]);
    });

    test('drops the oldest bucket when the window is full', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 3 });

      monitor.tick(10);
      monitor.tick(20);
      monitor.tick(30);
      monitor.tick(40);

      expect(monitor.getWindow()).toEqual([20, 30, 40]);
    });
  });

  describe('total', () => {
    test('returns 0 when no ticks have been recorded', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 5 });

      expect(monitor.total()).toBe(0);
    });

    test('returns the sum of all packet counts in the window', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 5 });

      monitor.tick(10);
      monitor.tick(20);
      monitor.tick(30);

      expect(monitor.total()).toBe(60);
    });

    test('excludes packets from buckets that have slid out of the window', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 3 });

      monitor.tick(100);
      monitor.tick(10);
      monitor.tick(20);
      monitor.tick(30);

      expect(monitor.total()).toBe(60);
    });

    test('returns 0 for a window filled entirely with zero-packet ticks', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 3 });

      monitor.tick(0);
      monitor.tick(0);
      monitor.tick(0);

      expect(monitor.total()).toBe(0);
    });
  });

  describe('getWindow', () => {
    test('returns an empty array before any ticks', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 5 });

      expect(monitor.getWindow()).toEqual([]);
    });

    test('returns each tick\'s packet count in chronological order', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 5 });

      monitor.tick(5);
      monitor.tick(15);
      monitor.tick(25);

      expect(monitor.getWindow()).toEqual([5, 15, 25]);
    });

    test('returns only the most recent windowSeconds buckets when full', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 3 });

      monitor.tick(1);
      monitor.tick(2);
      monitor.tick(3);
      monitor.tick(4);
      monitor.tick(5);

      expect(monitor.getWindow()).toEqual([3, 4, 5]);
    });

    test('returns a snapshot — mutations do not affect the monitor', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 5 });

      monitor.tick(10);
      const snapshot = monitor.getWindow();
      snapshot.push(999);

      expect(monitor.getWindow()).toEqual([10]);
    });
  });

  describe('sliding window', () => {
    test('total reflects only the packets within the current window', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 5 });

      for (let i = 0; i < 5; i++) monitor.tick(10);
      expect(monitor.total()).toBe(50);

      monitor.tick(0);
      expect(monitor.total()).toBe(40);

      monitor.tick(0);
      expect(monitor.total()).toBe(30);
    });

    test('high-traffic seconds slide out and no longer affect the total', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 3 });

      monitor.tick(1000);
      monitor.tick(1);
      monitor.tick(2);
      monitor.tick(3);

      expect(monitor.total()).toBe(6);
    });

    test('window size is maintained as old buckets are replaced', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 3 });

      for (let i = 0; i < 10; i++) monitor.tick(i);

      expect(monitor.getWindow().length).toBe(3);
    });

    test('window always contains the N most recent ticks', () => {
      const monitor = new NetworkFlowMonitor({ windowSeconds: 3 });

      for (let i = 1; i <= 6; i++) monitor.tick(i * 10);

      expect(monitor.getWindow()).toEqual([40, 50, 60]);
    });
  });
});
