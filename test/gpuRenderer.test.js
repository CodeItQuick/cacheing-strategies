const {GpuRenderer} = require('../src/gpuRenderer');
const {DoubleBufferStrategy} = require("../src/buffer/doubleBufferStrategy");
const {TripleBufferStrategy} = require("../src/buffer/tripleBufferStrategy");

[TripleBufferStrategy, DoubleBufferStrategy].forEach((BufferStrategyClass) => {
    describe(`GpuRenderer with ${BufferStrategyClass.name}`, () => {
        let buffer;

        beforeEach(() => {
            buffer = new BufferStrategyClass();
        });
        describe('submitFrame', () => {
            test('increments frameCount on each submission', () => {
                const gpu = new GpuRenderer(buffer);

                gpu.submitFrame(['drawA']);
                gpu.submitFrame(['drawB']);

                expect(gpu.frameCount).toBe(2);
            });
        });

        describe('render', () => {
            test('returns an empty array when no frame has been submitted', () => {
                const gpu = new GpuRenderer(buffer);

                expect(gpu.render()).toEqual([]);
            });

            test('returns the draw calls from the submitted frame', () => {
                const gpu = new GpuRenderer(buffer);

                gpu.submitFrame(['clearScreen', 'drawPlayer', 'drawEnemy']);

                expect(gpu.render()).toEqual(['clearScreen', 'drawPlayer', 'drawEnemy']);
            });

            test('returns draw calls in submission order', () => {
                const gpu = new GpuRenderer(buffer);

                gpu.submitFrame(['first', 'second', 'third']);

                const frame = gpu.render();

                expect(frame[0]).toBe('first');
                expect(frame[1]).toBe('second');
                expect(frame[2]).toBe('third');
            });

            test('returns an empty array when the same frame is rendered twice with no new submission', () => {
                const gpu = new GpuRenderer(buffer);

                gpu.submitFrame(['drawSprite']);
                gpu.render();

                expect(gpu.render()).toEqual([]);
            });
        });

        describe('non-blocking producer', () => {
            test('consumer always gets the most recently submitted frame', () => {
                const gpu = new GpuRenderer(buffer);

                gpu.submitFrame(['stale frame']);
                gpu.submitFrame(['latest frame']);

                expect(gpu.render()).toEqual(['latest frame']);
            });

            test('producer can continue submitting after the consumer renders', () => {
                const gpu = new GpuRenderer(buffer);

                gpu.submitFrame(['frame1']);
                gpu.render();

                gpu.submitFrame(['frame2']);

                expect(gpu.render()).toEqual(['frame2']);
            });
        });

        describe('submit/render cycle', () => {
            test('each render returns only the draw calls from the most recent submit', () => {
                const gpu = new GpuRenderer(buffer);

                gpu.submitFrame(['drawBackground', 'drawPlayer']);
                const first = gpu.render();

                gpu.submitFrame(['drawBackground', 'drawEnemy']);
                const second = gpu.render();

                expect(first).toEqual(['drawBackground', 'drawPlayer']);
                expect(second).toEqual(['drawBackground', 'drawEnemy']);
            });

            test('frameCount tracks all submitted frames regardless of whether they were rendered', () => {
                const gpu = new GpuRenderer(buffer);

                gpu.submitFrame(['frame1']);
                gpu.submitFrame(['frame2']);
                gpu.submitFrame(['frame3']);
                gpu.render();

                expect(gpu.frameCount).toBe(3);
            });
        });

        describe('frameCount', () => {
            test('is 0 initially', () => {
                const gpu = new GpuRenderer(buffer);

                expect(gpu.frameCount).toBe(0);
            });

            test('increments for each submitted frame', () => {
                const gpu = new GpuRenderer(buffer);

                gpu.submitFrame(['drawA']);
                expect(gpu.frameCount).toBe(1);

                gpu.submitFrame(['drawB']);
                expect(gpu.frameCount).toBe(2);
            });

            test('does not increment on render', () => {
                const gpu = new GpuRenderer(buffer);

                gpu.submitFrame(['drawA']);
                gpu.render();

                expect(gpu.frameCount).toBe(1);
            });
        });
    });
})
