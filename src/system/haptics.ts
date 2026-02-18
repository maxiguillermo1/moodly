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

type HapticKind = 'select' | 'success' | 'error' | 'toggle' | 'sheet';

const DEFAULT_COOLDOWN_MS: Record<HapticKind, number> = {
  select: 80,
  toggle: 80,
  sheet: 120,
  success: 120,
  error: 120,
};

let lastAtByKind: Record<HapticKind, number> = {
  select: 0,
  success: 0,
  error: 0,
  toggle: 0,
  sheet: 0,
};

function nowMs(): number {
  const p: any = (globalThis as any).performance;
  return typeof p?.now === 'function' ? p.now() : Date.now();
}

function shouldFire(kind: HapticKind): boolean {
  // Expo Haptics is iOS/Android focused; treat web as no-op.
  if (Platform.OS === 'web') return false;
  // Never during momentum (prevents noisy/laggy vibrations while scrolling).
  if (interactionQueue.getState().isMomentum) return false;
  const t = nowMs();
  const last = lastAtByKind[kind] ?? 0;
  const cd = DEFAULT_COOLDOWN_MS[kind] ?? 100;
  if (t - last < cd) return false;
  lastAtByKind[kind] = t;
  return true;
}

async function safeCall(fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
  } catch {
    // Silent: haptics must never crash the app.
  }
}

async function getModule() {
  // Keep import lazy so unsupported environments remain silent.
  const mod = require('expo-haptics') as typeof import('expo-haptics');
  return mod;
}

export const haptics = Object.freeze({
  select(): void {
    if (!shouldFire('select')) return;
    void safeCall(async () => {
      const Haptics = await getModule();
      await Haptics.selectionAsync();
    });
  },

  toggle(): void {
    if (!shouldFire('toggle')) return;
    void safeCall(async () => {
      const Haptics = await getModule();
      await Haptics.selectionAsync();
    });
  },

  success(): void {
    if (!shouldFire('success')) return;
    void safeCall(async () => {
      const Haptics = await getModule();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  },

  error(): void {
    if (!shouldFire('error')) return;
    void safeCall(async () => {
      const Haptics = await getModule();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    });
  },

  sheet(): void {
    if (!shouldFire('sheet')) return;
    void safeCall(async () => {
      const Haptics = await getModule();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    });
  },
});

