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

export type InteractionState = Readonly<{
  isUserScrolling: boolean;
  isMomentum: boolean;
}>;

type Listener = (state: InteractionState) => void;

const state: { isUserScrolling: boolean; isMomentum: boolean } = {
  isUserScrolling: false,
  isMomentum: false,
};

const listeners = new Set<Listener>();

function emit() {
  const snapshot = Object.freeze({ ...state });
  listeners.forEach((l) => {
    try {
      l(snapshot);
    } catch {
      // Never allow listeners to break interaction paths.
    }
  });
}

export const interactionQueue = Object.freeze({
  getState(): InteractionState {
    return state as InteractionState;
  },

  setUserScrolling(next: boolean): void {
    if (state.isUserScrolling === next) return;
    state.isUserScrolling = next;
    emit();
  },

  setMomentum(next: boolean): void {
    if (state.isMomentum === next) return;
    state.isMomentum = next;
    emit();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
});

