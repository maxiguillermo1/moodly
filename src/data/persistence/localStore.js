/**
 * @fileoverview Default local {@link KeyValueStore} (AsyncStorage + optional fault-injection hook).
 * @module data/persistence/localStore
 */
import { storage } from '../storage/asyncStorage';
/**
 * Production I/O surface for migrations and future adapters.
 * Implementations of repositories continue to import `./asyncStorage` directly until
 * a full injectable-store pass is justified.
 */
export function getDefaultLocalKeyValueStore() {
    return storage;
}
