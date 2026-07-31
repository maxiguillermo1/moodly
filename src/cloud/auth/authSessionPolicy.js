/**
 * @fileoverview Auth session event policy for cloud restore triggers.
 * @module cloud/auth/authSessionPolicy
 */
export function shouldRunCloudRestore(event) {
    return event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
}
/** Full local snapshot upload only on fresh sign-in — not every cold resume. */
export function shouldEnqueueFullLocalSnapshot(event) {
    return event === 'SIGNED_IN';
}
export function shouldBlockUiDuringRestore(event) {
    return event === 'SIGNED_IN';
}
