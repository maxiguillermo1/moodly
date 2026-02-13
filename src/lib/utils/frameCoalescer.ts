/**
 * @fileoverview Coalesce rapid events to one commit per frame.
 *
 * Used for "last tap wins" behavior without queue explosions or setState storms.
 * Implementation is intentionally tiny and allocation-light.
 */
export type FrameCoalescer<T> = {
  enqueue(value: T): void;
  cancel(): void;
};

export function createFrameCoalescer<T>(commit: (value: T) => void): FrameCoalescer<T> {
  let pending: T | null = null;
  let rafId: number | null = null;

  function flush() {
    rafId = null;
    const v = pending;
    pending = null;
    if (v != null) commit(v);
  }

  return {
    enqueue(value: T) {
      pending = value;
      if (rafId != null) return;
      rafId = requestAnimationFrame(flush);
    },
    cancel() {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = null;
      pending = null;
    },
  };
}

