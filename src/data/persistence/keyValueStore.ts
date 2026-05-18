/**
 * @fileoverview Abstract key-value persistence (local today; database tomorrow).
 * @module data/persistence/keyValueStore
 *
 * Repositories and migrations depend on this interface so the concrete backend
 * (AsyncStorage now, SQLite/HTTP later) can be swapped without touching UI.
 */

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]>;
  multiSet(pairs: readonly [string, string][]): Promise<void>;
  multiRemove(keys: readonly string[]): Promise<void>;
  /** Optional until all adapters implement it; required for full local export. */
  getAllKeys?(): Promise<readonly string[]>;
};

/** Naming alias for the active device-local backend (AsyncStorage today via `localStore`). */
export type LocalStorageAdapter = KeyValueStore;
