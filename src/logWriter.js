const fs = require('fs');
const { TripleBufferStrategy } = require('./tripleBufferAdapters/tripleBufferStrategy');

const DEFAULT_BUFFER_SIZE = 5;
const DEFAULT_FLUSH_INTERVAL_MS = 2000;

class LogWriter {
  constructor(filePath, { bufferSize = DEFAULT_BUFFER_SIZE, flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS, writer = fs.appendFileSync, bufferStrategy = new TripleBufferStrategy() } = {}) {
    this.filePath = filePath;
    this.bufferSize = bufferSize;
    this.buffer = bufferStrategy;
    this.writer = writer;
    this.timer = setInterval(() => this.flush(), flushIntervalMs);
  }

  log(message) {
    this.buffer.write(message);
    if (this.buffer.size() >= this.bufferSize) {
      this.flush();
    }
  }

  flush() {
    if (this.buffer.size() === 0) return;
    this.buffer.present();
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
