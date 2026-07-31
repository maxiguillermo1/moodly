export function createFrameCoalescer(commit) {
    let pending = null;
    let rafId = null;
    function flush() {
        rafId = null;
        const v = pending;
        pending = null;
        if (v != null)
            commit(v);
    }
    return {
        enqueue(value) {
            pending = value;
            if (rafId != null)
                return;
            rafId = requestAnimationFrame(flush);
        },
        cancel() {
            if (rafId != null)
                cancelAnimationFrame(rafId);
            rafId = null;
            pending = null;
        },
    };
}
