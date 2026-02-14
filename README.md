# Moodly

Local‑first daily mood + note tracking (Calendar year view + month timeline + Journal) built with Expo Go + React Native + TypeScript.

## 60‑second overview

- **Local‑first**: no backend, no network calls. Everything persists in AsyncStorage.
- **Privacy posture**: logs are **metadata‑only** and redacted. Never log user notes.
- **Resilience**: storage is treated as **untrusted** → safe parse + validate + quarantine/reset on corruption.
- **Performance mindset (v0.5 → v0.6)**:
  - v0.5: foundations (layer boundaries, safe logging, data contract)
  - v0.6: “Apple‑smooth calendar” work (virtualization tuning, MonthGrid render model cache, perf probes) + reliability hardening (write locks, chaos tests)

## How to run

```bash
npm install
npm run start
```

## Quality gates (run before opening a PR)

```bash
npm run lint
npx tsc --noEmit
npm test
```

## Where to look (map)

- **Calendar month timeline**: `src/screens/CalendarScreen.tsx`
- **Calendar year view pager**: `src/screens/CalendarView.tsx`
- **Calendar grid hot path**: `src/components/calendar/MonthGrid.tsx`
- **Month render model cache**: `src/components/calendar/monthModel.ts`
- **Month matrix cache (6×7)**: `src/lib/calendar/monthMatrix.ts`
- **Storage public API (UI imports from here)**: `src/storage/index.ts`
- **Entries storage + caches + quarantine + write lock**: `src/data/storage/moodStorage.ts`
- **Settings storage + quarantine + write lock**: `src/data/storage/settingsStorage.ts`
- **AsyncStorage wrapper (single chaos injection point)**: `src/data/storage/asyncStorage.ts`
- **Privacy‑safe logger facade**: `src/security/index.ts` (impl: `src/lib/security/logger.ts`)
- **Dev perf probes (hitch detector + perf.report)**: `src/perf/probe.ts`
- **Guardrails (module boundaries + UTC key ban)**: `eslint.config.cjs`
- **Engineering log (append‑only)**: `summary.md`
- **New engineer landing page**: `ENGINEERING_HANDOFF.md`

## Key invariants (do not break casually)

- **Date keys are local‑day** `YYYY-MM-DD` (no UTC slicing; `toISOString().slice(...)` is banned by ESLint).
- **Storage is untrusted**: all reads are safe‑parsed + validated; corruption triggers **quarantine + reset**, never a crash loop.
- **Persist‑first**: RAM caches update only after AsyncStorage write succeeds.
- **Writes are serialized** (prevents lost updates from concurrent saves).
- **UI never imports AsyncStorage** directly (must go through `src/storage`).
- **Logs are privacy‑safe**: metadata only; no notes/entries/settings payloads; UI never calls `console.*`.
- **Calendar hot paths stay allocation‑lean** (MonthGrid/DayCell; stable props; no state churn during scroll).

## Troubleshooting (common misconceptions)

- **“It froze for 10s” in dev**: check `perf.report`. If the phase is `DEV_METRO_OR_GC`, it’s usually Metro/GC/dev tooling, not app code.
- **Expo Go limits**: dev builds can hitch more than production; use our probes (`perf.report`, list profiler summaries) to compare changes apples‑to‑apples.
- **Tests on macOS**: Jest is configured with `watchman:false` to avoid Watchman permission crashes.
