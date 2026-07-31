/**
 * @fileoverview One-time local persistence bootstrap (schema migrations).
 * @module data/persistence/bootstrap
 *
 * All cold storage reads await this first so migrations always run before payloads load.
 */
import { logger } from '../../lib/security/logger';
import { getDefaultLocalKeyValueStore } from './localStore';
import { runLocalMigrations, resetCorruptSchemaMeta } from './migrations/runMigrations';
import { CURRENT_SCHEMA_VERSION } from './schemaConstants';
import { readSchemaMeta } from './schemaMeta';
import { ensureMoodEntriesImportedFromAsyncStorage } from './sqlite/storageBackend';
import { ensureHabitSelectionsImportedFromAsyncStorage } from './sqlite/habitsStorageBackend';
import { ensureGoalsImportedFromAsyncStorage } from './sqlite/goalsStorageBackend';
let bootstrapPromise = null;
let lastBootstrapError = null;
async function runBootstrap() {
    const store = getDefaultLocalKeyValueStore();
    await resetCorruptSchemaMeta(store);
    await runLocalMigrations(store);
    await ensureMoodEntriesImportedFromAsyncStorage(store);
    await ensureHabitSelectionsImportedFromAsyncStorage(store);
    await ensureGoalsImportedFromAsyncStorage(store);
}
const BOOTSTRAP_RETRY_ATTEMPTS = 3;
async function runBootstrapWithRetry() {
    let lastError = null;
    for (let attempt = 0; attempt < BOOTSTRAP_RETRY_ATTEMPTS; attempt += 1) {
        try {
            await runBootstrap();
            return;
        }
        catch (e) {
            lastError = e;
            if (attempt < BOOTSTRAP_RETRY_ATTEMPTS - 1) {
                await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
            }
        }
    }
    throw lastError;
}
/**
 * Idempotent: safe to call from every storage entrypoint; runs migrations at most once per session
 * (unless {@link resetPersistenceBootstrapForTests} is used in unit tests).
 */
export function ensureLocalPersistenceReady() {
    if (!bootstrapPromise) {
        lastBootstrapError = null;
        bootstrapPromise = runBootstrapWithRetry().catch((e) => {
            logger.error('persistence.bootstrap.failed', { error: e });
            lastBootstrapError = e;
            bootstrapPromise = null;
            throw e;
        });
    }
    return bootstrapPromise;
}
export function assertLocalPersistenceWritable() {
    if (lastBootstrapError) {
        throw new Error('[persistence] Local persistence is not writable until bootstrap succeeds');
    }
}
export async function getPersistenceDiagnostics() {
    const store = getDefaultLocalKeyValueStore();
    const meta = await readSchemaMeta(store);
    return {
        schemaVersion: meta?.schemaVersion ?? null,
        appTargetVersion: CURRENT_SCHEMA_VERSION,
    };
}
/** @internal Jest only — clears the session singleton. */
export function resetPersistenceBootstrapForTests() {
    bootstrapPromise = null;
    lastBootstrapError = null;
}
/** Clears bootstrap session state so the next storage call re-runs migrations/import (import restore). */
export function resetPersistenceBootstrapSession() {
    resetPersistenceBootstrapForTests();
}
