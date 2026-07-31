/**
 * @fileoverview Semantic **topic ids** for deduplication, cooldowns, and diversity.
 * @module lib/insights/insightTopics
 */
/**
 * Stable topic key for an artifact (same observation family ⇒ same cooldown bucket
 * unless habit id splits co-occurrence).
 */
export function topicIdForArtifact(artifact) {
    switch (artifact.messageKey) {
        case 'insights.empty.week_gentle':
            return 'empty.week';
        case 'insights.streak.mood_logging':
            return 'streak.mood';
        case 'insights.streak.journal_notes':
            return 'streak.journal';
        case 'insights.week.active_more_than_prior':
            return 'week.compare.activity';
        case 'insights.week.goal_logs_more_than_prior':
            return 'week.compare.goals';
        case 'insights.week.full_mood_week':
            return 'week.full_mood';
        case 'insights.habit.mood_cooccurrence_soft':
        case 'insights.habit.mood_cooccurrence_tentative': {
            const tail = artifact.id.split(':').slice(2).join(':');
            return tail ? `habit.mood_co:${tail}` : 'habit.mood_co:unknown';
        }
        case 'insights.goal.journey_arc_soft':
            return 'goal.journey_arc';
        case 'insights.prompt.reflective_rotation':
            return 'reflection.prompt';
        case 'insights.month.summary_sparse':
        case 'insights.month.summary_rich':
            return 'month.summary';
        default:
            return `unknown:${artifact.messageKey}`;
    }
}
/** Mood “continuity” insights — only the strongest should surface together. */
export function continuityMoodFamily(artifact) {
    return (artifact.messageKey === 'insights.streak.mood_logging' || artifact.messageKey === 'insights.week.full_mood_week');
}
