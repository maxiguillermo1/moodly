/**
 * @fileoverview AsyncStorage wrapper (single fault-injection hook).
 *
 * Rationale:
 * - Keep fault injection centralized (one place).
 * - Preserve persist-first behavior: callers decide when to update RAM caches,
 *   but injected failures/delays should only happen at the actual I/O boundary.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeAsyncStorageFaultInjection } from './storageFaultInjection';
async function before(op, key) {
    await beforeAsyncStorageFaultInjection(op, key);
}
export const storage = Object.freeze({
    async getItem(key) {
        await before('getItem', key);
        return AsyncStorage.getItem(key);
    },
    async setItem(key, value) {
        await before('setItem', key);
        await AsyncStorage.setItem(key, value);
    },
    async removeItem(key) {
        await before('removeItem', key);
        await AsyncStorage.removeItem(key);
    },
    async multiGet(keys) {
        await before('multiGet', keys[0] ?? 'multiGet');
        return AsyncStorage.multiGet(keys);
    },
    async multiSet(pairs) {
        await before('multiSet', pairs[0]?.[0] ?? 'multiSet');
        await AsyncStorage.multiSet(pairs);
    },
    async multiRemove(keys) {
        await before('multiRemove', keys[0] ?? 'multiRemove');
        await AsyncStorage.multiRemove(keys);
    },
    async getAllKeys() {
        await before('getAllKeys', 'getAllKeys');
        return AsyncStorage.getAllKeys();
    },
});
