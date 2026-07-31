/**
 * @fileoverview v1 → v2: rename legacy `moodly.*` AsyncStorage keys to `kairo.*`.
 * @module data/persistence/migrations/migration002_renameLegacyStorageKeys
 */
const LEGACY_PREFIX = 'moodly.';
const NEW_PREFIX = 'kairo.';
/** v1 → v2: Moodly → Kairo storage key prefix (preserves existing user data). */
export const migration002_renameLegacyStorageKeys = async ({ store }) => {
    const keyed = store;
    if (typeof keyed.getAllKeys !== 'function')
        return;
    const allKeys = await keyed.getAllKeys();
    const legacyKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(LEGACY_PREFIX));
    if (legacyKeys.length === 0)
        return;
    const pairs = await store.multiGet(legacyKeys);
    const next = [];
    for (let i = 0; i < legacyKeys.length; i += 1) {
        const oldKey = legacyKeys[i];
        const value = pairs[i]?.[1];
        if (value == null)
            continue;
        next.push([`${NEW_PREFIX}${oldKey.slice(LEGACY_PREFIX.length)}`, value]);
    }
    if (next.length === 0)
        return;
    await store.multiSet(next);
    await store.multiRemove(legacyKeys);
};
