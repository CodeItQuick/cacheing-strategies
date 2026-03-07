const { TripleBuffer } = require('./buffer/tripleBuffer');

class GpuRenderer {
  constructor() {
    this.buffer = new TripleBuffer();
    this.frameCount = 0;
  }

  submitFrame(drawCalls) {
    for (const call of drawCalls) {
      this.buffer.write(call);
    }
    this.buffer.present();
    this.frameCount++;
  }

  render() {
    return this.buffer.consume();
  }
}

module.exports = { GpuRenderer };
