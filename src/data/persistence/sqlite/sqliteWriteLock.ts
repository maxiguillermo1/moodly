/**
 * @fileoverview Process-wide mutex for Kairo SQLite writes.
 * @module data/persistence/sqlite/sqliteWriteLock
 *
 * Domain storage modules each have their own write queue, but mood, habits, and goals
 * share one SQLite connection. `withTransactionAsync` must not overlap across domains.
 */

import type { KairoSqliteDatabase } from './databaseTypes';

let writeTail: Promise<void> = Promise.resolve();
let writeLockDepth = 0;
let sqliteTxDepth = 0;

/** Serializes all SQLite mutating work on the shared connection. */
export async function withKairoSqliteWriteLock<T>(op: () => Promise<T>): Promise<T> {
  const prev = writeTail;
  let release!: () => void;
  writeTail = new Promise<void>((r) => {
    release = r;
  });
  await prev;
  writeLockDepth += 1;
  try {
    return await op();
  } finally {
    writeLockDepth -= 1;
    release();
  }
}

export async function runInKairoSqliteTransaction(
  db: KairoSqliteDatabase,
  task: () => Promise<void>
): Promise<void> {
  if (sqliteTxDepth > 0) {
    await task();
    return;
  }

  await withKairoSqliteWriteLock(async () => {
    if (sqliteTxDepth > 0) {
      await task();
      return;
    }
    await db.withTransactionAsync(async () => {
      sqliteTxDepth += 1;
      try {
        await task();
      } finally {
        sqliteTxDepth -= 1;
      }
    });
  });
}

/** @internal Jest only */
export function resetKairoSqliteWriteLockForTests(): void {
  writeTail = Promise.resolve();
  writeLockDepth = 0;
  sqliteTxDepth = 0;
}

/** @internal Jest only */
export function getSqliteTxDepthForTests(): number {
  return sqliteTxDepth;
}

/** @internal Jest only */
export function getWriteLockDepthForTests(): number {
  return writeLockDepth;
}
