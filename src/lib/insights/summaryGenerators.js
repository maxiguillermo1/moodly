/**
 * @fileoverview Aggregates **PeriodMetrics** from `DayActivity` + goals (deterministic).
 * @module lib/insights/summaryGenerators
 */
import { countDays, maxMoodLoggingStreak } from './trendCalculators';
export function countGoalProgressDaysInRange(goals, start, end) {
    const days = new Set();
    for (const g of goals) {
        if (g.status !== 'active')
            continue;
        for (const h of g.history) {
            if (typeof h.date !== 'string')
                continue;
            if (h.value <= 0)
                continue;
            if (h.date >= start && h.date <= end)
                days.add(h.date);
        }
    }
    return days.size;
}
export function countRemindersMarkedDone(activities) {
    let n = 0;
    for (const k of Object.keys(activities)) {
        const row = activities[k];
        if (!row)
            continue;
        for (const it of row.reminders.items) {
            if (it.done)
                n += 1;
        }
    }
    return n;
}
export function buildPeriodMetrics(activities, goals, start, end) {
    const daysInPeriod = Object.keys(activities).length;
    const daysWithMoodEntry = countDays(activities, (row) => row.mood.hasEntry);
    const daysWithJournalNote = countDays(activities, (row) => row.journal.present);
    const daysWithAnyActivity = countDays(activities, (row) => row.summary.hasAnyActivity);
    const daysWithHabitOn = countDays(activities, (row) => row.habits.selectedIds.length > 0);
    const maxMoodStreak = maxMoodLoggingStreak(activities);
    const goalProgressDays = countGoalProgressDaysInRange(goals, start, end);
    const remindersMarkedDone = countRemindersMarkedDone(activities);
    return {
        daysInPeriod,
        daysWithMoodEntry,
        daysWithJournalNote,
        daysWithAnyActivity,
        daysWithHabitOn,
        maxMoodLoggingStreak: maxMoodStreak,
        goalProgressDays,
        remindersMarkedDone,
    };
}
