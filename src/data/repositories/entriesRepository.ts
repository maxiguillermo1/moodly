/**
 * @fileoverview Repository façade for mood + journal persisted rows (`moodly.entries`).
 * @module data/repositories/entriesRepository
 *
 * Hot paths: `getJournalEntriesSortedDescSnapshot` (Journal list), `getCalendarEntriesByMonthIndexSnapshot`
 * (calendar month index). See `src/data/DATA_CONTRACT.md` § Mood / journal read APIs.
 */

import * as entriesImpl from '../storage/moodStorage';

export * from '../storage/moodStorage';

export const entriesRepository = {
  getLastAllEntriesSource: entriesImpl.getLastAllEntriesSource,
  setAllEntries: entriesImpl.setAllEntries,
  getAllEntries: entriesImpl.getAllEntries,
  getAllEntriesWithMonthIndex: entriesImpl.getAllEntriesWithMonthIndex,
  getEntry: entriesImpl.getEntry,
  upsertEntry: entriesImpl.upsertEntry,
  deleteEntry: entriesImpl.deleteEntry,
  getEntriesSortedDesc: entriesImpl.getEntriesSortedDesc,
  getMoodStats: entriesImpl.getMoodStats,
  warmEntriesSessionCaches: entriesImpl.warmEntriesSessionCaches,
  getEntriesSessionCacheDiagnostics: entriesImpl.getEntriesSessionCacheDiagnostics,
  createEntry: entriesImpl.createEntry,
  clearAllEntries: entriesImpl.clearAllEntries,
  resetEntriesStorageSessionStateForTests: entriesImpl.resetEntriesStorageSessionStateForTests,
} as const;

export type IEntriesRepository = typeof entriesRepository;

/** Domain alias — same backing store as journal (one `MoodEntry` row per day). */
export const moodEntryRepository = entriesRepository;
export type IMoodEntryRepository = IEntriesRepository;

export const journalEntryRepository = entriesRepository;
export type IJournalEntryRepository = IEntriesRepository;
