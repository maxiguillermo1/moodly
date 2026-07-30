/**
 * @fileoverview Dev/test-only visual fixture gate.
 * @module qa/visualFixtures
 *
 * Activation: EXPO_PUBLIC_KAIRO_VISUAL_FIXTURE=1 (never in production).
 */

export type VisualFixtureScenario =
  | 'calendar-empty'
  | 'calendar-populated'
  | 'today-empty'
  | 'today-complete'
  | 'journal-empty'
  | 'journal-short'
  | 'journal-long';

const PRODUCTION_VARIANTS = new Set(['production']);

export function isVisualFixtureModeEnabled(): boolean {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return false;
  const variant = process.env.APP_VARIANT ?? process.env.EXPO_PUBLIC_APP_VARIANT ?? '';
  if (PRODUCTION_VARIANTS.has(variant)) return false;
  return process.env.EXPO_PUBLIC_KAIRO_VISUAL_FIXTURE === '1';
}

export function getActiveVisualFixture(): VisualFixtureScenario | null {
  if (!isVisualFixtureModeEnabled()) return null;
  const raw = process.env.EXPO_PUBLIC_KAIRO_VISUAL_FIXTURE_SCENARIO;
  if (!raw) return 'today-empty';
  return raw as VisualFixtureScenario;
}
