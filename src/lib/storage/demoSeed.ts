/**
 * @fileoverview Dev/demo seed data for Moodly.
 * Seeds realistic-looking mood + journal notes for 2024–2025 when storage is empty.
 *
 * Safe: will NOT overwrite real data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MoodEntry, MoodEntriesRecord, MoodGrade } from '../../types';

const ENTRIES_KEY = 'moodly.entries';
const SEEDED_KEY = 'moodly.demoSeeded';

const MOODS: MoodGrade[] = ['A+', 'A', 'B', 'C', 'D', 'F'];

const NOTE_TEMPLATES = [
  'Went for a long walk and felt clear-headed.',
  'Had a productive day — good momentum.',
  'A bit low energy, but I still showed up.',
  'Good conversations today. Felt connected.',
  'Busy day. Needed more breaks.',
  'Worked out and felt noticeably better after.',
  'Felt anxious earlier; journaling helped.',
  'Great focus session. Small wins stacked up.',
  'Tough day, but I handled it better than before.',
  'Quiet day. Reset and recharge.',
  'Spent time outside. Mood lifted.',
  'Got a lot done. Proud of the progress.',
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function hashString(s: string) {
  // Small deterministic hash for stable demo data across runs.
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function makeEntry(date: string): MoodEntry {
  const h = hashString(date);
  const mood = MOODS[h % MOODS.length]!;
  const note = NOTE_TEMPLATES[h % NOTE_TEMPLATES.length]!;

  // Make timestamps look plausible (midday local time).
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)) - 1;
  const d = Number(date.slice(8, 10));
  const createdAt = new Date(y, m, d, 12, 0, 0).getTime();
  const updatedAt = createdAt + (h % (6 * 60 * 60 * 1000)); // + up to 6 hours

  return { date, mood, note, createdAt, updatedAt };
}

/**
 * Seed demo entries for 2024 and 2025 only if there are currently zero entries.
 */
export async function seedDemoEntriesIfEmpty(): Promise<void> {
  try {
    const alreadySeeded = await AsyncStorage.getItem(SEEDED_KEY);
    const raw = await AsyncStorage.getItem(ENTRIES_KEY);
    const existing: MoodEntriesRecord = raw ? JSON.parse(raw) : {};
    if (Object.keys(existing).length > 0) return;
    if (alreadySeeded === '1') return;

    const seed: MoodEntriesRecord = {};
    const years = [2024, 2025];
    const daysPerMonth = [3, 10, 17, 24]; // enough density to make Calendar/Journals feel “alive”

    for (const year of years) {
      for (let m = 0; m < 12; m++) {
        const dim = daysInMonth(year, m);
        for (const day of daysPerMonth) {
          const d = Math.min(day, dim);
          const date = `${year}-${pad2(m + 1)}-${pad2(d)}`;
          seed[date] = makeEntry(date);
        }
      }
    }

    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(seed));
    await AsyncStorage.setItem(SEEDED_KEY, '1');
  } catch (e) {
    // Non-fatal: app should still work without demo data.
    console.warn('[demoSeed] Failed to seed demo data:', e);
  }
}

