const { WriteAheadLog } = require('../src/writeAheadLog');

describe('WriteAheadLog', () => {
  describe('insert', () => {
    test('records are not visible in the table before a checkpoint', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });

      expect(wal.read(1)).toBeNull();
    });

    test('appends the record to the journal immediately', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });

      expect(wal.journal.size).toBe(1);
    });

    test('accumulates multiple records in the journal before checkpoint', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.insert({ id: 2, name: 'Bob' });
      wal.insert({ id: 3, name: 'Carol' });

      expect(wal.journal.size).toBe(3);
      expect(wal.read(1)).toBeNull();
      expect(wal.read(2)).toBeNull();
      expect(wal.read(3)).toBeNull();
    });
  });

  describe('checkpoint', () => {
    test('makes inserted records visible in the table', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.checkpoint();

      expect(wal.read(1)).toEqual({ id: 1, name: 'Alice' });
    });

    test('makes all pending records visible at once', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.insert({ id: 2, name: 'Bob' });
      wal.checkpoint();

      expect(wal.read(1)).toEqual({ id: 1, name: 'Alice' });
      expect(wal.read(2)).toEqual({ id: 2, name: 'Bob' });
    });

    test('does not re-apply already checkpointed records', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.checkpoint();

      wal.insert({ id: 2, name: 'Bob' });
      wal.checkpoint();

      expect(wal.read(1)).toEqual({ id: 1, name: 'Alice' });
      expect(wal.read(2)).toEqual({ id: 2, name: 'Bob' });
    });

    test('records inserted after a checkpoint are not visible until the next checkpoint', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.checkpoint();

      wal.insert({ id: 2, name: 'Bob' });

      expect(wal.read(2)).toBeNull();
    });

    test('does nothing when there are no pending records', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.checkpoint();
      wal.checkpoint();

      expect(wal.read(1)).toEqual({ id: 1, name: 'Alice' });
    });
  });

  describe('recover', () => {
    test('makes journaled records visible after a crash before any checkpoint', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.insert({ id: 2, name: 'Bob' });

      wal.recover();

      expect(wal.read(1)).toEqual({ id: 1, name: 'Alice' });
      expect(wal.read(2)).toEqual({ id: 2, name: 'Bob' });
    });

    test('replays only the records since the last checkpoint', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.checkpoint();

      wal.insert({ id: 2, name: 'Bob' });
      wal.insert({ id: 3, name: 'Carol' });

      wal.recover();

      expect(wal.read(2)).toEqual({ id: 2, name: 'Bob' });
      expect(wal.read(3)).toEqual({ id: 3, name: 'Carol' });
    });

    test('does nothing when the journal is fully checkpointed', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.checkpoint();

      wal.recover();

      expect(wal.read(1)).toEqual({ id: 1, name: 'Alice' });
    });

    test('does not affect records already applied by a checkpoint', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.checkpoint();

      wal.insert({ id: 2, name: 'Bob' });
      wal.recover();

      expect(wal.read(1)).toEqual({ id: 1, name: 'Alice' });
    });
  });

  describe('read', () => {
    test('returns null for a record that has never been inserted', () => {
      const wal = new WriteAheadLog();

      expect(wal.read(99)).toBeNull();
    });

    test('returns null for a record that is in the journal but not yet checkpointed or recovered', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });

      expect(wal.read(1)).toBeNull();
    });

    test('returns the record after it has been checkpointed', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.checkpoint();

      expect(wal.read(1)).toEqual({ id: 1, name: 'Alice' });
    });

    test('returns the record after it has been recovered', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.recover();

      expect(wal.read(1)).toEqual({ id: 1, name: 'Alice' });
    });
  });

  describe('crash recovery', () => {
    test('records inserted before a crash are restored by recover after restart', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.checkpoint();

      wal.insert({ id: 2, name: 'Bob' });
      // crash — checkpoint never called for Bob

      // restart: table is empty again but journal is intact
      wal.table = {};
      wal.recover();

      expect(wal.read(2)).toEqual({ id: 2, name: 'Bob' });
    });

    test('checkpointed records are not replayed during recovery', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.checkpoint();

      wal.insert({ id: 2, name: 'Bob' });
      // crash

      wal.table = {};
      wal.recover();

      // Alice was checkpointed — not in pending, not replayed after table wipe
      expect(wal.read(1)).toBeNull();
      // Bob was not checkpointed — recovered correctly
      expect(wal.read(2)).toEqual({ id: 2, name: 'Bob' });
    });

    test('multiple records inserted between checkpoints are all recovered', () => {
      const wal = new WriteAheadLog();

      wal.insert({ id: 1, name: 'Alice' });
      wal.checkpoint();

      wal.insert({ id: 2, name: 'Bob' });
      wal.insert({ id: 3, name: 'Carol' });
      wal.insert({ id: 4, name: 'Dave' });
      // crash

      wal.table = {};
      wal.recover();

      expect(wal.read(2)).toEqual({ id: 2, name: 'Bob' });
      expect(wal.read(3)).toEqual({ id: 3, name: 'Carol' });
      expect(wal.read(4)).toEqual({ id: 4, name: 'Dave' });
    });
  });
});
