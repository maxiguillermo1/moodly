/**
 * @fileoverview Parse legacy AsyncStorage moodly.entries for SQLite import.
 * @module data/persistence/sqlite/importFromAsyncStorage
 */

import type { MoodEntriesRecord } from '../../../types';
import { validateEntriesRecord } from '../../model/entry';

/** Lenient parse for one-shot import — drops invalid rows, never throws. */
export function safeParseEntriesForImport(json: string | null): MoodEntriesRecord {
  if (!json) return {};
  try {
    const raw = JSON.parse(json) as unknown;
    return validateEntriesRecord(raw);
  } catch {
    return {};
  }
}
