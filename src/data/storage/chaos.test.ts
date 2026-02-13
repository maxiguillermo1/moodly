import { __resetChaosForTests, chaosBeforeStorageOp } from './chaos';

describe('storage chaos (deterministic)', () => {
  beforeEach(() => {
    __resetChaosForTests();
    (globalThis as any).__MOODLY_CHAOS__ = undefined;
  });

  it('failNext deterministically fails the next N calls', async () => {
    (globalThis as any).__MOODLY_CHAOS__ = { enabled: true, seed: 1, failNext: { setItem: 2 } };

    await expect(chaosBeforeStorageOp('setItem', 'k')).rejects.toThrow('[chaos] injected setItem failure');
    await expect(chaosBeforeStorageOp('setItem', 'k')).rejects.toThrow('[chaos] injected setItem failure');
    await expect(chaosBeforeStorageOp('setItem', 'k')).resolves.toBeUndefined();
  });

  it('same seed produces the same probabilistic failure pattern', async () => {
    const run = async () => {
      __resetChaosForTests();
      (globalThis as any).__MOODLY_CHAOS__ = { enabled: true, seed: 123, pFail: 0.4, minDelayMs: 0, maxDelayMs: 0 };
      const out: boolean[] = [];
      for (let i = 0; i < 8; i++) {
        try {
          await chaosBeforeStorageOp('getItem', `k${i}`);
          out.push(false);
        } catch {
          out.push(true);
        }
      }
      return out;
    };

    const a = await run();
    const b = await run();
    expect(a).toEqual(b);
  });
});

