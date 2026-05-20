/**
 * @fileoverview Restore a validated local export envelope (AsyncStorage + SQLite re-import).
 * @module data/persistence/localExport/applyKairoLocalImport
 */

import { logger } from '../../../lib/security/logger';
import {
  assertLocalPersistenceWritable,
  ensureLocalPersistenceReady,
  resetPersistenceBootstrapSession,
} from '../bootstrap';
import { getDefaultLocalKeyValueStore } from '../localStore';
import { resetKairoSqliteBootstrapForTests } from '../sqlite/database';
import { resetGoalsBackendCacheForTests } from '../sqlite/goalsStorageBackend';
import { resetHabitSelectionsBackendCacheForTests } from '../sqlite/habitsStorageBackend';
import { forceReimportAllSqliteFromAsyncStorage } from '../sqlite/reimportAfterRestore';
import { resetMoodEntriesBackendCacheForTests } from '../sqlite/storageBackend';
import type { KairoLocalExportV1 } from './kairoLocalExport';
import { invalidateAllStorageSessionCachesAfterImport } from './importSessionReset';

function isBlockedImportKey(key: string): boolean {
  if (key.includes('.corrupt.')) return true;
  if (key.startsWith('kairo.migrationBackup.')) return true;
  return false;
}

/**
 * Writes export `kv` to AsyncStorage, clears SQLite domain caches, and re-runs bootstrap import rails.
 */
export async function applyKairoLocalImportV1(payload: KairoLocalExportV1): Promise<void> {
  await ensureLocalPersistenceReady();
  assertLocalPersistenceWritable();

  const store = getDefaultLocalKeyValueStore();
  const pairs: [string, string][] = [];
  for (const [key, value] of Object.entries(payload.kv)) {
    if (typeof key !== 'string' || !key.startsWith('kairo.')) continue;
    if (isBlockedImportKey(key)) continue;
    if (typeof value !== 'string') continue;
    pairs.push([key, value]);
  }

  if (pairs.length === 0) {
    throw new Error('[applyKairoLocalImportV1] No importable kairo keys in payload');
  }

  await store.multiSet(pairs);

  invalidateAllStorageSessionCachesAfterImport();
  resetMoodEntriesBackendCacheForTests();
  resetHabitSelectionsBackendCacheForTests();
  resetGoalsBackendCacheForTests();
  resetKairoSqliteBootstrapForTests();
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
