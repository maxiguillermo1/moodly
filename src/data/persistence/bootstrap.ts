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

let bootstrapPromise: Promise<void> | null = null;
let lastBootstrapError: unknown = null;

async function runBootstrap(): Promise<void> {
  const store = getDefaultLocalKeyValueStore();
  await resetCorruptSchemaMeta(store);
  await runLocalMigrations(store);
}

/**
 * Idempotent: safe to call from every storage entrypoint; runs migrations at most once per session
 * (unless {@link resetPersistenceBootstrapForTests} is used in unit tests).
 */
export function ensureLocalPersistenceReady(): Promise<void> {
  if (!bootstrapPromise) {
    lastBootstrapError = null;
    bootstrapPromise = runBootstrap().catch((e) => {
      logger.error('persistence.bootstrap.failed', { error: e });
      lastBootstrapError = e;
      bootstrapPromise = null;
      // Keep reads recoverable via caller fallbacks, but never let writes proceed
      // after a failed migration/bootstrap. The next storage entrypoint retries.
      throw e;
    });
  }
  return bootstrapPromise;
}

export function assertLocalPersistenceWritable(): void {
  if (lastBootstrapError) {
    throw new Error('[persistence] Local persistence is not writable until bootstrap succeeds');
  }
}

export type PersistenceDiagnostics = {
  schemaVersion: number | null;
  appTargetVersion: number;
};

export async function getPersistenceDiagnostics(): Promise<PersistenceDiagnostics> {
  const store = getDefaultLocalKeyValueStore();
  const meta = await readSchemaMeta(store);
  return {
    schemaVersion: meta?.schemaVersion ?? null,
    appTargetVersion: CURRENT_SCHEMA_VERSION,
  };
}

/** @internal Jest only — clears the session singleton. */
export function resetPersistenceBootstrapForTests(): void {
  bootstrapPromise = null;
  lastBootstrapError = null;
}
