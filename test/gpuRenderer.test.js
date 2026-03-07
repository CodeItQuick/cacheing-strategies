const { GpuRenderer } = require('../src/gpuRenderer');

describe('GpuRenderer', () => {
  describe('submitFrame', () => {
    test('stages draw calls in the ready buffer after presenting', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['clearScreen', 'drawPlayer']);

      expect(gpu.buffer.readySize).toBe(2);
    });

    test('clears the write buffer after presenting', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['drawSprite']);

      expect(gpu.buffer.writeSize).toBe(0);
    });

    test('increments frameCount on each submission', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['drawA']);
      gpu.submitFrame(['drawB']);

      expect(gpu.frameCount).toBe(2);
    });
  });

  describe('render', () => {
    test('returns an empty array when no frame has been submitted', () => {
      const gpu = new GpuRenderer();

      expect(gpu.render()).toEqual([]);
    });

    test('returns the draw calls from the submitted frame', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['clearScreen', 'drawPlayer', 'drawEnemy']);

      expect(gpu.render()).toEqual(['clearScreen', 'drawPlayer', 'drawEnemy']);
    });

    test('returns draw calls in submission order', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['first', 'second', 'third']);

      const frame = gpu.render();

      expect(frame[0]).toBe('first');
      expect(frame[1]).toBe('second');
      expect(frame[2]).toBe('third');
    });

    test('returns an empty array when the same frame is rendered twice with no new submission', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['drawSprite']);
      gpu.render();

      expect(gpu.render()).toEqual([]);
    });
  });

  describe('non-blocking producer', () => {
    test('consumer always gets the most recently submitted frame', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['stale frame']);
      gpu.submitFrame(['latest frame']);

      expect(gpu.render()).toEqual(['latest frame']);
    });

    test('skipped frames are overwritten — only the latest is kept in the ready slot', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['frame1: drawBackground']);
      gpu.submitFrame(['frame2: drawBackground']);
      gpu.submitFrame(['frame3: drawBackground']);

      expect(gpu.render()).toEqual(['frame3: drawBackground']);
    });

    test('producer can submit a new frame while the previous frame is still on display', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['frame1: clearScreen', 'frame1: drawPlayer']);
      gpu.render();

      gpu.submitFrame(['frame2: clearScreen', 'frame2: drawPlayer']);

      expect(gpu.buffer.displaySize).toBe(2);
      expect(gpu.buffer.readySize).toBe(2);
    });

    test('producer can continue submitting after the consumer renders', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['frame1']);
      gpu.render();

      gpu.submitFrame(['frame2']);

      expect(gpu.render()).toEqual(['frame2']);
    });
  });

  describe('submit/render cycle', () => {
    test('each render returns only the draw calls from the most recent submit', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['drawBackground', 'drawPlayer']);
      const first = gpu.render();

      gpu.submitFrame(['drawBackground', 'drawEnemy']);
      const second = gpu.render();

      expect(first).toEqual(['drawBackground', 'drawPlayer']);
      expect(second).toEqual(['drawBackground', 'drawEnemy']);
    });

    test('frameCount tracks all submitted frames regardless of whether they were rendered', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['frame1']);
      gpu.submitFrame(['frame2']);
      gpu.submitFrame(['frame3']);
      gpu.render();

      expect(gpu.frameCount).toBe(3);
    });
  });

  describe('frameCount', () => {
    test('is 0 initially', () => {
      const gpu = new GpuRenderer();

      expect(gpu.frameCount).toBe(0);
    });

    test('increments for each submitted frame', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['drawA']);
      expect(gpu.frameCount).toBe(1);

      gpu.submitFrame(['drawB']);
      expect(gpu.frameCount).toBe(2);
    });

    test('does not increment on render', () => {
      const gpu = new GpuRenderer();

      gpu.submitFrame(['drawA']);
      gpu.render();

      expect(gpu.frameCount).toBe(1);
    });
  });
});
