# Performance baseline

## Status

Baseline capture is **manual** on iOS Simulator (Expo Go dev client) with optional perf probe.

Automated JSON reports are written to:

```text
.runtime/perf/latest-report.json
```

Archive copies (manual):

```text
.runtime/perf/baseline/
.runtime/perf/final/
```

## How to capture

```bash
cd /Users/astrofy/Desktop/Kairo

# 1. Fresh dev start with probes
kairo perf

# 2. In simulator: cold launch, then exercise:
#    - Calendar → Today → Journal → Calendar (×10)
#    - Rapid switching
#    - Scroll lists, keyboard open/dismiss + tab switch

# 3. Generate report
npm run perf:report

# 4. Optional archive
cp .runtime/perf/latest-report.json .runtime/perf/baseline/$(date +%Y%m%d-%H%M)-tab-switch.json
```

## Events (stable names)

Defined in `src/perf/marks.ts` (`PerfMarks`).

Key navigation events:

- `perf.tabPressReceived` — press handler entry
- `perf.tabPressDispatched` — press → dispatch duration
- `perf.tabPressToFocus` — press → focused screen (warm tabs)
- `perf.navToFocus` — route change → screen focus
- `perf.navRouteChange` — route metadata change
- `perf.navReady` — NavigationContainer ready (cold launch)
- `perf.firstInteractionReady` — after interactions idle

## Environment notes

- **Expo Go + Metro dev** exaggerates JS thread cost vs release.
- **EXPO_PUBLIC_KAIRO_PERF_PROBE=1** adds RAF hitch loop — use only for profiling sessions.
- Compare release-like builds (`export:ios-check`, EAS preview) before App Store claims.

## Before/after template

| Workflow | Before p50 | Before p95 | After p50 | After p95 | Build |
|----------|------------|------------|-----------|-----------|-------|
| Today → Journal | — | — | — | — | dev + probe |
| Journal → Calendar | — | — | — | — | dev + probe |
| Cold navReady | — | — | — | — | dev + probe |

Fill this table when completing a performance pass.
