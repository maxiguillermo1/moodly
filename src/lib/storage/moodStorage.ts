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

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Retrieve all entries as a record keyed by date
 */
export async function getAllEntries(): Promise<MoodEntriesRecord> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : {};
  } catch (error) {
    console.error('[moodStorage] Failed to load entries:', error);
    return {};
  }
}

/**
 * Get a single entry by date
 * @param date - Date string in YYYY-MM-DD format
 */
export async function getEntry(date: string): Promise<MoodEntry | null> {
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

    entries[entry.date] = {
      ...entry,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

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
  await AsyncStorage.removeItem(STORAGE_KEY);
}
