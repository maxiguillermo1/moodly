/**
 * @fileoverview **Narrative engine** — composes chapters, transitions, continuity, rhythm, milestones.
 * @module lib/narrative/narrativeEngine
 */
import { analyzeContinuity } from './continuityAnalyzer';
import { buildSortedDaySignals } from './daySignals';
import { detectPhaseBuckets } from './phaseDetection';
import { journalStreakMilestoneEligible, longestJournalNoteStreak } from './milestoneEngine';
import { computeNarrativeDigest } from './narrativeDigest';
import { detectWeekendWeekdayRhythm } from './seasonalPatternDetector';
import { detectChapterTransitions } from './transitionDetection';
import { mergeBucketsIntoChapters } from './timelineMemory';
function idFor(windowStart, key, suffix) {
    return `${windowStart}:${key}:${suffix}`;
}
function confidenceForChapter(ch) {
    if (ch.spanDays >= 42 && ch.activeDays >= 18)
        return 'high';
    if (ch.spanDays >= 21 && ch.activeDays >= 8)
        return 'medium';
    return 'low';
}
function chapterMessageKey(kind) {
    switch (kind) {
        case 'steady':
            return 'narrative.chapter.steady_rhythm';
        case 'high_activity':
            return 'narrative.chapter.more_present';
        case 'quiet':
        case 'sparse':
            return 'narrative.chapter.quieter_span';
        case 'reflective':
            return 'narrative.chapter.reflective_stretch';
        default:
            return null;
    }
}
function pushArtifact(out, seen, a) {
    const k = a.messageKey;
    if (seen.has(k))
        return;
    seen.add(k);
    out.push(a);
}
/**
 * Deterministic narrative bundle for a local date window (no I/O).
 */
export function runNarrativeEngine(input) {
    const { window, activities } = input;
    const { start, end } = window;
    const rows = buildSortedDaySignals(start, end, activities);
    let activeDays = 0;
    let journalDays = 0;
    let moodDays = 0;
    for (const r of rows) {
        if (r.hasActivity)
            activeDays += 1;
        if (r.journalNote)
            journalDays += 1;
        if (r.moodPresent)
            moodDays += 1;
    }
    const buckets = detectPhaseBuckets(start, end, rows);
    const chapters = mergeBucketsIntoChapters(buckets, start);
    const transitions = detectChapterTransitions(chapters);
    const continuity = analyzeContinuity(rows);
    const rhythm = detectWeekendWeekdayRhythm(rows);
    const journalStreak = longestJournalNoteStreak(rows);
    const out = [];
    const seen = new Set();
    const chapterCandidates = chapters
        .filter((c) => c.spanDays >= 12)
        .slice()
        .sort((a, b) => (b.spanDays !== a.spanDays ? b.spanDays - a.spanDays : a.start.localeCompare(b.start)));
    let chapterArtifacts = 0;
    for (const ch of chapterCandidates) {
        if (chapterArtifacts >= 2)
            break;
        const mk = chapterMessageKey(ch.phaseKind);
        if (!mk)
            continue;
        const conf = confidenceForChapter(ch);
        if (conf === 'low' && rows.length >= 56 && chapterCandidates.length > 1)
            continue;
        pushArtifact(out, seen, {
            id: idFor(start, mk, ch.id),
            messageKey: mk,
            confidence: conf,
            phaseTag: 'chapter',
            params: { spanDays: ch.spanDays, activeDays: ch.activeDays, chapterStart: ch.start, chapterEnd: ch.end },
        });
        chapterArtifacts += 1;
    }
    let tCount = 0;
    for (const t of transitions) {
        if (tCount >= 2)
            break;
        const fromQ = t.from === 'quiet' || t.from === 'sparse';
        const toActive = t.to === 'high_activity' || t.to === 'steady';
        const toQuiet = t.to === 'quiet' || t.to === 'sparse';
        const fromBusy = t.from === 'high_activity' || t.from === 'steady';
        if (fromQ && toActive) {
            pushArtifact(out, seen, {
                id: idFor(start, 'narrative.transition.toward_consistency', t.at),
                messageKey: 'narrative.transition.toward_consistency',
                confidence: 'medium',
                phaseTag: 'transition',
                params: { transitionDay: t.at },
            });
            tCount += 1;
        }
        else if (fromBusy && toQuiet) {
            pushArtifact(out, seen, {
                id: idFor(start, 'narrative.transition.soft_pause', t.at),
                messageKey: 'narrative.transition.soft_pause',
                confidence: 'medium',
                phaseTag: 'transition',
                params: { transitionDay: t.at },
            });
            tCount += 1;
        }
    }
    if (continuity.journalRebuildSignal && rows.length >= 28) {
        pushArtifact(out, seen, {
            id: idFor(start, 'narrative.continuity.journal_rebuilding', 'v0'),
            messageKey: 'narrative.continuity.journal_rebuilding',
            confidence: rows.length >= 56 ? 'medium' : 'low',
            phaseTag: 'continuity',
            params: { firstHalf: continuity.firstJournalDays, secondHalf: continuity.secondJournalDays },
        });
    }
    if (rhythm.notableWeekendLean) {
        pushArtifact(out, seen, {
            id: idFor(start, 'narrative.seasonal.weekend_vs_weekday', 'v0'),
            messageKey: 'narrative.seasonal.weekend_vs_weekday',
            confidence: 'medium',
            phaseTag: 'seasonal',
            params: {
                weekendRatePct: Math.round(rhythm.weekendRate * 100),
                weekdayRatePct: Math.round(rhythm.weekdayRate * 100),
            },
        });
    }
    if (journalStreakMilestoneEligible(journalStreak, rows.length)) {
        pushArtifact(out, seen, {
            id: idFor(start, 'narrative.milestone.journal_streak_window', 'v0'),
            messageKey: 'narrative.milestone.journal_streak_window',
            confidence: journalStreak >= 14 ? 'high' : 'medium',
            phaseTag: 'milestone',
            params: { streakDays: journalStreak },
        });
    }
    const cappedBody = out.slice(0, 6);
    const spanDays = rows.length;
    const summaryConf = spanDays >= 56 ? 'medium' : 'low';
    const summary = {
        id: idFor(start, 'narrative.summary.gentle_span_overview', 'v0'),
        messageKey: 'narrative.summary.gentle_span_overview',
        confidence: summaryConf,
        phaseTag: 'summary',
        params: { spanDays, activeDays },
    };
    const artifacts = [...cappedBody, summary];
    const digest = computeNarrativeDigest(window, chapters, { activeDays, journalDays, moodDays });
    return {
        window,
        composedAt: 0,
        chapters,
        artifacts,
        digest,
    };
}
/** Fill `composedAt` at the repository boundary (keeps pure engine tests stable). */
export function stampNarrativeBundle(bundle, composedAt) {
    return { ...bundle, composedAt };
}
