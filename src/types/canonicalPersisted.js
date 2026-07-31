/**
 * @fileoverview Canonical persisted shapes — mood + journal share one row type.
 * @module types/canonicalPersisted
 *
 * **Journal** is a UI projection (newest-first list) over {@link MoodEntry} rows.
 * A future DB might use table `entries` with primary key `date` (local day) or a surrogate UUID;
 * the app’s stable natural key today is **`date: YYYY-MM-DD`**.
 */
export {};
