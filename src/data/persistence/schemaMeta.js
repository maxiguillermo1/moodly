/**
 * @fileoverview Read/write local schema metadata (version stamp for migrations).
 * @module data/persistence/schemaMeta
 */
import { logger } from '../../lib/security/logger';
import { CURRENT_SCHEMA_VERSION, SCHEMA_META_STORAGE_KEY } from './schemaConstants';
function isSchemaVersionField(n) {
    return typeof n === 'number' && Number.isFinite(n) && n === Math.floor(n) && n >= 1;
}
/** Legacy schema meta key (pre–Kairo rename). */
const LEGACY_SCHEMA_META_STORAGE_KEY = 'moodly.schemaMeta';
export async function readSchemaMeta(store) {
    try {
        let raw = await store.getItem(SCHEMA_META_STORAGE_KEY);
        if (!raw) {
            raw = await store.getItem(LEGACY_SCHEMA_META_STORAGE_KEY);
        }
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
            return null;
        const o = parsed;
        if (!isSchemaVersionField(o.schemaVersion))
            return null;
        const migratedAt = o.migratedAt != null && typeof o.migratedAt === 'number' && Number.isFinite(o.migratedAt)
            ? Math.floor(o.migratedAt)
            : undefined;
        return { schemaVersion: o.schemaVersion, migratedAt };
    }
    catch {
        logger.warn('persistence.schemaMeta.parse.failed', { key: SCHEMA_META_STORAGE_KEY });
        return null;
    }
}
export async function writeSchemaMeta(store, meta) {
    const payload = {
        schemaVersion: meta.schemaVersion,
        migratedAt: meta.migratedAt ?? Date.now(),
    };
    await store.setItem(SCHEMA_META_STORAGE_KEY, JSON.stringify(payload));
}
export async function quarantineSchemaMeta(store, rawJson) {
    const ts = Date.now();
    try {
        await store.setItem(`${SCHEMA_META_STORAGE_KEY}.corrupt.${ts}`, rawJson);
    }
    catch (e) {
        logger.warn('persistence.schemaMeta.quarantine.failed', { error: e });
    }
}
export { CURRENT_SCHEMA_VERSION };
