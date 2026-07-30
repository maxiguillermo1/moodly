# Performance budgets (engineering targets)

Initial targets for Kairo iOS. **Thresholds are enforced in CI only where automated scripts exist**; others are manual release gates until device baselines are recorded in `PERFORMANCE_BASELINE.md`.

## Interaction

| Metric | Target | Notes |
|--------|--------|-------|
| First tap registration | 100% | No dead zones from hidden bar or overlays |
| Press visual feedback | Same frame when possible | `PlatformPressable` opacity |
| JS work on tab press | < 50 ms | No sync storage/network on press path |
| Warm tab switch (`tabPressToFocus` p95) | < 120 ms dev client | Release should be ≤ dev |
| Warm tab switch perceived | No visible pause | Qualitative simulator/device check |

## Navigation correctness

| Metric | Target |
|--------|--------|
| Pill vs screen mismatch | 0 |
| Rapid switch cycles (12+) | No freeze, no desync |
| Hidden bar touch steal | 0 |

## Startup

| Metric | Target |
|--------|--------|
| First usable shell | Local data + Today without network |
| Splash stuck | 0 |
| White/black flash | 0 |
| Blocking on network/analytics | 0 on critical path |

## Stability

| Metric | Target |
|--------|--------|
| Memory growth after 100 tab cycles | No upward trend (manual / Instruments) |
| Tab screen remount on switch | 0 |
| Animation hitch from tab bar | 0 under normal use |

## Measurement commands

```bash
# Dev client with probes
kairo perf

# Parse Metro log
npm run perf:report
npm run perf:tab

# Production bundle sanity (not runtime perf)
npm run export:ios-check

# Full release gate
kairo release
```

## Regression policy

1. Record baseline samples in `.runtime/perf/baseline/` (JSON from `report-performance.mjs`).
2. Compare after changes in `.runtime/perf/final/`.
3. Do not claim “optimized” without numeric before/after on the same environment.
