# Moodly — Narrative Intelligence & Life Timeline Engine

**Status:** Foundation (v0.6+) — **no new UI routes** in this milestone. All logic is **local-first**, **deterministic**, and **inspectable**. This is **not** generative AI, **not** therapy, and **not** a hidden life score.

**Product fit:** Narrative systems exist to deepen **emotional continuity** and **memory of phases** in service of the **yearly mood color map** — they are **not** analytics dashboards or productivity narratives.

## What this is

A **second read layer** above Daily Activity that turns **structural signals** (activity density, journal presence, mood presence, weekday/weekend balance) into:

- **`TimelineChapter[]`** — merged **phases** (quiet, steady, reflective, high activity, sparse) over local calendar time.
- **`NarrativeArtifact[]`** — i18n-ready **`messageKey` + numeric params** (no journal text, no user goal titles).
- **`digest`** — stable fingerprint for **future incremental snapshots / export** (same structural inputs ⇒ same digest).

## What this is not

- **Not** a replacement for `moodly.entries`, goals, habits, or tasks — those remain canonical.
- **Not** clinical assessment, diagnosis, or “emotional truth” claims — language stays **observational** and **uncertainty-aware**.
- **Not** engagement optimization — narratives are **capped**, **deduped by message family**, and the closing line is always a **gentle span overview** (calm framing).

## Module map (requested engines)

| Concept | Path | Role |
|--------|------|------|
| **Narrative engine** | `src/lib/narrative/narrativeEngine.ts` | Orchestrates phases → chapters → transitions → continuity → rhythm → milestones → capped artifacts + digest. |
| **Phase detection** | `src/lib/narrative/phaseDetection.ts` + `timelineSeries.ts` | Fortnight buckets + **ratio-based** `PhaseKind` labels (`sparse` / `quiet` / `steady` / `high_activity` / `reflective`). |
| **Timeline memory** | `src/lib/narrative/timelineMemory.ts` | Merges adjacent buckets into **`TimelineChapter`** continuity segments. |
| **Transition detection** | `src/lib/narrative/transitionDetection.ts` | Adjacent chapter kind changes → soft “toward consistency” / “soft pause” artifacts. |
| **Continuity analyzer** | `src/lib/narrative/continuityAnalyzer.ts` | First vs second half **journal note day** counts → optional “rebuilding” signal (thresholded). |
| **Seasonal / rhythm** | `src/lib/narrative/seasonalPatternDetector.ts` | **Weekend vs weekday** activity balance (local weekday), with minimum coverage + margin rules. |
| **Milestone engine** | `src/lib/narrative/milestoneEngine.ts` | Longest **journal-note streak** in-window (reuses `longestStreakOverSortedDates`). |
| **Day signals** | `src/lib/narrative/daySignals.ts` | Projects `DayActivity` → boolean/numeric row (**no note text** in narrative params). |
| **Copy catalog** | `src/lib/narrative/narrativeCatalog.ts` | Default English templates for tests/dev; **UI must i18n** `messageKey`. |
| **Digest** | `src/lib/narrative/narrativeDigest.ts` | Deterministic hash input for caching/export evolution. |
| **Repository** | `src/data/repositories/narrativeRepository.ts` | **`getNarrativeBundle(anchorDay, { rangeDays })`** → bounded `getDayActivityRange` + engine + `composedAt` stamp. |

## Life timeline concepts (data model)

- **Fortnight bucket** — fixed ~14 local-day window aligned at range start; carries counts only.
- **Chapter** — merged run of the same `PhaseKind` across consecutive buckets; exposes `activityDensity = activeDays / spanDays`.
- **Transition** — boundary between chapters where `PhaseKind` changes; artifacts reference **`transitionDay`** (local key).
- **Milestone** — longest journal-note streak in the selected window (structural), not a social streak score.

## Emotional safety & trust

- **No pseudo-therapy** — we describe **patterns in the log**, not inner emotional states as facts.
- **No gamification** — no points, ranks, or “better than last month” competition strings.
- **Hedged transitions** — copy uses “shifts”, “softens”, “a bit more”, not “you improved as a person”.
- **Confidence** on artifacts is **transparent** (`low` \| `medium` \| `high`) for future UI gating.

## Performance & storage strategy

- **Today:** one `getDayActivityRange` per narrative request, default **126-day** inclusive window (clamped to `MAX_DAILY_ACTIVITY_RANGE_DAYS` from `dailyActivityRepository`).
- **Next:** persist **monthly rollups** or reuse `digest` to skip re-stringifying identical windows; keep invalidation tied to entry mutations (see `docs/DATA_ARCHITECTURE.md` evolution notes).

## Source-of-truth boundaries

1. **Reads** only through **`getDayActivityRange`** (+ optional goal-span helpers used elsewhere).
2. **No writes** to mood/goals/habits from narrative code.
3. **No new user-data blob required** for this foundation — digest is for future cache/export only.

## Related docs

- [`INSIGHTS.md`](./INSIGHTS.md) — weekly/monthly **insight bundles** (shorter horizon).
- [`DAILY_ACTIVITY.md`](./DAILY_ACTIVITY.md) — composed day read model.
- [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md) — repository list.
- [`AGENTS.md`](./AGENTS.md) — product constitution + storage façade rules.
