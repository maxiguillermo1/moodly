/**
 * @fileoverview Storage layer public surface (local persistence).
 * @module storage
 *
 * All exports resolve through **`src/data/repositories`** so call sites stay stable while
 * implementations remain swappable (AsyncStorage today → SQLite/remote later).
 *
 * - AsyncStorage is only touched inside `src/data/storage/asyncStorage.ts` and migrations’ {@link KeyValueStore}.
 * - Prefer named functions (`getAllEntries`, …) or repository objects (`entriesRepository`, …) from this module.
 */
export * from '../data/repositories';
export * from './userDataTransfer';
