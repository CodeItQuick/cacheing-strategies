const { SlidingWindowBuffer } = require('./buffer/slidingWindowBuffer');

const DEFAULT_WINDOW_SECONDS = 60;

class NetworkFlowMonitor {
  constructor({ windowSeconds = DEFAULT_WINDOW_SECONDS } = {}) {
    this.buffer = new SlidingWindowBuffer({ capacity: windowSeconds });
  }

  tick(packetCount = 0) {
    this.buffer.add(packetCount);
  }

  total() {
    return this.buffer.getWindow().reduce((sum, count) => sum + count, 0);
  }

  getWindow() {
    return this.buffer.getWindow();
  }
}

module.exports = { NetworkFlowMonitor };
