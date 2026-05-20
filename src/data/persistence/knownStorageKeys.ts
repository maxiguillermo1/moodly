/**
 * @fileoverview Canonical AsyncStorage keys for Moodly user data (migration backup + export).
 * @module data/persistence/knownStorageKeys
 *
 * Keep aligned with `src/data/DATA_CONTRACT.md`. Do not import UI or repositories.
 */

import type { KeyValueStore } from './keyValueStore';
import { SCHEMA_META_STORAGE_KEY } from './schemaConstants';

/** Primary keys always included in migration snapshots and export (raw values). */
export const MOODLY_PRIMARY_SNAPSHOT_KEYS: readonly string[] = [
  SCHEMA_META_STORAGE_KEY,
  'moodly.entries',
  'moodly.settings',
  'moodly.habitSelections',
  'moodly.trackedHabits',
  'moodly.goals',
  'moodly.tasks',
  'moodly.tasks.dayIndex',
  'moodly.dayTodos',
  'moodly.insights.reflectionTiming',
  'moodly.demoSeeded',
  'moodly.demoSeedVersion',
  'moodly.entries.backend',
  'moodly.habitSelections.backend',
  'moodly.goals.backend',
] as const;

const DAY_SHARD_PREFIX = 'moodly.tasks.day.';

/** Keys matching live reminder day shards. */
export function isMoodlyTasksDayShardKey(key: string): boolean {
  return key.startsWith(DAY_SHARD_PREFIX) && key.length > DAY_SHARD_PREFIX.length;
}

type StoreForSnapshot = Pick<KeyValueStore, 'getItem' | 'multiGet'> & {
  getAllKeys?: () => Promise<readonly string[]>;
};

/**
 * Full key list for a migration-time snapshot: primaries + `moodly.tasks.day.*` from
 * `moodly.tasks.dayIndex` and any extra shard keys discovered via {@link KeyValueStore.getAllKeys}.
 */
export async function collectKeysForMigrationSnapshot(store: StoreForSnapshot): Promise<string[]> {
  const set = new Set<string>(MOODLY_PRIMARY_SNAPSHOT_KEYS);

  const indexRaw = await store.getItem('moodly.tasks.dayIndex');
  if (typeof indexRaw === 'string' && indexRaw.length > 0) {
    try {
      const parsed = JSON.parse(indexRaw) as unknown;
      if (Array.isArray(parsed)) {
        for (const d of parsed) {
          if (typeof d === 'string' && d.length >= 8) set.add(`${DAY_SHARD_PREFIX}${d}`);
        }
      }
    } catch {
      /* ignore — backup still has primaries */
    }
  }

  if (typeof store.getAllKeys === 'function') {
    try {
      const all = await store.getAllKeys();
      for (const k of all) {
        if (typeof k === 'string' && isMoodlyTasksDayShardKey(k)) set.add(k);
      }
    } catch {
      /* optional */
    }
  }

  return [...set].sort();
}

/** Prefix for one migration backup blob (`setItem` is atomic per key). */
export const MIGRATION_BACKUP_KEY_PREFIX = 'moodly.migrationBackup.' as const;
