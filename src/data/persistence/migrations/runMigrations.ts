/**
 * @fileoverview Run forward-only local schema migrations once per app version.
 * @module data/persistence/migrations/runMigrations
 */

import { logger } from '../../../lib/security/logger';
import type { KeyValueStore } from '../keyValueStore';
import { CURRENT_SCHEMA_VERSION } from '../schemaConstants';
import { readSchemaMeta, writeSchemaMeta, quarantineSchemaMeta } from '../schemaMeta';
import { MIGRATIONS } from './registry';
import { writePreMigrationBackup } from './migrationBackup';

export class DiskSchemaAheadOfAppError extends Error {
  constructor(readonly diskVersion: number, readonly appVersion: number) {
    super(`[runLocalMigrations] Disk schema ${diskVersion} is newer than app schema ${appVersion}`);
    this.name = 'DiskSchemaAheadOfAppError';
  }
}

export async function runLocalMigrations(store: KeyValueStore): Promise<void> {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && MIGRATIONS.length !== CURRENT_SCHEMA_VERSION) {
    logger.error('persistence.migrations.registryMismatch', {
      migrations: MIGRATIONS.length,
      current: CURRENT_SCHEMA_VERSION,
    });
  }

  const meta = await readSchemaMeta(store);
  let diskVersion = meta?.schemaVersion ?? 0;

  if (diskVersion > CURRENT_SCHEMA_VERSION) {
    logger.warn('persistence.migrations.diskAheadOfApp', {
      diskVersion,
      appVersion: CURRENT_SCHEMA_VERSION,
    });
    throw new DiskSchemaAheadOfAppError(diskVersion, CURRENT_SCHEMA_VERSION);
  }

  while (diskVersion < CURRENT_SCHEMA_VERSION) {
    const nextVersion = diskVersion + 1;
    const step = MIGRATIONS[diskVersion];
    if (!step) {
      logger.error('persistence.migrations.missingStep', { fromVersion: diskVersion });
      throw new Error(`[runLocalMigrations] Missing migration step ${diskVersion}→${nextVersion}`);
    }
    try {
      await writePreMigrationBackup(store, diskVersion, nextVersion);
      await step({ store, fromVersion: diskVersion, toVersion: nextVersion });
      await writeSchemaMeta(store, { schemaVersion: nextVersion });
      diskVersion = nextVersion;
      logger.perf('persistence.migration.applied', {
        phase: 'cold',
        source: 'storage',
        fromVersion: nextVersion - 1,
        toVersion: nextVersion,
      });
    } catch (e) {
      logger.error('persistence.migration.stepFailed', {
        fromVersion: diskVersion,
        toVersion: nextVersion,
        error: e,
      });
      throw e;
    }
  }
}

/** Dev/test helper: repair unreadable schema meta. */
export async function resetCorruptSchemaMeta(store: KeyValueStore): Promise<void> {
  const raw = await store.getItem('kairo.schemaMeta');
  if (typeof raw === 'string' && raw.length > 0) {
    const m = await readSchemaMeta(store);
    if (!m) await quarantineSchemaMeta(store, raw);
  }
}
