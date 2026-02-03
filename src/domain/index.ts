/**
 * @fileoverview Domain layer public surface (pure rules + analytics selectors).
 * @module domain
 *
 * Beginner rule:
 * - Import pure rules, validation, and derived insights from here.
 * - No React, no navigation, no AsyncStorage.
 *
 * NOTE: This is a facade. It re-exports canonical pure modules so UI code can avoid
 * deep imports like `lib/*` and `data/*`.
 */

export * from '../logic';
export * from '../insights';
export * from '../lib/utils/date';
export * from '../lib/constants/moods';
export * from '../lib/utils/throttle';
export * from '../lib/calendar/monthWindow';