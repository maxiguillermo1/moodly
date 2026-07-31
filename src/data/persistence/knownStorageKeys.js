/**
 * @fileoverview Canonical AsyncStorage keys for Kairo user data (migration backup + export).
 * @module data/persistence/knownStorageKeys
 *
 * Keep aligned with `src/data/DATA_CONTRACT.md`. Do not import UI or repositories.
 */
import { SCHEMA_META_STORAGE_KEY } from './schemaConstants';
/** Primary keys always included in migration snapshots and export (raw values). */
export const KAIRO_PRIMARY_SNAPSHOT_KEYS = [
    SCHEMA_META_STORAGE_KEY,
    'kairo.entries',
    'kairo.settings',
    'kairo.habitSelections',
    'kairo.trackedHabits',
    'kairo.goals',
    'kairo.tasks',
    'kairo.tasks.dayIndex',
    'kairo.dayTodos',
    'kairo.insights.reflectionTiming',
    'kairo.demoSeeded',
    'kairo.demoSeedVersion',
    'kairo.entries.backend',
    'kairo.habitSelections.backend',
    'kairo.goals.backend',
];
const DAY_SHARD_PREFIX = 'kairo.tasks.day.';
/** Keys matching live reminder day shards. */
export function isKairoTasksDayShardKey(key) {
    return key.startsWith(DAY_SHARD_PREFIX) && key.length > DAY_SHARD_PREFIX.length;
}
/**
 * Full key list for a migration-time snapshot: primaries + `kairo.tasks.day.*` from
 * `kairo.tasks.dayIndex` and any extra shard keys discovered via {@link KeyValueStore.getAllKeys}.
 */
export async function collectKeysForMigrationSnapshot(store) {
    const set = new Set(KAIRO_PRIMARY_SNAPSHOT_KEYS);
    const indexRaw = await store.getItem('kairo.tasks.dayIndex');
    if (typeof indexRaw === 'string' && indexRaw.length > 0) {
        try {
            const parsed = JSON.parse(indexRaw);
            if (Array.isArray(parsed)) {
                for (const d of parsed) {
                    if (typeof d === 'string' && d.length >= 8)
                        set.add(`${DAY_SHARD_PREFIX}${d}`);
                }
            }
        }
        catch {
            /* ignore — backup still has primaries */
        }
    }
    if (typeof store.getAllKeys === 'function') {
        try {
            const all = await store.getAllKeys();
            for (const k of all) {
                if (typeof k === 'string' && isKairoTasksDayShardKey(k))
                    set.add(k);
            }
        }
        catch {
            /* optional */
        }
    }
    return [...set].sort();
}
/** Prefix for one migration backup blob (`setItem` is atomic per key). */
export const MIGRATION_BACKUP_KEY_PREFIX = 'kairo.migrationBackup.';
