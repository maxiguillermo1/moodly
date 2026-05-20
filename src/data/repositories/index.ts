/**
 * @fileoverview Composition root for local data access — re-exports preserve `src/storage` API.
 * @module data/repositories
 *
 * Prefer importing from **`src/storage`** in UI. This barrel groups implementations by domain
 * for documentation, tests, and future `DatabaseAdapter` swaps.
 */

export type { KeyValueStore, LocalStorageAdapter } from '../persistence/keyValueStore';

export * from './entriesRepository';
export * from './settingsRepository';
export * from './extensionsRepository';
export * from './calendarSnapshotRepository';
export * from './sessionRepository';
export * from './tasksRepository';
export * from './goalsRepository';
export * from './dailyActivityRepository';
export * from './insightsRepository';
export * from './narrativeRepository';
export * from './userDataRepository';
export * from './userDataExportRepository';

export {
  ensureLocalPersistenceReady,
  getPersistenceDiagnostics,
  resetPersistenceBootstrapForTests,
} from '../persistence/bootstrap';
