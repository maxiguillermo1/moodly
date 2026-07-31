/**
 * @fileoverview **Continuity** — compares first vs second half of the window (gentle rebuild signal).
 * @module lib/narrative/continuityAnalyzer
 */
export function analyzeContinuity(rows) {
    if (rows.length < 14) {
        return { firstJournalDays: 0, secondJournalDays: 0, journalRebuildSignal: false };
    }
    const mid = Math.floor(rows.length / 2);
    let fj = 0;
    let sj = 0;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].journalNote) {
            if (i < mid)
                fj += 1;
            else
                sj += 1;
        }
    }
    const journalRebuildSignal = fj >= 2 && sj >= fj + 4;
    return { firstJournalDays: fj, secondJournalDays: sj, journalRebuildSignal };
}
