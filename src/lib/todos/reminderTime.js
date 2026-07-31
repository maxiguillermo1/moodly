/**
 * @fileoverview Local time-of-day helpers for per-day reminder tasks (no push scheduling).
 * @module lib/todos/reminderTime
 */
import { toLocalDayKey } from '../utils/date';
/** Quick picks shown in the reminder sheet (local wall time). */
export const REMINDER_QUICK_MINUTES = [
    8 * 60 + 0,
    9 * 60 + 0,
    9 * 60 + 30,
    10 * 60 + 0,
    12 * 60 + 0,
    13 * 60 + 0,
    15 * 60 + 0,
    17 * 60 + 0,
    18 * 60 + 0,
    20 * 60 + 0,
    21 * 60 + 0,
];
export function clampReminderMinutes(value) {
    if (!Number.isFinite(value))
        return null;
    const n = Math.round(value);
    if (n < 0 || n >= 24 * 60)
        return null;
    return n;
}
export function localMinutesSinceMidnight(d) {
    return d.getHours() * 60 + d.getMinutes();
}
/** Format minutes from midnight as a short local time (e.g. "9:00 AM"). */
export function formatReminderMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const d = new Date(2000, 0, 1, h, m, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
/**
 * True when `dayKey` is "today" and local time is past the reminder minute.
 * Other calendar days: false (no "late" styling when browsing history).
 */
export function isReminderOverdueOnDay(dayKey, reminderMinutes, now = new Date()) {
    if (toLocalDayKey(now) !== dayKey)
        return false;
    return localMinutesSinceMidnight(now) > reminderMinutes;
}
export function countOpenWithReminder(items) {
    return items.reduce((n, t) => n + (!t.done && t.reminderMinutes != null ? 1 : 0), 0);
}
export function nextOpenReminderMinutes(items, listDayKey, now = new Date()) {
    const candidates = [];
    for (const t of items) {
        if (t.done || t.reminderMinutes == null)
            continue;
        candidates.push(t.reminderMinutes);
    }
    if (candidates.length === 0)
        return null;
    candidates.sort((a, b) => a - b);
    if (listDayKey !== toLocalDayKey(now))
        return candidates[0];
    const nowM = localMinutesSinceMidnight(now);
    for (const m of candidates) {
        if (m >= nowM)
            return m;
    }
    return candidates[0];
}
