/**
 * @fileoverview Moodly SQLite connection singleton + session bootstrap.
 * @module data/persistence/sqlite/database
 */

import { logger } from '../../../lib/security/logger';
import type { MoodlySqliteDatabase } from './databaseTypes';
import { MOODLY_SQLITE_DATABASE_NAME } from './schemaConstants';
import { runSqlMigrations } from './migrations/runSqlMigrations';

let dbPromise: Promise<MoodlySqliteDatabase> | null = null;
let bootstrapPromise: Promise<void> | null = null;
let lastBootstrapError: unknown = null;

async function openNativeDatabase(): Promise<MoodlySqliteDatabase> {
  const SQLite = await import('expo-sqlite');
  const db = await SQLite.openDatabaseAsync(MOODLY_SQLITE_DATABASE_NAME);
  return db as unknown as MoodlySqliteDatabase;
}

/**
 * Returns the shared Moodly SQLite handle (opens + migrates on first call).
 */
export function getMoodlySqliteDatabase(): Promise<MoodlySqliteDatabase> {
  if (!dbPromise) {
    dbPromise = openNativeDatabase().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

/** @internal Tests inject an in-memory database instead of expo-sqlite. */
export function __setMoodlySqliteDatabaseForTests(db: MoodlySqliteDatabase | null): void {
  dbPromise = db ? Promise.resolve(db) : null;
  bootstrapPromise = null;
  lastBootstrapError = null;
}

export function assertMoodlySqliteReady(): void {
  if (lastBootstrapError) {
    throw new Error('[persistence] SQLite is not ready until bootstrap succeeds');
  }
}

export async function ensureMoodlySqliteReady(): Promise<MoodlySqliteDatabase> {
  if (!bootstrapPromise) {
    lastBootstrapError = null;
    bootstrapPromise = (async () => {
      const db = await getMoodlySqliteDatabase();
      await runSqlMigrations(db);
    })().catch((e) => {
      logger.error('persistence.sqlite.bootstrap.failed', { error: e });
      lastBootstrapError = e;
      bootstrapPromise = null;
      throw e;
    });
  }
  await bootstrapPromise;
  return getMoodlySqliteDatabase();
}

/** @internal Jest only */
export function resetMoodlySqliteBootstrapForTests(): void {
  bootstrapPromise = null;
  lastBootstrapError = null;
}
