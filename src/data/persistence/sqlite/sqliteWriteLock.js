/**
 * @fileoverview Process-wide mutex for Kairo SQLite writes.
 * @module data/persistence/sqlite/sqliteWriteLock
 *
 * Domain storage modules each have their own write queue, but mood, habits, and goals
 * share one SQLite connection. `withTransactionAsync` must not overlap across domains.
 */
let writeTail = Promise.resolve();
let writeLockDepth = 0;
let sqliteTxDepth = 0;
/** Serializes all SQLite mutating work on the shared connection. */
export async function withKairoSqliteWriteLock(op) {
    const prev = writeTail;
    let release;
    writeTail = new Promise((r) => {
        release = r;
    });
    await prev;
    writeLockDepth += 1;
    try {
        return await op();
    }
    finally {
        writeLockDepth -= 1;
        release();
    }
}
export async function runInKairoSqliteTransaction(db, task) {
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
            }
            finally {
                sqliteTxDepth -= 1;
            }
        });
    });
}
/** @internal Jest only */
export function resetKairoSqliteWriteLockForTests() {
    writeTail = Promise.resolve();
    writeLockDepth = 0;
    sqliteTxDepth = 0;
}
/** @internal Jest only */
export function getSqliteTxDepthForTests() {
    return sqliteTxDepth;
}
/** @internal Jest only */
export function getWriteLockDepthForTests() {
    return writeLockDepth;
}
