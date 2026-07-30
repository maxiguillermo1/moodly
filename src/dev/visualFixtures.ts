/**
 * @fileoverview Dev/test-only deterministic visual fixture catalog.
 * @module dev/visualFixtures
 *
 * Activation: EXPO_PUBLIC_KAIRO_VISUAL_FIXTURES=1 AND __DEV__ === true.
 * Production builds always return false from isVisualFixtureMode().
 */

export type VisualFixtureId =
  | 'calendar-empty'
  | 'calendar-populated'
  | 'today-empty'
  | 'today-complete'
  | 'journal-empty'
  | 'journal-short'
  | 'journal-long';

const FIXTURE_IDS: VisualFixtureId[] = [
  'calendar-empty',
  'calendar-populated',
  'today-empty',
  'today-complete',
  'journal-empty',
  'journal-short',
  'journal-long',
];

/** True only in development when EXPO_PUBLIC_KAIRO_VISUAL_FIXTURES=1. */
export function isVisualFixtureMode(): boolean {
  return (
    typeof __DEV__ !== 'undefined' &&
    !!__DEV__ &&
    process.env.EXPO_PUBLIC_KAIRO_VISUAL_FIXTURES === '1'
  );
}

/** Active fixture from env, or null when fixture mode is off. */
export function activeVisualFixture(): VisualFixtureId | null {
  if (!isVisualFixtureMode()) return null;
  const raw = process.env.EXPO_PUBLIC_KAIRO_VISUAL_FIXTURE_ID;
  if (raw && FIXTURE_IDS.includes(raw as VisualFixtureId)) {
    return raw as VisualFixtureId;
  }
  return null;
}

export function listVisualFixtures(): VisualFixtureId[] {
  return [...FIXTURE_IDS];
}

/** Metadata for screenshot capture planning (no PII). */
export function describeVisualFixture(id: VisualFixtureId): {
  id: VisualFixtureId;
  screen: 'Calendar' | 'Today' | 'Journal';
  appearance: 'light' | 'dark' | 'both';
  description: string;
} {
  switch (id) {
    case 'calendar-empty':
      return { id, screen: 'Calendar', appearance: 'both', description: 'Calendar month with no mood entries' };
    case 'calendar-populated':
      return { id, screen: 'Calendar', appearance: 'both', description: 'Calendar with several mood dots' };
    case 'today-empty':
      return { id, screen: 'Today', appearance: 'both', description: 'Today hub with no entry logged' };
    case 'today-complete':
      return { id, screen: 'Today', appearance: 'both', description: 'Today with completed mood entry' };
    case 'journal-empty':
      return { id, screen: 'Journal', appearance: 'both', description: 'Journal list empty state' };
    case 'journal-short':
      return { id, screen: 'Journal', appearance: 'both', description: 'Journal with short entries' };
    case 'journal-long':
      return { id, screen: 'Journal', appearance: 'both', description: 'Journal with long entries' };
    default:
      return { id, screen: 'Today', appearance: 'both', description: 'unknown' };
  }
}
