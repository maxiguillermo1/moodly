/**
 * @fileoverview Jest mock for expo-sqlite (in-memory stand-in).
 */
import { getSharedInMemoryKairoDatabase, resetSharedInMemoryKairoDatabase, } from '../testInMemoryDatabase';
export async function openDatabaseAsync(_name) {
    return getSharedInMemoryKairoDatabase();
}
export function __resetExpoSqliteMockForTests() {
    resetSharedInMemoryKairoDatabase();
}
