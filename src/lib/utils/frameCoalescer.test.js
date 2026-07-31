import { createFrameCoalescer } from './frameCoalescer';
describe('createFrameCoalescer', () => {
    it('commits only the last enqueued value (last wins)', () => {
        const commits = [];
        const queue = [];
        const raf = globalThis.requestAnimationFrame;
        const caf = globalThis.cancelAnimationFrame;
        // Deterministic fake rAF.
        globalThis.requestAnimationFrame = (cb) => {
            queue.push(cb);
            return queue.length;
        };
        globalThis.cancelAnimationFrame = (_id) => { };
        try {
            const c = createFrameCoalescer((v) => commits.push(v));
            c.enqueue(1);
            c.enqueue(2);
            c.enqueue(3);
            expect(commits).toEqual([]);
            // Flush one frame.
            const cb = queue.shift();
            cb && cb(0);
            expect(commits).toEqual([3]);
        }
        finally {
            globalThis.requestAnimationFrame = raf;
            globalThis.cancelAnimationFrame = caf;
        }
    });
});
