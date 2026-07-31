/**
 * @fileoverview Canonical domain model helpers for Kairo entries.
 * @module data/model/entry
 *
 * This module is designed for analytics/ML readiness:
 * - deterministic transforms
 * - runtime validation at boundaries
 * - normalization of text inputs
 */
import { isValidLocalCalendarDayKey } from '../../lib/utils/date';
export const VALID_MOOD_GRADES = ['A+', 'A', 'B', 'C', 'D', 'F'];
export const VALID_MOOD_SET = new Set(VALID_MOOD_GRADES);
export const MAX_NOTE_LEN = 200; // must stay aligned with UI maxLength (does not change semantics)
/**
 * Validate a YYYY-MM-DD key (local date semantics).
 * This is the canonical date validator for storage + analytics.
 */
export function isValidISODateKey(date) {
    return isValidLocalCalendarDayKey(date);
}
export function normalizeNote(note) {
    // Normalize whitespace for analytics/ML while preserving user meaning.
    const s = String(note ?? '');
    // Collapse whitespace runs; keep newlines as single spaces (simpler for downstream).
    const collapsed = s.replace(/\s+/g, ' ').trim();
    return collapsed.slice(0, MAX_NOTE_LEN);
}
export function isValidMoodEntry(v) {
    const e = v;
    return (!!e &&
        typeof e === 'object' &&
        typeof e.date === 'string' &&
        isValidISODateKey(e.date) &&
        typeof e.note === 'string' &&
        typeof e.createdAt === 'number' &&
        typeof e.updatedAt === 'number' &&
        typeof e.mood === 'string' &&
        VALID_MOOD_SET.has(e.mood) &&
        e.createdAt <= e.updatedAt);
}
/**
 * Canonical mood mapping for analytics/ML (monotonic: higher = better).
 */
export function moodToScore(mood) {
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
export function sortEntriesDesc(a, b) {
    return b.date.localeCompare(a.date);
}
/**
 * Validate a full entries record.
 * - Ensures keys are valid ISO date keys
 * - Ensures values are valid MoodEntry
 * - Ensures record key matches entry.date
 */
export function validateEntriesRecord(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return out;
    for (const [k, v] of Object.entries(raw)) {
        if (!isValidISODateKey(k))
            continue;
        if (!isValidMoodEntry(v))
            continue;
        const e = v;
        if (e.date !== k)
            continue;
        out[k] = e;
    }
    return out;
}
