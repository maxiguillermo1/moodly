/**
 * @fileoverview Abstract key-value persistence (local today; database tomorrow).
 * @module data/persistence/keyValueStore
 *
 * Repositories and migrations depend on this interface so the concrete backend
 * (AsyncStorage now, SQLite/HTTP later) can be swapped without touching UI.
 */
export {};
