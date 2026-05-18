/**
 * @fileoverview Data-layer public surface for storage.
 *
 * Phase 2: data layer is the source of truth for persistence implementations.
 *
 * @module data/storage
 */

export * from './moodStorage';
export * from './settingsStorage';
export * from './habitSelectionsStorage';
export * from './habitTrackingStorage';
export * from './dayTodosStorage';
export * from './tasksStorage';
export * from './goalsStorage';
export * from './demoSeed';
export * from './fullDemoSeed';
export * from './sessionStore';
export * from './calendarSnapshot';

export {
  ensureLocalPersistenceReady,
  getPersistenceDiagnostics,
  resetPersistenceBootstrapForTests,
} from '../persistence/bootstrap';

