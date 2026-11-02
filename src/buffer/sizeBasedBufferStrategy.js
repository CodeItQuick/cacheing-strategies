/**
 * SizeBasedBufferStrategy — common interface for size-based buffer implementations.
 *
 * Differs from BufferStrategy in that write() may trigger an implicit flush
 * when the buffer reaches capacity. The four operations are:
 *
 *   write(item)  — accept an item; may auto-flush if capacity is reached
 *   present()    — explicit flush of any remaining items below the threshold
 *   consume()    — retrieve the most recently flushed batch as an array
 *   size()       — number of items currently pending in the write slot
 */
class SizeBasedBufferStrategy {
  // Accept an item — may auto-flush if capacity is reached
  write(item) {
    throw new Error(`${this.constructor.name} must implement write(item)`);
  }

  // Explicit flush — promotes any remaining pending items regardless of size
  present() {
    throw new Error(`${this.constructor.name} must implement present()`);
  }

  // Returns the most recently flushed batch, then clears it
  consume() {
    throw new Error(`${this.constructor.name} must implement consume()`);
  }

  // Number of items currently pending in the write slot
  size() {
    throw new Error(`${this.constructor.name} must implement size()`);
  }
}

module.exports = { SizeBasedBufferStrategy };

