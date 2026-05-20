/**
 * @fileoverview Forward SQL migrations for Moodly local SQLite.
 * @module data/persistence/sqlite/migrations/registry
 */

import type { MoodlySqliteDatabase } from '../databaseTypes';

export type SqlMigrationContext = {
  db: MoodlySqliteDatabase;
  fromVersion: number;
  toVersion: number;
};

export type SqlMigrationStep = (ctx: SqlMigrationContext) => Promise<void>;

/** Index `k` migrates version `k` → `k + 1`. */
export const SQL_MIGRATIONS: readonly SqlMigrationStep[] = [
  async ({ db }) => {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS moodly_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mood_entries (
        date TEXT PRIMARY KEY NOT NULL,
        mood TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at_ms INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_mood_entries_updated ON mood_entries(updated_at_ms DESC);
      CREATE INDEX IF NOT EXISTS idx_mood_entries_year_month ON mood_entries(substr(date, 1, 7));
    `);
  },
  async ({ db }) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS habit_selections (
        date TEXT NOT NULL,
        habit_id TEXT NOT NULL,
        PRIMARY KEY (date, habit_id)
      );
      CREATE INDEX IF NOT EXISTS idx_habit_selections_date ON habit_selections(date);
    `);
  },
  async ({ db }) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS goal_progress (
        goal_id TEXT NOT NULL,
        date TEXT NOT NULL,
        value REAL NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at_ms INTEGER NOT NULL,
        PRIMARY KEY (goal_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_goal_progress_goal ON goal_progress(goal_id);
    `);
  },
];
