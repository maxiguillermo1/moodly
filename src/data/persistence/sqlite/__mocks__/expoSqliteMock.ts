/**
 * @fileoverview Jest mock for expo-sqlite (in-memory stand-in).
 */

import {
  getSharedInMemoryMoodlyDatabase,
  resetSharedInMemoryMoodlyDatabase,
} from '../testInMemoryDatabase';

export async function openDatabaseAsync(_name: string) {
  return getSharedInMemoryMoodlyDatabase();
}

export function __resetExpoSqliteMockForTests(): void {
  resetSharedInMemoryMoodlyDatabase();
}
