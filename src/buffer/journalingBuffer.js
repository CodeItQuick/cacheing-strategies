class JournalingBuffer {
  constructor(applyFn) {
    this.applyFn = applyFn;
    this.log = [];
    this.checkpointIndex = 0;
  }

  append(entry) {
    this.log.push(entry);
  }

  checkpoint() {
    const pending = this.log.slice(this.checkpointIndex);
    if (pending.length === 0) return;
    this.applyFn(pending);
    this.checkpointIndex = this.log.length;
  }

  recover() {
    return this.log.slice(this.checkpointIndex);
  }

  get journal() {
    return [...this.log];
  }

  get size() {
    return this.log.length;
  }

  get pendingSize() {
    return this.log.length - this.checkpointIndex;
  }
}

module.exports = { JournalingBuffer };
