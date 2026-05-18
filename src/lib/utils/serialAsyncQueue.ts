/**
 * @fileoverview FIFO async queue — one in-flight task at a time.
 * @module lib/utils/serialAsyncQueue
 *
 * Used so Reminders UI mutations cannot reorder completions vs disk
 * (e.g. parallel toggle + add racing on `setItems`).
 */

/**
 * @returns An `enqueue` function that runs each task after the previous finishes.
 *          A rejected task does not block subsequent tasks.
 */
export function createSerialEnqueue(): <T>(task: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run: Promise<T> = tail.then(() => task());
    tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
}
