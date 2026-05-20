import {
  __resetAsyncStorageFaultInjectionForTests,
  beforeAsyncStorageFaultInjection,
} from './storageFaultInjection';

describe('storageFaultInjection (deterministic)', () => {
  beforeEach(() => {
    __resetAsyncStorageFaultInjectionForTests();
    (globalThis as any).__KAIRO_CHAOS__ = undefined;
    (globalThis as any).__KAIRO_STORAGE_FAULTS__ = undefined;
  });

  it('failNext deterministically fails the next N calls', async () => {
    (globalThis as any).__KAIRO_STORAGE_FAULTS__ = { enabled: true, seed: 1, failNext: { setItem: 2 } };

    await expect(beforeAsyncStorageFaultInjection('setItem', 'k')).rejects.toThrow(
      '[storageFaultInjection] injected setItem failure'
    );
    await expect(beforeAsyncStorageFaultInjection('setItem', 'k')).rejects.toThrow(
      '[storageFaultInjection] injected setItem failure'
    );
    await expect(beforeAsyncStorageFaultInjection('setItem', 'k')).resolves.toBeUndefined();
  });

  it('same seed produces the same probabilistic failure pattern', async () => {
    const run = async () => {
      __resetAsyncStorageFaultInjectionForTests();
      (globalThis as any).__KAIRO_STORAGE_FAULTS__ = {
        enabled: true,
        seed: 123,
        pFail: 0.4,
        minDelayMs: 0,
        maxDelayMs: 0,
      };
      const out: boolean[] = [];
      for (let i = 0; i < 8; i++) {
        try {
          await beforeAsyncStorageFaultInjection('getItem', `k${i}`);
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
