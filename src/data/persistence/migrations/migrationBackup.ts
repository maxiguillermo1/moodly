/**
 * @fileoverview Pre-migration full snapshot (single-key JSON blob) for recovery forensics.
 * @module data/persistence/migrations/migrationBackup
 */

import { logger } from '../../../lib/security/logger';
import type { KeyValueStore } from '../keyValueStore';
import { collectKeysForMigrationSnapshot, MIGRATION_BACKUP_KEY_PREFIX } from '../knownStorageKeys';

export const MIGRATION_BACKUP_ENVELOPE_KIND = 'kairo.migrationBackup.v1' as const;

export type MigrationBackupEnvelopeV1 = {
  readonly kind: typeof MIGRATION_BACKUP_ENVELOPE_KIND;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly createdAtMs: number;
  /** Raw AsyncStorage string values (typically JSON text); `null` means key absent. */
  readonly snapshot: Record<string, string | null>;
};

/**
 * Writes one backup **before** applying the migration step `fromVersion` → `toVersion`.
 * Uses a new timestamped key so reruns / dev retries do not overwrite prior backups.
 */
export async function writePreMigrationBackup(
  store: KeyValueStore,
  fromVersion: number,
  toVersion: number
): Promise<void> {
  const keys = await collectKeysForMigrationSnapshot(store);
  const pairs = await store.multiGet(keys);
  const snapshot: Record<string, string | null> = {};
  for (const [k, v] of pairs) {
    snapshot[k] = v;
  }
  const envelope: MigrationBackupEnvelopeV1 = {
    kind: MIGRATION_BACKUP_ENVELOPE_KIND,
    fromVersion,
    toVersion,
    createdAtMs: Date.now(),
    snapshot,
  };
  const backupKey = `${MIGRATION_BACKUP_KEY_PREFIX}${fromVersion}_to_${toVersion}.${envelope.createdAtMs}`;
  await store.setItem(backupKey, JSON.stringify(envelope));
  logger.perf('persistence.migration.backup.written', {
    fromVersion,
    toVersion,
    keyCount: keys.length,
  });
}

export function parseMigrationBackupEnvelope(raw: string | null): MigrationBackupEnvelopeV1 | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const o = JSON.parse(raw) as MigrationBackupEnvelopeV1;
    if (!o || typeof o !== 'object') return null;
    if (o.kind !== MIGRATION_BACKUP_ENVELOPE_KIND) return null;
    if (typeof o.fromVersion !== 'number' || typeof o.toVersion !== 'number' || typeof o.createdAtMs !== 'number')
      return null;
    if (!o.snapshot || typeof o.snapshot !== 'object' || Array.isArray(o.snapshot)) return null;
    return o;
  } catch {
    return null;
  }
}
