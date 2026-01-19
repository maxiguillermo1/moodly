/**
 * @fileoverview Dev/demo seed data for Moodly (data layer source of truth).
 * Seeds realistic-looking mood + journal notes for 2024–2025 when storage is empty.
 *
 * Safe: will NOT overwrite real data.
 */

import type { MoodEntry, MoodEntriesRecord, MoodGrade } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllEntries, setAllEntries } from './moodStorage';

const SEEDED_KEY = 'moodly.demoSeeded'; // legacy
const SEEDED_VERSION_KEY = 'moodly.demoSeedVersion';
const SEEDED_VERSION = 'daily2024-2025-v3-rich';

// Legacy templates (v1) - used only to detect/upgrade old demo entries safely.
const LEGACY_NOTE_TEMPLATES = [
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

const MONTH_THEMES: Array<{
  month: number; // 1..12
  focus: string[];
  wins: string[];
  selfCare: string[];
  social: string[];
  challenges: string[];
}> = [
  {
    month: 1,
    focus: ['new routines', 'a clean slate', 'consistency', 'planning'],
    wins: ['started a simple morning routine', 'made a solid plan for the week', 'finished a task I kept avoiding', 'kept my promises to myself'],
    selfCare: ['went for a long walk', 'did a short stretch + breathing session', 'made a warm meal and ate slowly', 'slept earlier and woke up calmer'],
    social: ['caught up with a friend', 'had a great conversation at home', 'felt supported and listened to', 'shared a laugh that shifted my mood'],
    challenges: ['felt a little foggy', 'had low energy mid-day', 'needed more breaks than usual', 'felt anxious for no clear reason'],
  },
  {
    month: 2,
    focus: ['connection', 'balance', 'small joys', 'kindness'],
    wins: ['kept a good pace at work', 'made progress on a personal goal', 'stayed present instead of rushing', 'handled a stressful moment gracefully'],
    selfCare: ['did a lighter workout', 'cleaned up my space (felt refreshing)', 'spent time outside even if it was cold', 'journaled for 10 minutes'],
    social: ['reached out first and it paid off', 'had a supportive check-in', 'felt genuinely connected', 'made plans I’m excited about'],
    challenges: ['felt stretched thin', 'overthought things', 'had a short mood dip', 'felt a bit lonely'],
  },
  {
    month: 3,
    focus: ['energy', 'momentum', 'spring reset', 'creativity'],
    wins: ['got into a great flow state', 'knocked out errands efficiently', 'felt more motivated than usual', 'made time for a hobby'],
    selfCare: ['took a longer walk', 'did a quick run/ride', 'ate better and noticed the difference', 'spent time in the sun'],
    social: ['met someone new', 'shared a good meal', 'felt appreciated', 'had a fun spontaneous moment'],
    challenges: ['felt restless', 'had trouble focusing', 'ran behind schedule', 'felt mentally tired'],
  },
  {
    month: 4,
    focus: ['clarity', 'steady progress', 'routine', 'health'],
    wins: ['made steady progress on a project', 'kept things simple and effective', 'hit a small milestone', 'felt proud of my follow-through'],
    selfCare: ['did strength training', 'took a long shower and reset', 'got fresh air and moved my body', 'kept my phone time lower'],
    social: ['had a meaningful talk', 'felt closer to someone important', 'shared gratitude', 'got encouragement when I needed it'],
    challenges: ['felt overloaded', 'had decision fatigue', 'felt irritable', 'needed to slow down'],
  },
  {
    month: 5,
    focus: ['outdoors', 'lightness', 'growth', 'confidence'],
    wins: ['felt confident and capable', 'made noticeable progress', 'stayed optimistic', 'handled a busy day smoothly'],
    selfCare: ['spent time outside', 'took a nature walk', 'ate a really good meal', 'did mobility + stretching'],
    social: ['spent time with friends', 'felt seen and valued', 'had a fun hangout', 'connected without distractions'],
    challenges: ['felt a little scattered', 'ran out of energy late', 'needed a reset', 'felt overwhelmed briefly'],
  },
  {
    month: 6,
    focus: ['summer rhythm', 'fun', 'movement', 'simplicity'],
    wins: ['felt energized most of the day', 'got things done early', 'made time for something fun', 'felt grateful and calm'],
    selfCare: ['worked out and felt great after', 'took an evening walk', 'stayed hydrated and noticed it helped', 'got solid sleep'],
    social: ['had a great time with people', 'felt connected and relaxed', 'made plans for later this month', 'had a great conversation'],
    challenges: ['felt a little drained', 'overcommitted slightly', 'needed quiet time', 'had minor stress but managed it'],
  },
  {
    month: 7,
    focus: ['joy', 'sun', 'social energy', 'adventure'],
    wins: ['had a genuinely great day', 'felt light and happy', 'did something spontaneous', 'felt proud of my growth'],
    selfCare: ['spent time outside', 'did a quick workout', 'took a break and actually rested', 'ate well and felt steady'],
    social: ['laughed a lot today', 'felt really supported', 'had a fun outing', 'felt connected and present'],
    challenges: ['felt a bit tired', 'had a small dip', 'needed to reset', 'felt off for a moment but recovered'],
  },
  {
    month: 8,
    focus: ['focus', 'craft', 'discipline', 'calm'],
    wins: ['had a productive, calm day', 'stayed disciplined', 'made solid progress', 'felt clear-minded'],
    selfCare: ['did a focused workout', 'kept a steady routine', 'took a mindful break', 'got good sleep'],
    social: ['had a short but meaningful catch-up', 'felt appreciated', 'kept boundaries and felt good', 'felt supported'],
    challenges: ['felt mentally tired', 'had low motivation briefly', 'felt stretched thin', 'needed a reset'],
  },
  {
    month: 9,
    focus: ['fresh start', 'structure', 'learning', 'routine'],
    wins: ['felt motivated and focused', 'built a better routine', 'learned something useful', 'handled responsibilities smoothly'],
    selfCare: ['went for a walk', 'cleaned my space', 'did a short workout', 'journaled and felt better'],
    social: ['had a supportive conversation', 'felt connected', 'reached out and it helped', 'made time for someone I care about'],
    challenges: ['felt behind', 'felt a bit stressed', 'had a busy day', 'needed more rest'],
  },
  {
    month: 10,
    focus: ['reflection', 'comfort', 'balance', 'gratitude'],
    wins: ['felt steady and grounded', 'stayed calm under pressure', 'made a good decision', 'felt proud of my mindset'],
    selfCare: ['took a longer walk', 'stayed cozy and rested', 'did breathing + stretching', 'had a quiet reset'],
    social: ['had a meaningful check-in', 'felt supported', 'shared something honest', 'felt closer to someone'],
    challenges: ['felt a bit anxious', 'felt low energy', 'overthought things', 'needed to slow down'],
  },
  {
    month: 11,
    focus: ['gratitude', 'relationships', 'steady effort', 'health'],
    wins: ['felt grateful for small things', 'made steady progress', 'kept my balance', 'handled a tricky moment well'],
    selfCare: ['ate well and felt stable', 'took a slow walk', 'rested more', 'kept my routine'],
    social: ['felt close to people I care about', 'had a warm conversation', 'felt supported', 'spent quality time'],
    challenges: ['felt stretched thin', 'felt tired', 'needed more space', 'felt a small dip'],
  },
  {
    month: 12,
    focus: ['wrap-up', 'celebration', 'rest', 'looking ahead'],
    wins: ['wrapped up loose ends', 'felt proud of the year', 'had a cozy, happy day', 'felt excited for next steps'],
    selfCare: ['took time to rest', 'did a gentle workout', 'kept things simple', 'slept well'],
    social: ['spent time with loved ones', 'felt connected', 'shared gratitude', 'had a fun moment'],
    challenges: ['felt a bit overwhelmed', 'felt tired', 'needed quiet time', 'had a short stress spike'],
  },
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
  const h = hashString(date);
  const r = h % 1000; // 0..999
  const year = Number(date.slice(0, 4));

  if (year === 2024) {
    // 2024: skew tougher — mostly B/C/D/F, less A/A+.
    // Target: ~12% A+/A overall.
    if (r < 15) return 'A+';  // 1.5%
    if (r < 120) return 'A';  // 10.5% (total A+/A = 12%)
    if (r < 360) return 'B';  // 24%
    if (r < 690) return 'C';  // 33%
    if (r < 910) return 'D';  // 22%
    return 'F';               // 9%
  }

  // 2025: skew heavily positive — majority A+/A.
  // Target: ~78% A+/A overall.
  if (r < 320) return 'A+'; // 32%
  if (r < 780) return 'A';  // 46% (total A+/A = 78%)
  if (r < 920) return 'B';  // 14%
  if (r < 970) return 'C';  // 5%
  if (r < 992) return 'D';  // 2.2%
  return 'F';               // 0.8%
}

function getTheme(monthIndex0: number) {
  return MONTH_THEMES[monthIndex0] ?? MONTH_THEMES[0]!;
}

function pickFrom<T>(arr: T[], h: number) {
  return arr[h % arr.length]!;
}

function weekdayIndex(date: string) {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)) - 1;
  const d = Number(date.slice(8, 10));
  return new Date(y, m, d).getDay(); // 0..6 Sun..Sat
}

