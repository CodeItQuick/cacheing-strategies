/**
 * BufferStrategy — common interface for all buffer implementations.
 *
 * Any buffer used as a strategy must implement these four operations:
 *
 *   write(item)  — accept an item into the pending slot
 *   present()    — promote the pending slot to ready (e.g. present, swap, checkpoint)
 *   consume()    — retrieve and advance the ready slot (e.g. consume, drain, recover)
 *   size()       — number of items currently pending in the write slot
 *
 * Concrete strategies are responsible for translating these into their
 * buffer's native API (e.g. swap/drain for DoubleBuffer, checkpoint/recover
 * for JournalingBuffer).
 */
class BufferStrategy {
  // Accept an item into the pending/write slot
  write(item) {
    throw new Error(`${this.constructor.name} must implement write(item)`);
  }

  // Promote the pending slot — commits items so they are ready to be consumed
  present() {
    throw new Error(`${this.constructor.name} must implement present()`);
  }

  // Retrieve and advance the ready slot — returns the committed items as an array
  consume() {
    throw new Error(`${this.constructor.name} must implement consume()`);
  }

  // Number of items currently pending in the write slot
  size() {
    throw new Error(`${this.constructor.name} must implement size()`);
  }
}

module.exports = { BufferStrategy };

