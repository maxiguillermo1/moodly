/**
 * @fileoverview Read/write local schema metadata (version stamp for migrations).
 * @module data/persistence/schemaMeta
 */

import { logger } from '../../lib/security/logger';
import type { KeyValueStore } from './keyValueStore';
import { CURRENT_SCHEMA_VERSION, SCHEMA_META_STORAGE_KEY } from './schemaConstants';

export type SchemaMeta = {
  schemaVersion: number;
  /** When this device last ran migrations to `schemaVersion` (unix ms). */
  migratedAt?: number;
};

function isSchemaVersionField(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n === Math.floor(n) && n >= 1;
}

export async function readSchemaMeta(store: KeyValueStore): Promise<SchemaMeta | null> {
  try {
    const raw = await store.getItem(SCHEMA_META_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const o = parsed as Record<string, unknown>;
    if (!isSchemaVersionField(o.schemaVersion)) return null;
    const migratedAt =
      o.migratedAt != null && typeof o.migratedAt === 'number' && Number.isFinite(o.migratedAt)
        ? Math.floor(o.migratedAt)
        : undefined;
    return { schemaVersion: o.schemaVersion, migratedAt };
  } catch {
    logger.warn('persistence.schemaMeta.parse.failed', { key: SCHEMA_META_STORAGE_KEY });
    return null;
  }
}

export async function writeSchemaMeta(
  store: KeyValueStore,
  meta: Pick<SchemaMeta, 'schemaVersion'> & { migratedAt?: number }
): Promise<void> {
  const payload: SchemaMeta = {
    schemaVersion: meta.schemaVersion,
    migratedAt: meta.migratedAt ?? Date.now(),
  };
  await store.setItem(SCHEMA_META_STORAGE_KEY, JSON.stringify(payload));
}

export async function quarantineSchemaMeta(store: KeyValueStore, rawJson: string): Promise<void> {
  const ts = Date.now();
  try {
    await store.setItem(`${SCHEMA_META_STORAGE_KEY}.corrupt.${ts}`, rawJson);
  } catch (e) {
    logger.warn('persistence.schemaMeta.quarantine.failed', { error: e });
  }
}

export { CURRENT_SCHEMA_VERSION };
