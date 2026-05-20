/**
 * @fileoverview Minimal SQLite surface used by Moodly persistence (mockable in Jest).
 * @module data/persistence/sqlite/databaseTypes
 */

/** Subset of expo-sqlite {@link SQLiteDatabase} used by Moodly stores. */
export type MoodlySqliteDatabase = {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: unknown[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
};
