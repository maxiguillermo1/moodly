/**
 * @fileoverview Insert order–based LRU helpers for bounded `Map` caches (ES Map = insertion order).
 * @module lib/utils/lruMap
 */
/** Move an existing entry to "most recently used" (Map tail). */
export function touchLruMapKey(map, key) {
    const v = map.get(key);
    if (v === undefined)
        return false;
    map.delete(key);
    map.set(key, v);
    return true;
}
/**
 * Set key→value and drop the least-recently-used entry when over capacity.
 * Updating an existing key refreshes its LRU position without counting toward growth.
 */
export function setWithLruEvict(map, key, value, maxSize) {
    if (map.has(key)) {
        map.delete(key);
    }
    else if (map.size >= maxSize) {
        const oldest = map.keys().next().value;
        if (oldest !== undefined)
            map.delete(oldest);
    }
    map.set(key, value);
}
