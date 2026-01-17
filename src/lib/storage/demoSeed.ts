/**
 * @fileoverview Dev/demo seed data for Moodly.
 * Seeds realistic-looking mood + journal notes for 2024–2025 when storage is empty.
 *
 * Safe: will NOT overwrite real data.
 */

import type { MoodEntry, MoodEntriesRecord, MoodGrade } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllEntries, setAllEntries } from './moodStorage';

const SEEDED_KEY = 'moodly.demoSeeded'; // legacy
const SEEDED_VERSION_KEY = 'moodly.demoSeedVersion';
const SEEDED_VERSION = 'daily2025-v1';

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

function pickMood(date: string): MoodGrade {
  // Deterministic, "reasonable" distribution:
  // mostly B/C, some A/D, rare A+/F.
  const h = hashString(date);
  const r = h % 100; // 0..99

  if (r < 3) return 'A+';
  if (r < 18) return 'A';
  if (r < 55) return 'B';
  if (r < 82) return 'C';
  if (r < 96) return 'D';
  return 'F';
}

function pickNote(date: string, mood: MoodGrade): string {
  // 20% chance of empty note to look realistic.
  const h = hashString(`${date}:${mood}`);
  if (h % 5 === 0) return '';

  const base = NOTE_TEMPLATES[h % NOTE_TEMPLATES.length]!;
  // Light variation by mood.
  if (mood === 'A+' || mood === 'A') return base;
  if (mood === 'D' || mood === 'F') return base.replace('progress', 'grounding').replace('momentum', 'patience');
  return base;
}

function makeEntry(date: string): MoodEntry {
  const h = hashString(date);
  const mood = pickMood(date);
  const note = pickNote(date, mood);

  // Make timestamps look plausible (midday local time).
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)) - 1;
  const d = Number(date.slice(8, 10));
  const createdAt = new Date(y, m, d, 12, 0, 0).getTime();
  const updatedAt = createdAt + (h % (6 * 60 * 60 * 1000)); // + up to 6 hours

  return { date, mood, note, createdAt, updatedAt };
}

/**
 * Ensure demo entries exist for every day in 2025.
 * Safety:
 * - Never overwrites an existing entry.
 * - Only runs if storage is empty OR if we've already demo-seeded in the past.
 */
export async function seedDemoEntriesIfEmpty(): Promise<void> {
  try {
    const version = await AsyncStorage.getItem(SEEDED_VERSION_KEY);
    const legacy = await AsyncStorage.getItem(SEEDED_KEY);

    const existing = await getAllEntries();
    const hasAnyData = Object.keys(existing).length > 0;
    const isDemoContext = legacy === '1' || !!version; // only mutate non-empty stores if it’s already demo-seeded

    if (hasAnyData && !isDemoContext) return;
    if (version === SEEDED_VERSION) return;

    const next: MoodEntriesRecord = { ...existing };

    // Fill every day in 2025 (do not overwrite).
    for (let m = 0; m < 12; m++) {
      const dim = daysInMonth(2025, m);
      for (let d = 1; d <= dim; d++) {
        const date = `2025-${pad2(m + 1)}-${pad2(d)}`;
        if (!next[date]) next[date] = makeEntry(date);
      }
    }

    await setAllEntries(next);
    await AsyncStorage.setItem(SEEDED_VERSION_KEY, SEEDED_VERSION);
    if (!legacy) await AsyncStorage.setItem(SEEDED_KEY, '1');
  } catch (e) {
    // Non-fatal: app should still work without demo data.
    console.warn('[demoSeed] Failed to seed demo data:', e);
  }
}

