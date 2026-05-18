/**
 * @fileoverview Canonical persisted shapes — mood + journal share one row type.
 * @module types/canonicalPersisted
 *
 * **Journal** is a UI projection (newest-first list) over {@link MoodEntry} rows.
 * A future DB might use table `entries` with primary key `date` (local day) or a surrogate UUID;
 * the app’s stable natural key today is **`date: YYYY-MM-DD`**.
 */

import type { MoodEntry } from './mood.types';
import type { Goal } from './goals.types';
import type { Task } from './todo.types';

/** One row in `moodly.entries` / future `entries` table. */
export type PersistedMoodJournalEntry = MoodEntry;
export type PersistedTask = Task;
export type PersistedGoal = Goal;

/** Local calendar identity; must match `isValidISODateKey` invariants. */
export type PersistedDayKey = string;
