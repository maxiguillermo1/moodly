/**
 * @fileoverview **Signal quality** — confidence, dedupe, caps, ranking (deterministic).
 * @module lib/insights/signalQualityEngine
 */
import { continuityMoodFamily, topicIdForArtifact } from './insightTopics';
const CONF_RANK = { low: 0, medium: 1, high: 2 };
function numParam(params, key) {
    const v = params[key];
    if (typeof v === 'number' && Number.isFinite(v))
        return v;
    if (typeof v === 'string') {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}
function confidenceFor(artifact, ctx) {
    const { period, metrics } = ctx;
    switch (artifact.messageKey) {
        case 'insights.empty.week_gentle':
            return 'high';
        case 'insights.month.summary_sparse':
        case 'insights.month.summary_rich':
            return metrics.daysWithAnyActivity >= 14 ? 'high' : 'medium';
        case 'insights.streak.mood_logging': {
            const days = numParam(artifact.params, 'days');
            if (period.kind === 'week' && days <= 3)
                return 'low';
            if (days >= 7)
                return 'high';
            if (days >= 5)
                return 'medium';
            return 'low';
        }
        case 'insights.streak.journal_notes': {
            const days = numParam(artifact.params, 'days');
            if (days >= 10)
                return 'high';
            if (days >= 6)
                return 'medium';
            return 'low';
        }
        case 'insights.week.full_mood_week':
            return 'high';
        case 'insights.week.active_more_than_prior':
        case 'insights.week.goal_logs_more_than_prior': {
            const cur = numParam(artifact.params, 'current');
            const prior = numParam(artifact.params, 'prior');
            const d = cur - prior;
            if (d >= 2)
                return 'high';
            if (d === 1)
                return 'medium';
            return 'low';
        }
        case 'insights.habit.mood_cooccurrence_soft': {
            const co = numParam(artifact.params, 'coDays');
            if (co >= 7)
                return 'high';
            if (co >= 5)
                return 'medium';
            return 'low';
        }
        case 'insights.habit.mood_cooccurrence_tentative':
            return 'low';
        case 'insights.goal.journey_arc_soft': {
            const span = numParam(artifact.params, 'spanDays');
            if (span >= 120)
                return 'high';
            if (span >= 75)
                return 'medium';
            return 'low';
        }
        case 'insights.prompt.reflective_rotation':
            return 'medium';
        default:
            return 'medium';
    }
}
function signalScoreFor(artifact, ctx, confidence) {
    const { period, metrics, priorMetrics } = ctx;
    let score = 50;
    switch (artifact.messageKey) {
        case 'insights.week.full_mood_week':
            score = 98;
            break;
        case 'insights.empty.week_gentle':
            score = 55;
            break;
        case 'insights.goal.journey_arc_soft': {
            const span = numParam(artifact.params, 'spanDays');
            score = span >= 120 ? 93 : span >= 75 ? 86 : 78;
            break;
        }
        case 'insights.week.active_more_than_prior':
        case 'insights.week.goal_logs_more_than_prior': {
            const cur = numParam(artifact.params, 'current');
            const prior = numParam(artifact.params, 'prior');
            const d = cur - prior;
            score = d >= 3 ? 88 : d >= 2 ? 82 : 72;
            break;
        }
        case 'insights.month.summary_rich':
            score = 76;
            break;
        case 'insights.month.summary_sparse':
            score = 62;
            break;
        case 'insights.streak.journal_notes': {
            const days = numParam(artifact.params, 'days');
            score = 58 + Math.min(days, 14) * 2;
            break;
        }
        case 'insights.streak.mood_logging': {
            const days = numParam(artifact.params, 'days');
            score = 52 + Math.min(days, 10) * 3;
            break;
        }
        case 'insights.habit.mood_cooccurrence_soft': {
            const co = numParam(artifact.params, 'coDays');
            score = 60 + co * 4;
            break;
        }
        case 'insights.habit.mood_cooccurrence_tentative': {
            const co = numParam(artifact.params, 'coDays');
            score = 42 + co * 5;
            break;
        }
        case 'insights.prompt.reflective_rotation':
            score = 22;
            break;
        default:
            score = 50;
    }
    if (confidence === 'low')
        score -= 8;
    if (confidence === 'high')
        score += 4;
    void period;
    void priorMetrics;
    void metrics;
    return Math.max(0, Math.min(100, Math.round(score)));
}
function betterQualified(a, b) {
    if (a.signalScore !== b.signalScore)
        return a.signalScore > b.signalScore;
    if (CONF_RANK[a.confidence] !== CONF_RANK[b.confidence])
        return CONF_RANK[a.confidence] > CONF_RANK[b.confidence];
    if (a.priority !== b.priority)
        return a.priority < b.priority;
    return a.id.localeCompare(b.id) < 0;
}
/** When both “full week mood” and a mood streak appear, keep the richer card. */
function dedupeContinuityMood(list) {
    const cont = list.filter((q) => continuityMoodFamily(q));
    if (cont.length <= 1)
        return list;
    const full = cont.find((q) => q.messageKey === 'insights.week.full_mood_week');
    const keeper = full ?? cont.reduce((best, q) => (betterQualified(q, best) ? q : best));
    const drop = new Set(cont.filter((q) => q.id !== keeper.id).map((q) => q.id));
    return list.filter((q) => !drop.has(q.id));
}
function dedupeByTopicId(list) {
    const best = new Map();
    for (const q of list) {
        const prev = best.get(q.topicId);
        if (!prev || betterQualified(q, prev))
            best.set(q.topicId, q);
    }
    return [...best.values()];
}
function dropLowValueWhenRich(list) {
    const isPrompt = (q) => q.messageKey === 'insights.prompt.reflective_rotation';
    const isEmptyWeek = (q) => q.messageKey === 'insights.empty.week_gentle';
    const strong = list.filter((q) => !isPrompt(q) && (q.confidence === 'high' || q.confidence === 'medium'));
    const strongCount = strong.length;
    return list.filter((q) => {
        if (isEmptyWeek(q) || isPrompt(q))
            return true;
        if (q.confidence !== 'low')
            return true;
        if (q.messageKey === 'insights.habit.mood_cooccurrence_tentative') {
            return strongCount < 1;
        }
        return strongCount < 2;
    });
}
function sortForPresentation(list) {
    const isPrompt = (q) => q.messageKey === 'insights.prompt.reflective_rotation';
    return list.slice().sort((a, b) => {
        if (isPrompt(a) !== isPrompt(b))
            return isPrompt(a) ? 1 : -1;
        if (b.signalScore !== a.signalScore)
            return b.signalScore - a.signalScore;
        if (CONF_RANK[b.confidence] !== CONF_RANK[a.confidence])
            return CONF_RANK[b.confidence] - CONF_RANK[a.confidence];
        if (a.priority !== b.priority)
            return a.priority - b.priority;
        return a.id.localeCompare(b.id);
    });
}
function capList(sorted, maxBody) {
    const isPrompt = (q) => q.messageKey === 'insights.prompt.reflective_rotation';
    const body = sorted.filter((q) => !isPrompt(q)).slice(0, maxBody);
    const prompt = sorted.find(isPrompt);
    return prompt ? [...body, prompt] : body;
}
const DEFAULT_MAX_BODY = {
    week: 4,
    month: 5,
};
/**
 * Maps raw engine artifacts → qualified, deduped, ranked, capped list (no I/O).
 */
export function qualifyInsights(raw, ctx, options) {
    const maxBody = options?.maxBodyInsights ?? DEFAULT_MAX_BODY[ctx.period.kind];
    let list = raw.map((a) => {
        const topicId = topicIdForArtifact(a);
        const confidence = confidenceFor(a, ctx);
        const signalScore = signalScoreFor(a, ctx, confidence);
        return { ...a, topicId, confidence, signalScore };
    });
    list = dedupeContinuityMood(list);
    list = dedupeByTopicId(list);
    list = dropLowValueWhenRich(list);
    const sorted = sortForPresentation(list);
    return capList(sorted, maxBody);
}
/** Deterministic merge of extra artifacts (e.g. journey) before {@link qualifyInsights}. */
export function mergeRawInsights(engine, extras) {
    const seen = new Set(engine.map((e) => e.id));
    const out = [...engine];
    for (const e of extras) {
        if (!seen.has(e.id)) {
            seen.add(e.id);
            out.push(e);
        }
    }
    return out;
}
