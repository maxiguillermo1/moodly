/**
 * @fileoverview Global interaction state + scheduling helpers.
 *
 * Goals:
 * - Provide a single place to mark "user is scrolling / momentum is active".
 * - Avoid duplicated refs and inconsistent gating across screens.
 * - Allow shared utilities (haptics/touch feedback) to avoid firing during momentum.
 *
 * Constraints:
 * - Must not cause re-renders (no React state here).
 * - Must be extremely cheap on hot paths (simple ref + listener set).
 */
const state = {
    isUserScrolling: false,
    isMomentum: false,
};
const listeners = new Set();
function emit() {
    const snapshot = Object.freeze({ ...state });
    listeners.forEach((l) => {
        try {
            l(snapshot);
        }
        catch {
            // Never allow listeners to break interaction paths.
        }
    });
}
export const interactionQueue = Object.freeze({
    getState() {
        return state;
    },
    setUserScrolling(next) {
        if (state.isUserScrolling === next)
            return;
        state.isUserScrolling = next;
        emit();
    },
    setMomentum(next) {
        if (state.isMomentum === next)
            return;
        state.isMomentum = next;
        emit();
    },
    reset() {
        if (!state.isUserScrolling && !state.isMomentum)
            return;
        state.isUserScrolling = false;
        state.isMomentum = false;
        emit();
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
});
