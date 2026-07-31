/**
 * @fileoverview Wait two animation frames before running work (layout commit without InteractionManager tail).
 * @module lib/utils/afterNextFrame
 */
export function afterNextFrame(fn) {
    let cancelled = false;
    let inner = null;
    const outer = requestAnimationFrame(() => {
        if (cancelled)
            return;
        inner = requestAnimationFrame(() => {
            if (!cancelled)
                fn();
        });
    });
    return () => {
        cancelled = true;
        cancelAnimationFrame(outer);
        if (inner != null)
            cancelAnimationFrame(inner);
    };
}
