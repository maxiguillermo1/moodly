/**
 * @fileoverview Single-shot splash hide — prevents double-hide flashes and stuck splash.
 * @module bootstrap/splashScreen
 */

import * as SplashScreen from 'expo-splash-screen';

let navReady = false;
let firstScreenReady = false;
let hideStarted = false;

/** Call from NavigationContainer onReady. */
export function markNavigationReady(): void {
  navReady = true;
  void tryHideSplash('navReady');
}

/** Call from the first stable screen (Today or login gate) onLayout. */
export function markFirstScreenReady(source: string): void {
  firstScreenReady = true;
  void tryHideSplash(source);
}

/**
 * Hide native splash once nav + first screen are ready.
 * Safe to call multiple times; only the first successful hide runs.
 */
export async function tryHideSplash(_source: string): Promise<void> {
  if (hideStarted) return;
  if (!navReady || !firstScreenReady) return;
  hideStarted = true;
  await SplashScreen.hideAsync().catch(() => {});
}

/** @deprecated Use markNavigationReady + markFirstScreenReady. Kept for transitional call sites. */
export function hideSplashOnce(): void {
  markNavigationReady();
}
