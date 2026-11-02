const fs = require('fs');
const { SizeBasedBufferStrategyAdapter } = require('./sizeBasedBufferAdapters/sizeBasedBufferStrategyAdapter');

const DEFAULT_BUFFER_SIZE = 5;
const DEFAULT_FLUSH_INTERVAL_MS = 2000;

class LogWriter {
  constructor(filePath, { bufferSize = DEFAULT_BUFFER_SIZE, flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS, writer = fs.appendFileSync, bufferStrategy = new SizeBasedBufferStrategyAdapter(bufferSize) } = {}) {
    this.filePath = filePath;
    this.bufferSize = bufferSize;
    this.buffer = bufferStrategy;
    this.writer = writer;
    this.timer = setInterval(() => this.flush(), flushIntervalMs);
  }

  log(message) {
    this.buffer.write(message);
    // size-based adapters auto-flush internally on write — drain any items that were flushed
    this._drain();
  }

  flush() {
    if (this.buffer.size() === 0) return;
    this.buffer.present();
    this._drain();
  }

  _drain() {
    const items = this.buffer.consume();
    if (items.length === 0) return;
    const lines = items.join('\n') + '\n';
    this.writer(this.filePath, lines, 'utf8');
  }

  close() {
    clearInterval(this.timer);
    this.flush();
  }
}

module.exports = { LogWriter };
