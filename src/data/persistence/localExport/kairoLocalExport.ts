/**
 * @fileoverview Internal full-device export envelope (no UI). For backup tools, support, and tests.
 * @module data/persistence/localExport/kairoLocalExport
 *
 * **Not** a sync protocol — local JSON snapshot of raw `kairo.*` keys (excluding `.corrupt.*` by default).
 */

import { logger } from '../../../lib/security/logger';
import type { KeyValueStore } from '../keyValueStore';
import { KAIRO_PRIMARY_SNAPSHOT_KEYS } from '../knownStorageKeys';

export const KAIRO_LOCAL_EXPORT_KIND = 'kairo.localExport.v1' as const;
/** Pre-rename export envelope (import-only). */
export const LEGACY_MOODLY_LOCAL_EXPORT_KIND = 'moodly.localExport.v1' as const;
export const KAIRO_LOCAL_EXPORT_FORMAT_REVISION = 1 as const;

/** Soft cap — refuse to stringify beyond this (memory / IPC safety). */
export const KAIRO_LOCAL_EXPORT_MAX_APPROX_BYTES = 48 * 1024 * 1024;

export type KairoLocalExportV1 = {
  readonly kind: typeof KAIRO_LOCAL_EXPORT_KIND;
  readonly formatRevision: typeof KAIRO_LOCAL_EXPORT_FORMAT_REVISION;
  readonly exportedAtMs: number;
  /** App schema rail at export time (may be null if meta missing). */
  readonly schemaMetaRaw: string | null;
  /** Raw key → raw string value (AsyncStorage layer). */
  readonly kv: Record<string, string>;
};

type StoreWithKeys = KeyValueStore & { getAllKeys: () => Promise<readonly string[]> };

function toKairoStorageKey(key: string): string | null {
  if (key.startsWith('kairo.')) return key;
  if (key.startsWith('moodly.')) return `kairo.${key.slice('moodly.'.length)}`;
  return null;
}

function exportableKairoKey(key: string, opts: { includeCorrupt: boolean; includeMigrationBackups: boolean }): boolean {
  if (!key.startsWith('kairo.')) return false;
  if (!opts.includeCorrupt && key.includes('.corrupt.')) return false;
  if (!opts.includeMigrationBackups && key.startsWith('kairo.migrationBackup.')) return false;
  return true;
}

/**
 * Collects all matching `kairo.*` keys from the store. Requires {@link KeyValueStore.getAllKeys}.
 */
export async function buildKairoLocalExportV1(
  store: StoreWithKeys,
  options?: { includeCorrupt?: boolean; includeMigrationBackups?: boolean }
): Promise<KairoLocalExportV1> {
  const includeCorrupt = options?.includeCorrupt === true;
  const includeMigrationBackups = options?.includeMigrationBackups === true;
  const allKeys = await store.getAllKeys();
  const want = new Set<string>();
  for (const k of KAIRO_PRIMARY_SNAPSHOT_KEYS) want.add(k);
  for (const k of allKeys) {
    if (typeof k === 'string' && exportableKairoKey(k, { includeCorrupt, includeMigrationBackups })) {
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
    if (approx > KAIRO_LOCAL_EXPORT_MAX_APPROX_BYTES) {
      logger.warn('localExport.size.cap', { approxBytes: approx, keyCount: sorted.length });
      throw new Error('[buildKairoLocalExportV1] Export size exceeds internal cap');
    }
    kv[k] = v;
  }
  const schemaMetaRaw = kv['kairo.schemaMeta'] ?? null;
  return {
    kind: KAIRO_LOCAL_EXPORT_KIND,
    formatRevision: KAIRO_LOCAL_EXPORT_FORMAT_REVISION,
    exportedAtMs: Date.now(),
    schemaMetaRaw,
    kv,
  };
}

export function serializeKairoLocalExport(payload: KairoLocalExportV1): string {
  return JSON.stringify(payload);
}

export type KairoLocalExportValidation =
  | { ok: true; value: KairoLocalExportV1 }
  | { ok: false; errors: readonly string[] };

export function validateKairoLocalExportPayload(raw: unknown): KairoLocalExportValidation {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push('root_not_object');
    return { ok: false, errors };
  }
  const o = raw as Record<string, unknown>;
  const kind = o.kind;
  if (kind !== KAIRO_LOCAL_EXPORT_KIND && kind !== LEGACY_MOODLY_LOCAL_EXPORT_KIND) errors.push('bad_kind');
  if (o.formatRevision !== KAIRO_LOCAL_EXPORT_FORMAT_REVISION) errors.push('bad_formatRevision');
  if (typeof o.exportedAtMs !== 'number' || !Number.isFinite(o.exportedAtMs)) errors.push('bad_exportedAtMs');
  const kv = o.kv;
  const normalizedKv: Record<string, string> = {};
  if (!kv || typeof kv !== 'object' || Array.isArray(kv)) {
    errors.push('bad_kv');
  } else {
    for (const [k, v] of Object.entries(kv)) {
      const mapped = toKairoStorageKey(k);
      if (!mapped) {
        errors.push(`bad_kv_key:${k}`);
        continue;
      }
      if (typeof v !== 'string') errors.push(`bad_kv_value_type:${k}`);
      else normalizedKv[mapped] = v;
    }
  }
  if (o.schemaMetaRaw != null && typeof o.schemaMetaRaw !== 'string') errors.push('bad_schemaMetaRaw');
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      kind: KAIRO_LOCAL_EXPORT_KIND,
      formatRevision: KAIRO_LOCAL_EXPORT_FORMAT_REVISION,
      exportedAtMs: o.exportedAtMs as number,
      schemaMetaRaw: (o.schemaMetaRaw ?? null) as string | null,
      kv: normalizedKv,
    },
  };
}

export function parseKairoLocalExportJson(json: string): KairoLocalExportValidation {
  try {
    const raw = JSON.parse(json) as unknown;
    return validateKairoLocalExportPayload(raw);
  } catch {
    return { ok: false, errors: ['json_parse_failed'] };
  }
}
