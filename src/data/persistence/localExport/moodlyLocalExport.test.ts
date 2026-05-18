/**
 * @fileoverview Tests for internal local export envelope (no UI).
 * @module data/persistence/localExport/moodlyLocalExport.test
 */

import type { KeyValueStore } from '../keyValueStore';
import {
  buildMoodlyLocalExportV1,
  parseMoodlyLocalExportJson,
  validateMoodlyLocalExportPayload,
  MOODLY_LOCAL_EXPORT_KIND,
} from './moodlyLocalExport';

function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore & {
  getAllKeys: () => Promise<readonly string[]>;
} {
  const m: Record<string, string> = { ...initial };
  return {
    getItem: async (key) => (Object.prototype.hasOwnProperty.call(m, key) ? m[key]! : null),
    setItem: async (key, value) => {
      m[key] = value;
    },
    removeItem: async (key) => {
      delete m[key];
    },
    multiGet: async (keys) =>
      keys.map((key) => [key, Object.prototype.hasOwnProperty.call(m, key) ? m[key]! : null] as const),
    multiSet: async (pairs) => {
      for (const [k, v] of pairs) m[k] = v;
    },
    multiRemove: async (keys) => {
      for (const k of keys) delete m[k];
    },
    getAllKeys: async () => Object.keys(m),
  };
}

describe('moodlyLocalExport', () => {
  it('buildMoodlyLocalExportV1 includes primaries and moodly.tasks.day shards', async () => {
    const store = createMemoryStore({
      'moodly.schemaMeta': JSON.stringify({ schemaVersion: 1, migratedAt: 1 }),
      'moodly.entries': '{}',
      'moodly.tasks.day.2026-02-01': '[]',
      'moodly.migrationBackup.0_to_1.1': '{"kind":"moodly.migrationBackup.v1"}',
    });
    const exp = await buildMoodlyLocalExportV1(store);
    expect(exp.kind).toBe(MOODLY_LOCAL_EXPORT_KIND);
    expect(exp.kv['moodly.entries']).toBe('{}');
    expect(exp.kv['moodly.tasks.day.2026-02-01']).toBe('[]');
    expect(exp.kv['moodly.migrationBackup.0_to_1.1']).toBeUndefined();
  });

  it('validateMoodlyLocalExportPayload rejects wrong kind', () => {
    const r = validateMoodlyLocalExportPayload({ kind: 'x', formatRevision: 1, exportedAtMs: 1, kv: { 'moodly.a': '1' } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain('bad_kind');
  });

  it('parseMoodlyLocalExportJson handles invalid JSON', () => {
    const r = parseMoodlyLocalExportJson('{');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain('json_parse_failed');
  });

  it('round-trip serialize + parse', async () => {
    const store = createMemoryStore({ 'moodly.settings': '{}' });
    const exp = await buildMoodlyLocalExportV1(store);
    const json = JSON.stringify(exp);
    const again = parseMoodlyLocalExportJson(json);
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.value.kv['moodly.settings']).toBe('{}');
  });
});
