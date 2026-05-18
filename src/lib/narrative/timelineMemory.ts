/**
 * @fileoverview **Timeline memory** — merge adjacent phase buckets into continuity chapters.
 * @module lib/narrative/timelineMemory
 */

import type { LocalDateKey } from '../../types/dailyActivity.types';
import type { PhaseKind, TimelineChapter } from '../../types/narrative.types';
import type { FortnightBucket } from './timelineSeries';

type Acc = {
  start: LocalDateKey;
  end: LocalDateKey;
  phaseKind: PhaseKind;
  spanDays: number;
  activeDays: number;
  journalDays: number;
  moodDays: number;
};

export function mergeBucketsIntoChapters(buckets: readonly FortnightBucket[], windowStart: LocalDateKey): TimelineChapter[] {
  if (buckets.length === 0) return [];
  const accs: Acc[] = [];
  let cur: Acc | null = null;
  for (const b of buckets) {
    if (!cur || cur.phaseKind !== b.phaseKind) {
      if (cur) accs.push(cur);
      cur = {
        start: b.start,
        end: b.end,
        phaseKind: b.phaseKind,
        spanDays: b.spanDays,
        activeDays: b.activeDays,
        journalDays: b.journalDays,
        moodDays: b.moodDays,
      };
    } else {
      cur.end = b.end;
      cur.spanDays += b.spanDays;
      cur.activeDays += b.activeDays;
      cur.journalDays += b.journalDays;
      cur.moodDays += b.moodDays;
    }
  }
  if (cur) accs.push(cur);

  return accs.map((a, i) => ({
    id: `${windowStart}:chapter:${i}:${a.phaseKind}`,
    start: a.start,
    end: a.end,
    phaseKind: a.phaseKind,
    spanDays: a.spanDays,
    activeDays: a.activeDays,
    journalDays: a.journalDays,
    moodDays: a.moodDays,
    activityDensity: a.spanDays > 0 ? a.activeDays / a.spanDays : 0,
  }));
}
