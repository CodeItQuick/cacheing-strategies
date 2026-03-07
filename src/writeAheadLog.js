const { JournalingBuffer } = require('./buffer/journalingBuffer');

class WriteAheadLog {
  constructor() {
    this.table = {};
    this.journal = new JournalingBuffer((entries) => {
      for (const record of entries) {
        this.table[record.id] = record;
      }
    });
  }

  insert(record) {
    this.journal.append(record);
  }

  checkpoint() {
    this.journal.checkpoint();
  }

  recover() {
    const pending = this.journal.recover();
    for (const record of pending) {
      this.table[record.id] = record;
    }
  }

  read(id) {
    return this.table[id] ?? null;
  }
}

module.exports = { WriteAheadLog };
