/**
 * @fileoverview Centralized haptics (iOS-native feel).
 *
 * Rules:
 * - Never fire repeatedly during rapid taps (cooldown).
 * - Never fire during scroll momentum.
 * - Silent on unsupported platforms (web, missing module).
 *
 * IMPORTANT:
 * - Haptics are interaction polish only; they must not affect app correctness.
 */
import { Platform } from 'react-native';
import { interactionQueue } from './interactionQueue';
const DEFAULT_COOLDOWN_MS = {
    select: 80,
    toggle: 80,
    sheet: 120,
    success: 120,
    error: 120,
    /** Bottom tabs: allow rapid switches without stacking vibrations. */
    tab: 52,
};
const lastAtByKind = {
    select: 0,
    success: 0,
    error: 0,
    toggle: 0,
    sheet: 0,
    tab: 0,
};
function nowMs() {
    const p = globalThis.performance;
    return typeof p?.now === 'function' ? p.now() : Date.now();
}
function shouldFire(kind) {
    // Expo Haptics is iOS/Android focused; treat web as no-op.
    if (Platform.OS === 'web')
        return false;
    // Never during momentum (prevents noisy/laggy vibrations while scrolling).
    if (interactionQueue.getState().isMomentum)
        return false;
    const t = nowMs();
    const last = lastAtByKind[kind] ?? 0;
    const cd = DEFAULT_COOLDOWN_MS[kind] ?? 100;
    if (t - last < cd)
        return false;
    lastAtByKind[kind] = t;
    return true;
}
async function safeCall(fn) {
    try {
        await fn();
    }
    catch {
        // Silent: haptics must never crash the app.
    }
}
async function getModule() {
    // Keep import lazy so unsupported environments remain silent.
    const mod = require('expo-haptics');
    return mod;
}
export const haptics = Object.freeze({
    select() {
        if (!shouldFire('select'))
            return;
        void safeCall(async () => {
            const Haptics = await getModule();
            await Haptics.selectionAsync();
        });
    },
    toggle() {
        if (!shouldFire('toggle'))
            return;
        void safeCall(async () => {
            const Haptics = await getModule();
            await Haptics.selectionAsync();
        });
    },
    success() {
        if (!shouldFire('success'))
            return;
        void safeCall(async () => {
            const Haptics = await getModule();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        });
    },
    error() {
        if (!shouldFire('error'))
            return;
        void safeCall(async () => {
            const Haptics = await getModule();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        });
    },
    sheet() {
        if (!shouldFire('sheet'))
            return;
        void safeCall(async () => {
            const Haptics = await getModule();
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        });
    },
    /**
     * Main bottom tabs — lighter than `selectionAsync`, tuned for rapid tab switches.
     */
    tab() {
        if (!shouldFire('tab'))
            return;
        void safeCall(async () => {
            const Haptics = await getModule();
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        });
    },
});
