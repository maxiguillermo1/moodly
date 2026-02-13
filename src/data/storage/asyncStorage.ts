/**
 * @fileoverview AsyncStorage wrapper (single chaos injection point).
 *
 * Rationale:
 * - Keep fault injection centralized (one place).
 * - Preserve persist-first behavior: callers decide when to update RAM caches,
 *   but injected failures/delays should only happen at the actual I/O boundary.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chaosBeforeStorageOp, type StorageOp } from './chaos';

type Key = string;

async function before(op: StorageOp, key: Key): Promise<void> {
  await chaosBeforeStorageOp(op, key);
}

export const storage = Object.freeze({
  async getItem(key: Key): Promise<string | null> {
    await before('getItem', key);
    return AsyncStorage.getItem(key);
  },

  async setItem(key: Key, value: string): Promise<void> {
    await before('setItem', key);
    await AsyncStorage.setItem(key, value);
  },

  async removeItem(key: Key): Promise<void> {
    await before('removeItem', key);
    await AsyncStorage.removeItem(key);
  },

  async multiGet(keys: readonly Key[]): Promise<readonly [string, string | null][]> {
    // Inject a single delay/failure for the op (deterministic), but also include a key in logs.
    await before('multiGet', keys[0] ?? 'multiGet');
    return AsyncStorage.multiGet(keys as string[]);
  },

  async multiSet(pairs: readonly [Key, string][]): Promise<void> {
    await before('multiSet', pairs[0]?.[0] ?? 'multiSet');
    await AsyncStorage.multiSet(pairs as [string, string][]);
  },

  async multiRemove(keys: readonly Key[]): Promise<void> {
    await before('multiRemove', keys[0] ?? 'multiRemove');
    await AsyncStorage.multiRemove(keys as string[]);
  },
});

