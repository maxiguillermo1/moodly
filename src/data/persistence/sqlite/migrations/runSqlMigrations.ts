/**
 * @fileoverview Run forward-only SQLite schema migrations once per session.
 * @module data/persistence/sqlite/migrations/runSqlMigrations
 */

import { logger } from '../../../../lib/security/logger';
import type { MoodlySqliteDatabase } from '../databaseTypes';
import { CURRENT_SQL_SCHEMA_VERSION } from '../schemaConstants';
import { SQL_MIGRATIONS } from './registry';

export async function readSqlUserVersion(db: MoodlySqliteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

async function writeSqlUserVersion(db: MoodlySqliteDatabase, version: number): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${version}`);
}

export async function runSqlMigrations(db: MoodlySqliteDatabase): Promise<void> {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && SQL_MIGRATIONS.length !== CURRENT_SQL_SCHEMA_VERSION) {
    logger.error('persistence.sqlite.migrations.registryMismatch', {
      migrations: SQL_MIGRATIONS.length,
      current: CURRENT_SQL_SCHEMA_VERSION,
    });
  }

  let diskVersion = await readSqlUserVersion(db);

  if (diskVersion > CURRENT_SQL_SCHEMA_VERSION) {
    logger.warn('persistence.sqlite.migrations.diskAheadOfApp', {
      diskVersion,
      appVersion: CURRENT_SQL_SCHEMA_VERSION,
    });
    throw new Error(
      `[runSqlMigrations] Disk SQL schema ${diskVersion} is newer than app schema ${CURRENT_SQL_SCHEMA_VERSION}`
    );
  }

  while (diskVersion < CURRENT_SQL_SCHEMA_VERSION) {
    const nextVersion = diskVersion + 1;
    const step = SQL_MIGRATIONS[diskVersion];
    if (!step) {
      logger.error('persistence.sqlite.migrations.missingStep', { fromVersion: diskVersion });
      throw new Error(`[runSqlMigrations] Missing SQL migration step ${diskVersion}→${nextVersion}`);
    }
    try {
      await step({ db, fromVersion: diskVersion, toVersion: nextVersion });
      await writeSqlUserVersion(db, nextVersion);
      diskVersion = nextVersion;
      logger.perf('persistence.sqlite.migration.applied', {
        phase: 'cold',
        source: 'storage',
        fromVersion: nextVersion - 1,
        toVersion: nextVersion,
      });
    } catch (e) {
      logger.error('persistence.sqlite.migration.stepFailed', {
        fromVersion: diskVersion,
        toVersion: nextVersion,
        error: e,
      });
      throw e;
    }
  }
}
