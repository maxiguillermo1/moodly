import { createFrameCoalescer } from './frameCoalescer';

describe('createFrameCoalescer', () => {
  it('commits only the last enqueued value (last wins)', () => {
    const commits: number[] = [];
    const queue: Array<FrameRequestCallback> = [];
    const raf = globalThis.requestAnimationFrame;
    const caf = globalThis.cancelAnimationFrame;

    // Deterministic fake rAF.
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      queue.push(cb);
      return queue.length;
    };
    (globalThis as any).cancelAnimationFrame = (_id: number) => {};

    try {
      const c = createFrameCoalescer<number>((v) => commits.push(v));
      c.enqueue(1);
      c.enqueue(2);
      c.enqueue(3);
      expect(commits).toEqual([]);
      // Flush one frame.
      const cb = queue.shift();
      cb && cb(0);
      expect(commits).toEqual([3]);
    } finally {
      (globalThis as any).requestAnimationFrame = raf;
      (globalThis as any).cancelAnimationFrame = caf;
    }
  });
});

