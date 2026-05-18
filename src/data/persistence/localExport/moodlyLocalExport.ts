/**
 * @fileoverview Internal full-device export envelope (no UI). For backup tools, support, and tests.
 * @module data/persistence/localExport/moodlyLocalExport
 *
 * **Not** a sync protocol — local JSON snapshot of raw `moodly.*` keys (excluding `.corrupt.*` by default).
 */

import { logger } from '../../../lib/security/logger';
import type { KeyValueStore } from '../keyValueStore';
import { MOODLY_PRIMARY_SNAPSHOT_KEYS } from '../knownStorageKeys';

export const MOODLY_LOCAL_EXPORT_KIND = 'moodly.localExport.v1' as const;
export const MOODLY_LOCAL_EXPORT_FORMAT_REVISION = 1 as const;

/** Soft cap — refuse to stringify beyond this (memory / IPC safety). */
export const MOODLY_LOCAL_EXPORT_MAX_APPROX_BYTES = 48 * 1024 * 1024;

export type MoodlyLocalExportV1 = {
  readonly kind: typeof MOODLY_LOCAL_EXPORT_KIND;
  readonly formatRevision: typeof MOODLY_LOCAL_EXPORT_FORMAT_REVISION;
  readonly exportedAtMs: number;
  /** App schema rail at export time (may be null if meta missing). */
  readonly schemaMetaRaw: string | null;
  /** Raw key → raw string value (AsyncStorage layer). */
  readonly kv: Record<string, string>;
};

type StoreWithKeys = KeyValueStore & { getAllKeys: () => Promise<readonly string[]> };

function exportableMoodlyKey(key: string, opts: { includeCorrupt: boolean; includeMigrationBackups: boolean }): boolean {
  if (!key.startsWith('moodly.')) return false;
  if (!opts.includeCorrupt && key.includes('.corrupt.')) return false;
  if (!opts.includeMigrationBackups && key.startsWith('moodly.migrationBackup.')) return false;
  return true;
}

/**
 * Collects all matching `moodly.*` keys from the store. Requires {@link KeyValueStore.getAllKeys}.
 */
export async function buildMoodlyLocalExportV1(
  store: StoreWithKeys,
  options?: { includeCorrupt?: boolean; includeMigrationBackups?: boolean }
): Promise<MoodlyLocalExportV1> {
  const includeCorrupt = options?.includeCorrupt === true;
  const includeMigrationBackups = options?.includeMigrationBackups === true;
  const allKeys = await store.getAllKeys();
  const want = new Set<string>();
  for (const k of MOODLY_PRIMARY_SNAPSHOT_KEYS) want.add(k);
  for (const k of allKeys) {
    if (typeof k === 'string' && exportableMoodlyKey(k, { includeCorrupt, includeMigrationBackups })) {
      want.add(k);
    }
  }
  const sorted = [...want].sort();
  const pairs = await store.multiGet(sorted);
  const kv: Record<string, string> = {};
  let approx = 0;
  for (const [k, v] of pairs) {
    if (v == null) continue;
    approx += k.length + v.length;
    if (approx > MOODLY_LOCAL_EXPORT_MAX_APPROX_BYTES) {
      logger.warn('localExport.size.cap', { approxBytes: approx, keyCount: sorted.length });
      throw new Error('[buildMoodlyLocalExportV1] Export size exceeds internal cap');
    }
    kv[k] = v;
  }
  const schemaMetaRaw = kv['moodly.schemaMeta'] ?? null;
  return {
    kind: MOODLY_LOCAL_EXPORT_KIND,
    formatRevision: MOODLY_LOCAL_EXPORT_FORMAT_REVISION,
    exportedAtMs: Date.now(),
    schemaMetaRaw,
    kv,
  };
}

export function serializeMoodlyLocalExport(payload: MoodlyLocalExportV1): string {
  return JSON.stringify(payload);
}

export type MoodlyLocalExportValidation =
  | { ok: true; value: MoodlyLocalExportV1 }
  | { ok: false; errors: readonly string[] };

export function validateMoodlyLocalExportPayload(raw: unknown): MoodlyLocalExportValidation {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push('root_not_object');
    return { ok: false, errors };
  }
  const o = raw as Record<string, unknown>;
  if (o.kind !== MOODLY_LOCAL_EXPORT_KIND) errors.push('bad_kind');
  if (o.formatRevision !== MOODLY_LOCAL_EXPORT_FORMAT_REVISION) errors.push('bad_formatRevision');
  if (typeof o.exportedAtMs !== 'number' || !Number.isFinite(o.exportedAtMs)) errors.push('bad_exportedAtMs');
  const kv = o.kv;
  if (!kv || typeof kv !== 'object' || Array.isArray(kv)) {
    errors.push('bad_kv');
  } else {
    for (const [k, v] of Object.entries(kv)) {
      if (typeof k !== 'string' || !k.startsWith('moodly.')) errors.push(`bad_kv_key:${k}`);
      if (typeof v !== 'string') errors.push(`bad_kv_value_type:${k}`);
    }
  }
  if (o.schemaMetaRaw != null && typeof o.schemaMetaRaw !== 'string') errors.push('bad_schemaMetaRaw');
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      kind: MOODLY_LOCAL_EXPORT_KIND,
      formatRevision: MOODLY_LOCAL_EXPORT_FORMAT_REVISION,
      exportedAtMs: o.exportedAtMs as number,
      schemaMetaRaw: (o.schemaMetaRaw ?? null) as string | null,
      kv: kv as Record<string, string>,
    },
  };
}

export function parseMoodlyLocalExportJson(json: string): MoodlyLocalExportValidation {
  try {
    const raw = JSON.parse(json) as unknown;
    return validateMoodlyLocalExportPayload(raw);
  } catch {
    return { ok: false, errors: ['json_parse_failed'] };
  }
}
