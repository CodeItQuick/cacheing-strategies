const { JournalingBuffer } = require('../../src/buffer/journalingBuffer');

describe('JournalingBuffer', () => {
  describe('append', () => {
    test('adds an entry to the journal', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('entry-a');

      expect(buffer.size).toBe(1);
    });

    test('accumulates multiple entries in the journal', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('entry-a');
      buffer.append('entry-b');
      buffer.append('entry-c');

      expect(buffer.size).toBe(3);
    });

    test('never calls applyFn on append', () => {
      const applyFn = jest.fn();
      const buffer = new JournalingBuffer(applyFn);

      for (let i = 0; i < 10; i++) buffer.append(`entry-${i}`);

      expect(applyFn).not.toHaveBeenCalled();
    });
  });

  describe('checkpoint', () => {
    test('calls applyFn with all pending entries', () => {
      const applied = [];
      const buffer = new JournalingBuffer((entries) => applied.push(...entries));

      buffer.append('a');
      buffer.append('b');
      buffer.checkpoint();

      expect(applied).toEqual(['a', 'b']);
    });

    test('does nothing when there are no pending entries', () => {
      const applyFn = jest.fn();
      const buffer = new JournalingBuffer(applyFn);

      buffer.checkpoint();

      expect(applyFn).not.toHaveBeenCalled();
    });

    test('does not re-apply already checkpointed entries', () => {
      const applied = [];
      const buffer = new JournalingBuffer((entries) => applied.push(...entries));

      buffer.append('a');
      buffer.checkpoint();

      buffer.append('b');
      buffer.checkpoint();

      expect(applied).toEqual(['a', 'b']);
    });

    test('resets pendingSize to 0 after checkpoint', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.append('b');
      buffer.checkpoint();

      expect(buffer.pendingSize).toBe(0);
    });

    test('does not shrink the journal — all entries are preserved', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.append('b');
      buffer.checkpoint();

      expect(buffer.size).toBe(2);
      expect(buffer.journal).toEqual(['a', 'b']);
    });

    test('calling checkpoint twice without new entries only applies once', () => {
      const applyFn = jest.fn();
      const buffer = new JournalingBuffer(applyFn);

      buffer.append('a');
      buffer.checkpoint();
      buffer.checkpoint();

      expect(applyFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('recover', () => {
    test('returns an empty array when no entries have been appended', () => {
      const buffer = new JournalingBuffer(jest.fn());

      expect(buffer.recover()).toEqual([]);
    });

    test('returns all entries when no checkpoint has been taken', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.append('b');
      buffer.append('c');

      expect(buffer.recover()).toEqual(['a', 'b', 'c']);
    });

    test('returns only entries since the last checkpoint', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.append('b');
      buffer.checkpoint();

      buffer.append('c');
      buffer.append('d');

      expect(buffer.recover()).toEqual(['c', 'd']);
    });

    test('returns an empty array when the journal is fully checkpointed', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.checkpoint();

      expect(buffer.recover()).toEqual([]);
    });

    test('does not modify the journal or checkpoint position', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.recover();
      buffer.recover();

      expect(buffer.size).toBe(1);
      expect(buffer.pendingSize).toBe(1);
    });
  });

  describe('journal', () => {
    test('is empty initially', () => {
      const buffer = new JournalingBuffer(jest.fn());

      expect(buffer.journal).toEqual([]);
    });

    test('contains all appended entries in order', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.append('b');
      buffer.append('c');

      expect(buffer.journal).toEqual(['a', 'b', 'c']);
    });

    test('retains all entries after a checkpoint', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.append('b');
      buffer.checkpoint();
      buffer.append('c');

      expect(buffer.journal).toEqual(['a', 'b', 'c']);
    });

    test('returns a snapshot — mutations do not affect the buffer', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      const snapshot = buffer.journal;
      snapshot.push('injected');

      expect(buffer.journal).toEqual(['a']);
    });
  });

  describe('size', () => {
    test('is 0 initially', () => {
      const buffer = new JournalingBuffer(jest.fn());

      expect(buffer.size).toBe(0);
    });

    test('reflects the total number of journaled entries', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.append('b');

      expect(buffer.size).toBe(2);
    });

    test('does not decrease after a checkpoint', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.append('b');
      buffer.checkpoint();

      expect(buffer.size).toBe(2);
    });
  });

  describe('pendingSize', () => {
    test('is 0 initially', () => {
      const buffer = new JournalingBuffer(jest.fn());

      expect(buffer.pendingSize).toBe(0);
    });

    test('reflects the number of entries since the last checkpoint', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.append('b');

      expect(buffer.pendingSize).toBe(2);
    });

    test('is 0 after a checkpoint', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.checkpoint();

      expect(buffer.pendingSize).toBe(0);
    });

    test('counts only entries since the last checkpoint', () => {
      const buffer = new JournalingBuffer(jest.fn());

      buffer.append('a');
      buffer.checkpoint();

      buffer.append('b');
      buffer.append('c');

      expect(buffer.pendingSize).toBe(2);
    });
  });
});
