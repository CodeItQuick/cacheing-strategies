const fs = require('fs');

const DEFAULT_BUFFER_SIZE = 5;
const DEFAULT_FLUSH_INTERVAL_MS = 2000;

class LogWriter {
  constructor(filePath, { bufferSize = DEFAULT_BUFFER_SIZE, flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS, writer = fs.appendFileSync } = {}) {
    this.filePath = filePath;
    this.bufferSize = bufferSize;
    this.buffer = [];
    this.writer = writer;
    this.timer = setInterval(() => this.flush(), flushIntervalMs);
  }

  log(message) {
    this.buffer.push(message);
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  flush() {
    if (this.buffer.length === 0) return;
    const lines = this.buffer.join('\n') + '\n';
    this.buffer = [];
    this.writer(this.filePath, lines, 'utf8');
  }

  close() {
    clearInterval(this.timer);
    this.flush();
  }
}

module.exports = { LogWriter };
