/**
 * @fileoverview Canonical domain model helpers for Moodly entries.
 * @module data/model/entry
 *
 * This module is designed for analytics/ML readiness:
 * - deterministic transforms
 * - runtime validation at boundaries
 * - normalization of text inputs
 */

import type { MoodEntry, MoodEntriesRecord, MoodGrade } from '../../types';

export const VALID_MOOD_GRADES: ReadonlyArray<MoodGrade> = ['A+', 'A', 'B', 'C', 'D', 'F'];
export const VALID_MOOD_SET: ReadonlySet<MoodGrade> = new Set(VALID_MOOD_GRADES);

export const MAX_NOTE_LEN = 200; // must stay aligned with UI maxLength (does not change semantics)

/**
 * Validate a YYYY-MM-DD key (local date semantics).
 * This is the canonical date validator for storage + analytics.
 */
export function isValidISODateKey(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function normalizeNote(note: unknown): string {
  // Normalize whitespace for analytics/ML while preserving user meaning.
  const s = String(note ?? '');
  // Collapse whitespace runs; keep newlines as single spaces (simpler for downstream).
  const collapsed = s.replace(/\s+/g, ' ').trim();
  return collapsed.slice(0, MAX_NOTE_LEN);
}

export function isValidMoodEntry(v: unknown): v is MoodEntry {
  const e = v as any;
  return (
    !!e &&
    typeof e === 'object' &&
    typeof e.date === 'string' &&
    isValidISODateKey(e.date) &&
    typeof e.note === 'string' &&
    typeof e.createdAt === 'number' &&
    typeof e.updatedAt === 'number' &&
    typeof e.mood === 'string' &&
    VALID_MOOD_SET.has(e.mood as MoodGrade) &&
    e.createdAt <= e.updatedAt
  );
}

/**
 * Canonical mood mapping for analytics/ML (monotonic: higher = better).
 */
export function moodToScore(mood: MoodGrade): number {
  switch (mood) {
    case 'A+': return 5;
    case 'A': return 4;
    case 'B': return 3;
    case 'C': return 2;
    case 'D': return 1;
    case 'F': return 0;
  }
}

/**
 * Deterministic sorting helper for entries (newest-first by date key).
 */
export function sortEntriesDesc(a: MoodEntry, b: MoodEntry): number {
  return b.date.localeCompare(a.date);
}

/**
 * Validate a full entries record.
 * - Ensures keys are valid ISO date keys
 * - Ensures values are valid MoodEntry
 * - Ensures record key matches entry.date
 */
export function validateEntriesRecord(raw: unknown): MoodEntriesRecord {
  const out: MoodEntriesRecord = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isValidISODateKey(k)) continue;
    if (!isValidMoodEntry(v)) continue;
    const e = v as MoodEntry;
    if (e.date !== k) continue;
    out[k] = e;
  }
  return out;
}

