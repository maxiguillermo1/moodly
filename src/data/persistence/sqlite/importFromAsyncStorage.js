/**
 * @fileoverview Parse legacy AsyncStorage kairo.entries for SQLite import.
 * @module data/persistence/sqlite/importFromAsyncStorage
 */
import { validateEntriesRecord } from '../../model/entry';
/** Lenient parse for one-shot import — drops invalid rows, never throws. */
export function safeParseEntriesForImport(json) {
    if (!json)
        return {};
    try {
        const raw = JSON.parse(json);
        return validateEntriesRecord(raw);
    }
    catch {
        return {};
    }
}
