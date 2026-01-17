/**
 * @fileoverview Tiny throttle helper (no deps).
 * Throttles a function on the JS thread; safe for low-frequency UI commits.
 */
export function throttle<TArgs extends any[]>(
  fn: (...args: TArgs) => void,
  waitMs: number
) {
  let last = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: TArgs | null = null;

  return (...args: TArgs) => {
    const now = Date.now();
    const remaining = waitMs - (now - last);
    pendingArgs = args;

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      last = now;
      const a = pendingArgs;
      pendingArgs = null;
      if (a) fn(...a);
      return;
    }

    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null;
        last = Date.now();
        const a = pendingArgs;
        pendingArgs = null;
        if (a) fn(...a);
      }, remaining);
    }
  };
}

