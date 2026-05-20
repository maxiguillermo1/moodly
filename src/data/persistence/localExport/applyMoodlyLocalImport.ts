/**
 * @fileoverview Restore a validated local export envelope (AsyncStorage + SQLite re-import).
 * @module data/persistence/localExport/applyMoodlyLocalImport
 */

import { logger } from '../../../lib/security/logger';
import {
  assertLocalPersistenceWritable,
  ensureLocalPersistenceReady,
  resetPersistenceBootstrapSession,
} from '../bootstrap';
import { getDefaultLocalKeyValueStore } from '../localStore';
import { resetMoodlySqliteBootstrapForTests } from '../sqlite/database';
import { resetGoalsBackendCacheForTests } from '../sqlite/goalsStorageBackend';
import { resetHabitSelectionsBackendCacheForTests } from '../sqlite/habitsStorageBackend';
import { forceReimportAllSqliteFromAsyncStorage } from '../sqlite/reimportAfterRestore';
import { resetMoodEntriesBackendCacheForTests } from '../sqlite/storageBackend';
import type { MoodlyLocalExportV1 } from './moodlyLocalExport';
import { invalidateAllStorageSessionCachesAfterImport } from './importSessionReset';

function isBlockedImportKey(key: string): boolean {
  if (key.includes('.corrupt.')) return true;
  if (key.startsWith('moodly.migrationBackup.')) return true;
  return false;
}

/**
 * Writes export `kv` to AsyncStorage, clears SQLite domain caches, and re-runs bootstrap import rails.
 */
export async function applyMoodlyLocalImportV1(payload: MoodlyLocalExportV1): Promise<void> {
  await ensureLocalPersistenceReady();
  assertLocalPersistenceWritable();

  const store = getDefaultLocalKeyValueStore();
  const pairs: [string, string][] = [];
  for (const [key, value] of Object.entries(payload.kv)) {
    if (typeof key !== 'string' || !key.startsWith('moodly.')) continue;
    if (isBlockedImportKey(key)) continue;
    if (typeof value !== 'string') continue;
    pairs.push([key, value]);
  }

  if (pairs.length === 0) {
    throw new Error('[applyMoodlyLocalImportV1] No importable moodly keys in payload');
  }

  await store.multiSet(pairs);

  invalidateAllStorageSessionCachesAfterImport();
  resetMoodEntriesBackendCacheForTests();
  resetHabitSelectionsBackendCacheForTests();
  resetGoalsBackendCacheForTests();
  resetMoodlySqliteBootstrapForTests();
  resetPersistenceBootstrapSession();

  await forceReimportAllSqliteFromAsyncStorage(store);

  resetPersistenceBootstrapSession();
  await ensureLocalPersistenceReady();

  logger.perf('localImport.applied', {
    phase: 'cold',
    source: 'storage',
    keyCount: pairs.length,
  });
}