function pickNote(date: string, mood: MoodGrade): string {
  // We want detailed “training data”: keep notes present most of the time.
  const h = hashString(`${date}:${mood}`);
  if (h % 20 === 0) return ''; // 5% empty notes for realism

  const y = Number(date.slice(0, 4));
  const mIdx = Number(date.slice(5, 7)) - 1;
  const d = Number(date.slice(8, 10));
  const theme = getTheme(mIdx);

  const wday = weekdayIndex(date);
  const isWeekend = wday === 0 || wday === 6;

  const focus = pickFrom(theme.focus, h >>> 1);
  const win = pickFrom(theme.wins, h >>> 2);
  const care = pickFrom(theme.selfCare, h >>> 3);
  const social = pickFrom(theme.social, h >>> 4);
  const challenge = pickFrom(theme.challenges, h >>> 5);

  // Month-specific little “seasonal” touch (still generic).
  const seasonal =
    mIdx === 0 ? 'I’m easing into the year without overdoing it.' :
    mIdx === 1 ? 'Trying to keep things balanced and kind.' :
    mIdx === 2 ? 'Energy is coming back and it shows.' :
    mIdx === 3 ? 'Keeping it steady and simple.' :
    mIdx === 4 ? 'More time outside is helping a lot.' :
    mIdx === 5 ? 'Summer rhythm is starting to feel real.' :
    mIdx === 6 ? 'Leaning into fun and being present.' :
    mIdx === 7 ? 'Trying to stay focused without burning out.' :
    mIdx === 8 ? 'The fresh-start feeling is motivating.' :
    mIdx === 9 ? 'I’m noticing patterns and adjusting.' :
    mIdx === 10 ? 'Gratitude is easier to access lately.' :
    'Wrapping things up and looking ahead.';

  if (mood === 'A+' || mood === 'A') {
    const extra = isWeekend ? `Also had a little fun — ${social}.` : `Socially, ${social}.`;
    return `Today (${y}-${pad2(mIdx + 1)}-${pad2(d)}) felt really solid. Focus was on ${focus}, and I ${win}. ${care}. ${extra} ${seasonal}`;
  }

  if (mood === 'B') {
    return `Pretty good day overall. I ${win}, and ${care}. ${isWeekend ? `I also ${social}.` : `I kept things moving even with ${challenge}.`} ${seasonal}`;
  }

  if (mood === 'C') {
    return `Neutral day. I handled the basics and tried to stay grounded. ${challenge}, so I ${care}. ${seasonal}`;
  }

  // D / F
  return `Hard day. ${challenge}. I tried not to spiral and kept it small: ${care}. I’m giving myself permission to reset and try again tomorrow.`;
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

function looksLikeLegacyDemoEntry(entry: MoodEntry | undefined): boolean {
  if (!entry) return false;
  // If user edited it, updatedAt can drift; but legacy seed tended to update within ~6h.
  const created = new Date(entry.createdAt);
  const hour = created.getHours();
  const isMiddayish = hour >= 10 && hour <= 14;
  const updatedSoon = entry.updatedAt >= entry.createdAt && entry.updatedAt - entry.createdAt <= 6 * 60 * 60 * 1000;
  const noteIsLegacy = entry.note === '' || LEGACY_NOTE_TEMPLATES.includes(entry.note);
  return isMiddayish && updatedSoon && noteIsLegacy;
}

/**
 * Ensure demo entries exist for every day in 2024–2025.
 * Safety:
 * - Never overwrites an existing entry.
 * - Only runs if storage is empty OR if we've already demo-seeded in the past.
 */
export async function seedDemoEntriesIfEmpty(): Promise<void> {
  try {
    // Never seed demo data in production builds (privacy + App Store trust).
    if (typeof __DEV__ !== 'undefined' && !__DEV__) return;

    const version = await AsyncStorage.getItem(SEEDED_VERSION_KEY);
    const legacy = await AsyncStorage.getItem(SEEDED_KEY);

    const existing = await getAllEntries();
    const hasAnyData = Object.keys(existing).length > 0;
    const isDemoContext = legacy === '1' || !!version; // only mutate non-empty stores if it’s already demo-seeded

    if (hasAnyData && !isDemoContext) return;
    if (version === SEEDED_VERSION) return;

    const next: MoodEntriesRecord = { ...existing };

    // Fill every day in 2024 (do not overwrite).
    for (let m = 0; m < 12; m++) {
      const dim = daysInMonth(2024, m);
      for (let d = 1; d <= dim; d++) {
        const date = `2024-${pad2(m + 1)}-${pad2(d)}`;
        const prev = next[date];
        if (!prev) {
          next[date] = makeEntry(date);
          continue;
        }
        if (isDemoContext && looksLikeLegacyDemoEntry(prev)) {
          const upgraded = makeEntry(date);
          next[date] = {
            ...upgraded,
            createdAt: prev.createdAt,
            updatedAt: Math.max(prev.updatedAt, upgraded.updatedAt),
          };
        }
      }
    }

    // Fill every day in 2025 (do not overwrite).
    for (let m = 0; m < 12; m++) {
      const dim = daysInMonth(2025, m);
      for (let d = 1; d <= dim; d++) {
        const date = `2025-${pad2(m + 1)}-${pad2(d)}`;
        const prev = next[date];
        if (!prev) {
          next[date] = makeEntry(date);
          continue;
        }

        // Upgrade only legacy demo entries (safe) so users can get richer “training” data
        // without wiping the store. Never touch entries that don't look like seed output.
        if (isDemoContext && looksLikeLegacyDemoEntry(prev)) {
          const upgraded = makeEntry(date);
          // Preserve original createdAt to keep history stable; update updatedAt to look plausible.
          next[date] = {
            ...upgraded,
            createdAt: prev.createdAt,
            updatedAt: Math.max(prev.updatedAt, upgraded.updatedAt),
          };
        }
      }
    }

    await setAllEntries(next);
    await AsyncStorage.setItem(SEEDED_VERSION_KEY, SEEDED_VERSION);
    if (!legacy) await AsyncStorage.setItem(SEEDED_KEY, '1');
  } catch {
    // Non-fatal: app should still work without demo data.
    console.warn('[demoSeed] Failed to seed demo data'); // console is redacted/patched
  }
}

