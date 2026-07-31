/**
 * @fileoverview Kairo SQLite connection singleton + session bootstrap.
 * @module data/persistence/sqlite/database
 */
import { logger } from '../../../lib/security/logger';
import { KAIRO_SQLITE_DATABASE_NAME } from './schemaConstants';
import { runSqlMigrations } from './migrations/runSqlMigrations';
let dbPromise = null;
let bootstrapPromise = null;
let lastBootstrapError = null;
async function openNativeDatabase() {
    const SQLite = await import('expo-sqlite');
    const db = await SQLite.openDatabaseAsync(KAIRO_SQLITE_DATABASE_NAME);
    return db;
}
/**
 * Returns the shared Kairo SQLite handle (opens + migrates on first call).
 */
export function getKairoSqliteDatabase() {
    if (!dbPromise) {
        dbPromise = openNativeDatabase().catch((e) => {
            dbPromise = null;
            throw e;
        });
    }
    return dbPromise;
}
/** @internal Tests inject an in-memory database instead of expo-sqlite. */
export function __setKairoSqliteDatabaseForTests(db) {
    dbPromise = db ? Promise.resolve(db) : null;
    bootstrapPromise = null;
    lastBootstrapError = null;
}
export function assertKairoSqliteReady() {
    if (lastBootstrapError) {
        throw new Error('[persistence] SQLite is not ready until bootstrap succeeds');
    }
}
export async function ensureKairoSqliteReady() {
    if (!bootstrapPromise) {
        lastBootstrapError = null;
        bootstrapPromise = (async () => {
            const db = await getKairoSqliteDatabase();
            await runSqlMigrations(db);
        })().catch((e) => {
            logger.error('persistence.sqlite.bootstrap.failed', { error: e });
            lastBootstrapError = e;
            bootstrapPromise = null;
            throw e;
        });
    }
    await bootstrapPromise;
    return getKairoSqliteDatabase();
}
/** @internal Jest only */
export function resetKairoSqliteBootstrapForTests() {
    bootstrapPromise = null;
    lastBootstrapError = null;
}
