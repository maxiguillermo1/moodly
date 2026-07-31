/**
 * @fileoverview Tests for internal local export envelope (no UI).
 * @module data/persistence/localExport/kairoLocalExport.test
 */
import { buildKairoLocalExportV1, parseKairoLocalExportJson, validateKairoLocalExportPayload, KAIRO_LOCAL_EXPORT_KIND, } from './kairoLocalExport';
function createMemoryStore(initial = {}) {
    const m = { ...initial };
    return {
        getItem: async (key) => (Object.prototype.hasOwnProperty.call(m, key) ? m[key] : null),
        setItem: async (key, value) => {
            m[key] = value;
        },
        removeItem: async (key) => {
            delete m[key];
        },
        multiGet: async (keys) => keys.map((key) => [key, Object.prototype.hasOwnProperty.call(m, key) ? m[key] : null]),
        multiSet: async (pairs) => {
            for (const [k, v] of pairs)
                m[k] = v;
        },
        multiRemove: async (keys) => {
            for (const k of keys)
                delete m[k];
        },
        getAllKeys: async () => Object.keys(m),
    };
}
describe('kairoLocalExport', () => {
    it('buildKairoLocalExportV1 includes primaries and kairo.tasks.day shards', async () => {
        const store = createMemoryStore({
            'kairo.schemaMeta': JSON.stringify({ schemaVersion: 1, migratedAt: 1 }),
            'kairo.entries': '{}',
            'kairo.tasks.day.2026-02-01': '[]',
            'kairo.migrationBackup.0_to_1.1': '{"kind":"kairo.migrationBackup.v1"}',
        });
        const exp = await buildKairoLocalExportV1(store);
        expect(exp.kind).toBe(KAIRO_LOCAL_EXPORT_KIND);
        expect(exp.kv['kairo.entries']).toBe('{}');
        expect(exp.kv['kairo.tasks.day.2026-02-01']).toBe('[]');
        expect(exp.kv['kairo.migrationBackup.0_to_1.1']).toBeUndefined();
    });
    it('validateKairoLocalExportPayload rejects wrong kind', () => {
        const r = validateKairoLocalExportPayload({ kind: 'x', formatRevision: 1, exportedAtMs: 1, kv: { 'kairo.a': '1' } });
        expect(r.ok).toBe(false);
        if (!r.ok)
            expect(r.errors).toContain('bad_kind');
    });
    it('parseKairoLocalExportJson handles invalid JSON', () => {
        const r = parseKairoLocalExportJson('{');
        expect(r.ok).toBe(false);
        if (!r.ok)
            expect(r.errors).toContain('json_parse_failed');
    });
    it('round-trip serialize + parse', async () => {
        const store = createMemoryStore({ 'kairo.settings': '{}' });
        const exp = await buildKairoLocalExportV1(store);
        const json = JSON.stringify(exp);
        const again = parseKairoLocalExportJson(json);
        expect(again.ok).toBe(true);
        if (again.ok)
            expect(again.value.kv['kairo.settings']).toBe('{}');
    });
});
