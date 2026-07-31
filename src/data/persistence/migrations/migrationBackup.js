/**
 * @fileoverview Pre-migration full snapshot (single-key JSON blob) for recovery forensics.
 * @module data/persistence/migrations/migrationBackup
 */
import { logger } from '../../../lib/security/logger';
import { collectKeysForMigrationSnapshot, MIGRATION_BACKUP_KEY_PREFIX } from '../knownStorageKeys';
export const MIGRATION_BACKUP_ENVELOPE_KIND = 'kairo.migrationBackup.v1';
/**
 * Writes one backup **before** applying the migration step `fromVersion` → `toVersion`.
 * Uses a new timestamped key so reruns / dev retries do not overwrite prior backups.
 */
export async function writePreMigrationBackup(store, fromVersion, toVersion) {
    const keys = await collectKeysForMigrationSnapshot(store);
    const pairs = await store.multiGet(keys);
    const snapshot = {};
    for (const [k, v] of pairs) {
        snapshot[k] = v;
    }
    const envelope = {
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
export function parseMigrationBackupEnvelope(raw) {
    if (!raw || typeof raw !== 'string')
        return null;
    try {
        const o = JSON.parse(raw);
        if (!o || typeof o !== 'object')
            return null;
        if (o.kind !== MIGRATION_BACKUP_ENVELOPE_KIND)
            return null;
        if (typeof o.fromVersion !== 'number' || typeof o.toVersion !== 'number' || typeof o.createdAtMs !== 'number')
            return null;
        if (!o.snapshot || typeof o.snapshot !== 'object' || Array.isArray(o.snapshot))
            return null;
        return o;
    }
    catch {
        return null;
    }
}
