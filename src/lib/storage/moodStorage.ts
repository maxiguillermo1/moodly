/**
 * @fileoverview AsyncStorage wrapper for mood entries
 * @module lib/storage/moodStorage
 * 
 * Data is stored as a single JSON object keyed by date for O(1) access.
 * Key: "moodly.entries"
 * Value: Record<string, MoodEntry>
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodEntry, MoodEntriesRecord, MoodGrade } from '../../types';

const STORAGE_KEY = 'moodly.entries';

// In-memory cache for the session (performance-only; does not change semantics).
let entriesCache: MoodEntriesRecord | null = null;
let entriesLoadPromise: Promise<MoodEntriesRecord> | null = null;

// Derived cache: entries grouped by YYYY-MM (used by CalendarScreen to avoid regrouping).
export type EntriesByMonthKey = Record<string, MoodEntriesRecord>;
let entriesByMonthCache: EntriesByMonthKey | null = null;

function monthKeyFromIso(isoDate: string) {
  // isoDate is YYYY-MM-DD
  return isoDate.slice(0, 7);
}

function ensureEntriesByMonthCache(entries: MoodEntriesRecord): EntriesByMonthKey {
  if (entriesByMonthCache) return entriesByMonthCache;
  const grouped: EntriesByMonthKey = {};
  Object.keys(entries).forEach((iso) => {
    const mk = monthKeyFromIso(iso);
    (grouped[mk] ||= {})[iso] = entries[iso]!;
  });
  entriesByMonthCache = grouped;
  return grouped;
}

function setCache(next: MoodEntriesRecord) {
  entriesCache = next;
  // Invalidate derived cache; it will be rebuilt lazily when requested.
  entriesByMonthCache = null;
}

/**
 * Internal helper: persist a full entries record and update cache.
 * Used by demo seeding and (optionally) dev tooling.
 */
export async function setAllEntries(next: MoodEntriesRecord): Promise<void> {
  setCache(next);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Retrieve all entries as a record keyed by date
 */
export async function getAllEntries(): Promise<MoodEntriesRecord> {
  try {
    if (entriesCache) return entriesCache;
    if (entriesLoadPromise) return entriesLoadPromise;

    entriesLoadPromise = (async () => {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = json ? (JSON.parse(json) as MoodEntriesRecord) : {};
      setCache(parsed);
      return parsed;
    })();

    const res = await entriesLoadPromise;
    entriesLoadPromise = null;
    return res;
  } catch (error) {
    console.error('[moodStorage] Failed to load entries:', error);
    entriesLoadPromise = null;
    return {};
  }
}

/**
 * Retrieve entries grouped by month key (YYYY-MM).
 * Performance helper for CalendarScreen; does not change data semantics.
 */
export async function getEntriesByMonthKey(): Promise<EntriesByMonthKey> {
  const entries = await getAllEntries();
  return ensureEntriesByMonthCache(entries);
}

/**
 * Retrieve both the full entries record and the month-grouped index in one call.
 * Helps screens avoid duplicated work and extra regrouping on focus.
 */
export async function getAllEntriesWithMonthIndex(): Promise<{
  entries: MoodEntriesRecord;
  byMonthKey: EntriesByMonthKey;
}> {
  const entries = await getAllEntries();
  const byMonthKey = ensureEntriesByMonthCache(entries);
  return { entries, byMonthKey };
}

/**
 * Get a single entry by date
 * @param date - Date string in YYYY-MM-DD format
 */
export async function getEntry(date: string): Promise<MoodEntry | null> {
  if (entriesCache) return entriesCache[date] ?? null;
  const entries = await getAllEntries();
  return entries[date] ?? null;
}

/**
 * Create or update an entry (upsert)
 * Preserves createdAt on updates, always updates updatedAt
 */
export async function upsertEntry(entry: MoodEntry): Promise<void> {
  try {
    const entries = await getAllEntries();
    const now = Date.now();
    const existing = entries[entry.date];

    const next: MoodEntry = {
      ...entry,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    entries[entry.date] = next;

    // Keep derived month index warm (low-risk perf win for CalendarScreen).
    const mk = monthKeyFromIso(entry.date);
    if (entriesByMonthCache) {
      (entriesByMonthCache[mk] ||= {})[entry.date] = next;
    }

    setCache(entries);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('[moodStorage] Failed to save entry:', error);
    throw error;
  }
}

/**
 * Delete an entry by date
 */
export async function deleteEntry(date: string): Promise<void> {
  try {
    const entries = await getAllEntries();
    delete entries[date];

    if (entriesByMonthCache) {
      const mk = monthKeyFromIso(date);
      const monthMap = entriesByMonthCache[mk];
      if (monthMap) {
        delete monthMap[date];
        if (Object.keys(monthMap).length === 0) delete entriesByMonthCache[mk];
      }
    }

    setCache(entries);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('[moodStorage] Failed to delete entry:', error);
    throw error;
  }
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get all entries sorted by date (newest first)
 */
export async function getEntriesSortedDesc(): Promise<MoodEntry[]> {
  const entries = await getAllEntries();
  return Object.values(entries).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get entries within a date range (inclusive)
 */
export async function getEntriesInRange(
  startDate: string,
  endDate: string
): Promise<MoodEntry[]> {
  const entries = await getAllEntries();
  return Object.values(entries)
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get count of entries per mood grade
 */
export async function getMoodCounts(): Promise<Record<MoodGrade, number>> {
  const entries = await getAllEntries();
  const counts: Record<MoodGrade, number> = {
    'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0,
  };

  Object.values(entries).forEach((entry) => {
    counts[entry.mood]++;
  });

  return counts;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new MoodEntry object with defaults
 */
export function createEntry(
  date: string,
  mood: MoodGrade,
  note: string = ''
): MoodEntry {
  const now = Date.now();
  return {
    date,
    mood,
    note: note.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// Debug / Dev Utils
// ============================================================================

/**
 * Clear all entries (use with caution!)
 */
export async function clearAllEntries(): Promise<void> {
  entriesCache = {};
  entriesLoadPromise = null;
  entriesByMonthCache = {};
  await AsyncStorage.removeItem(STORAGE_KEY);
}
