# Moodly — Insights & Reflection Engine (v0.6+)

**Status:** Foundation + **signal quality layer** — still **no mandatory new UI**; bundles are safe to consume from `src/storage` when a surface ships. Everything remains **local-first**, **deterministic**, and **inspectable**.

## Product philosophy

- Insights should feel **rare, earned, and calm** — closer to a journal companion than a productivity coach.
- **Trust over engagement:** we rank and filter to avoid spam, fake certainty, or guilt framing.
- **They serve the emotional timeline:** copy should help users **notice seasons and continuity in how life felt**, not optimize output.
- **Not** a chatbot, **not** cloud ML, **not** a second write path for mood/goals/journal, **not** a hidden “engagement score.”

### Tone examples (intent for i18n)

| Prefer (emotional memory) | Avoid (performative / productivity) |
|---------------------------|---------------------------------------|
| “You seemed calmer in the final weeks of this summer.” (hedged, seasonal) | “You were 17% more productive this month.” |
| “This stretch shows more presence in your log.” | “You crushed your habit goals.” |
| “A quieter chapter here — that can be its own season.” | “You fell behind on your targets.” |

## What this is

- A **read-only reflection pipeline** that composes existing stores into **`InsightBundle`** objects (`src/types/insights.types.ts`) whose `insights` array is **`QualifiedInsight[]`** (artifact + **confidence**, **topicId**, **signalScore**).
- A **signal quality pass** (`signalQualityEngine`) that dedupes overlapping observations (e.g. full mood week vs. mood streak), drops weak habit correlations when richer signals exist, and **caps** how many body insights appear before the closing reflective prompt.
- A **presentation timing** pass (`reflectionTiming` + `insightsReflectionStateStorage`) that applies **per-topic cooldowns** so the app does not nag-repeat the same observation. Cooldowns are **transparent constants** in `reflectionTiming.ts`, not learned black-box weights.

## What this is not

- **Not** a replacement for `moodly.entries`, habits, goals, or reminders — those remain canonical.
- **Not** a persisted “insights feed” blob — computed bundles are ephemeral; only **`moodly.insights.reflectionTiming`** stores last-surfaced timestamps per **topicId** (see below).
- **Not** allowed to embed **user journal text** or **user-authored goal titles** in templates — params are structural (counts, catalog habit labels, spans in days).

## Architecture

| Layer | Path | Role |
|-------|------|------|
| **Repository façade** | `src/data/repositories/insightsRepository.ts` | `getWeeklyInsightBundle`, `getMonthlyInsightBundle`, `recordSurfacedInsightTopics`; composes **`getDayActivityRange`** + **`goalsRepository.getGoals()`** → engine → qualify → optional cooldown filter. Options: `applyTimingPolicy`, `nowMs` (tests). |
| **Reflection engine** | `src/lib/insights/reflectionEngine.ts` | Raw **`InsightArtifact[]`** — stable ids, gentle rules (tentative vs. soft habit copy by co-day count; journal notes threshold 5+). |
| **Journey signal** | `src/lib/insights/journeySignals.ts` | Optional long-arc goal observation from merged **history dates** only (`spanDays`). |
| **Signal quality** | `src/lib/insights/signalQualityEngine.ts` | **Confidence** (`low` \| `medium` \| `high`), **topicId**, **signalScore**; dedupe, low-value suppression, sort, cap. |
| **Semantic topics** | `src/lib/insights/insightTopics.ts` | Maps artifacts → **topicId** (dedupe + cooldown keys). |
| **Timing** | `src/lib/insights/reflectionTiming.ts` | `filterInsightsByCooldowns`, `timingStateAfterRecording` — pure rules + ms constants. |
| **Timing persistence** | `src/data/storage/insightsReflectionStateStorage.ts` | Key **`moodly.insights.reflectionTiming`**: `{ schemaVersion: 1, topicLastSurfacedAtMs }`. |
| **Summary metrics** | `src/lib/insights/summaryGenerators.ts` | `buildPeriodMetrics` — transparent aggregates. |
| **Trends** | `src/lib/insights/trendCalculators.ts` | Streak / density helpers. |
| **Mood ordering** | `src/lib/insights/moodOrdinal.ts` | Grade ordering for soft correlations. |
| **Period windows** | `src/lib/insights/periodBounds.ts` | Local `YYYY-MM-DD` arithmetic (**no UTC slice**). |
| **Copy templates** | `src/lib/insights/insightCatalog.ts` | Default English strings — **UI should i18n `messageKey` + `params`**. |

## Confidence system

- Each **`QualifiedInsight`** exposes **`confidence`** explicitly (not inferred in UI from copy).
- **Low-confidence** correlations (e.g. habit co-occurrence with only a few days, short mood streaks in a week) are **suppressed** when at least one **medium+** observation is present, or when two stronger peers would make the low signal feel noisy.
- **Hedged copy** — `insights.habit.mood_cooccurrence_tentative` uses language that states **limited evidence**; `soft` is used once co-days reach five.

## Ranking, deduplication, and variety

- **Continuity dedupe:** if both “full mood week” and “mood streak” apply, the **full week** card wins (richer, less repetitive).
- **Topic dedupe:** same `topicId` keeps the highest **signalScore** (then confidence, then engine priority).
- **Caps:** week defaults to **four** body insights + **one** closing prompt; month allows **five** body + prompt.
- **Reflective snippets** — expanded pool in `insightCatalog.ts`; selection remains **deterministic** from period anchor (not random per tap).

## Reflection timing (cooldowns)

- Host UI should call **`insightsRepository.recordSurfacedInsightTopics(topicIds, nowMs?)`** after the user **actually sees** an insight strip (not on every background recompute).
- **`get*InsightBundle`** applies cooldowns on read using stored timestamps (unless `applyTimingPolicy: false` for export/debug).
- Cooldowns are **conservative** (multi-hour to multi-day per topic family); **`empty.week`** stays eligible (cooldown `0`) so quiet weeks still feel supported.

## Source-of-truth boundaries

1. **Writes** stay on domain repositories (`entriesRepository`, `goalsRepository`, …).  
2. **Daily Activity** (`dailyActivityRepository`) remains a **composed read model**; insights **reuse** it via `getDayActivityRange`.  
3. **Goals progress days** in metrics use **`Goal.history`** dates in the window (active goals only, `value > 0`). Journey span uses the same merged history.

## Privacy & safety

- **On-device only** — timing map uses the same AsyncStorage stack.  
- **Deterministic** — same data + same window ⇒ same raw ids and signal scores (timing filter depends on stored cooldown map + `nowMs`).  
- **Tone** — avoid shame, diagnosis language, toxic positivity, and “always on” streak pressure; habit correlations remind users **correlation ≠ causation**.  
- **Performance** — quality + timing are **O(n)** over small insight lists; no extra full-history scans beyond existing `getDayActivityRange` + goals list.

## Future (toward v1.0)

- Optional **session cache** for `InsightBundle` payloads (not required for current list sizes).  
- **User-visible Insights surface** (calm, opt-in) consuming **`QualifiedInsight`** with full i18n + accessibility.  
- **Export** including last timing map + optional snapshot of last bundle for support tooling.  
- **Seasonality / prior-month comparisons** when product wants richer month-over-month narratives (still rule-based).

## Related docs

- [`NARRATIVE.md`](./NARRATIVE.md) — longer-horizon **life timeline** narrative (phases, chapters, digest).  
- [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md) — keys + repository map.  
- [`DAILY_ACTIVITY.md`](./DAILY_ACTIVITY.md) — composed day read model.  
- [`AGENTS.md`](./AGENTS.md) — product constitution + storage rules.
