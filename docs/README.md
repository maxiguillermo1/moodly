# Kairo documentation

Developer guides live in **`docs/`**. The repo root keeps **`README.md`** and **`LICENSE`** for discoverability; config and entry files (`app.json`, `package.json`, `App.tsx`, …) stay at the root for Expo and tooling.

## Start here

| Doc | Purpose |
|-----|---------|
| [AGENTS.md](./AGENTS.md) | **Master guide:** **emotional timeline (year mood map) as core product**, hierarchy vs habits/goals/reminders, **product maturity & versioning**, UX/iOS fluidity, data philosophy, agent profiles, tab bar rules |
| [FEATURES.md](./FEATURES.md) | Feature map: pillars, extensions, code pointers |
| [`.cursor/rules/`](../.cursor/rules/) | Cursor **`.mdc`** rules specialized for Kairo (mirrors AGENTS; globs for storage vs UI) |
| [ZERO_COMPROMISE.md](./ZERO_COMPROMISE.md) | Canonical quality bar and PR blockers |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | PR workflow and quality gates |
| [ENGINEERING_HANDOFF.md](./ENGINEERING_HANDOFF.md) | Short onboarding |
| [CODEBASE_MAP.md](./CODEBASE_MAP.md) | Plain-English map: features ↔ folders, naming rules, agent checklist |
| [architecture.md](./architecture.md) | Layer model, imports, state (canonical) |
| [ARCHITECTURE_STATE.md](./ARCHITECTURE_STATE.md) | Persistence snapshot: schema v1, repos, write locks |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Mechanical folder map |
| [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) | Storage/repository architecture and future data scaling |
| [INSIGHTS.md](./INSIGHTS.md) | **Insights & Reflection Engine** (v0.6): local-first bundles, privacy, boundaries |
| [NARRATIVE.md](./NARRATIVE.md) | **Narrative & life timeline** foundation: phases, chapters, continuity, emotional safety |
| [SCALABILITY.md](./SCALABILITY.md) | One-page index: scale levers, hot paths, links to full detail |
| [DATA_SAFETY.md](./DATA_SAFETY.md) | Integrity, date keys, corruption, smoke checklist |

## Product and shipping

| Doc | Purpose |
|-----|---------|
| [APP_STORE_READINESS.md](./APP_STORE_READINESS.md) | Native release checklist, privacy answers, review notes |
| [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) | Final release-candidate gates and manual QA matrix |
| [MOBILE_PRODUCTION_AUDIT.md](./MOBILE_PRODUCTION_AUDIT.md) | Production polish audit: stability, perf, a11y, security, remaining gaps |
| [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) | Privacy and logging |
| [RISK_REGISTER.md](./RISK_REGISTER.md) | Known release/platform risks and triggers |
| [ROADMAP.md](./ROADMAP.md) | Conservative roadmap for release, data ownership, sync/cloud, and AI |
| [CHANGELOG.md](./CHANGELOG.md) | **Versioning & maturity** (Kairo v0.6, roadmap to v1.0) + product-facing release notes |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | **EAS builds**, signing, env vars, store submit commands |
| [PRIVACY.md](./PRIVACY.md) / [TERMS.md](./TERMS.md) | Local-first policy text for store listings |

## Design and UI

| Doc | Purpose |
|-----|---------|
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Theme, tokens, appearance |
| [ACCESSIBILITY.md](./ACCESSIBILITY.md) | VoiceOver, Dynamic Type, Reduce Motion, and touch-target contract |
| [COMPONENTS.md](./COMPONENTS.md) | Reusable UI map |

## Performance and testing

| Doc | Purpose |
|-----|---------|
| [PERFORMANCE.md](./PERFORMANCE.md) | Perf index |
| [PERFORMANCE_BENCHMARKS.md](./PERFORMANCE_BENCHMARKS.md) | Foundation-hardening validation, thresholds, bundle sizes |
| [PERF_BASELINE.md](./PERF_BASELINE.md) | Baseline capture template |
| [PERF_RESULTS.md](./PERF_RESULTS.md) | Before/after results and release decision record |
| [STABILITY_NOTES.md](./STABILITY_NOTES.md) | Crash prevention, calendar/journal edge cases, validation |
| [perf-calendar.md](./perf-calendar.md) | Calendar scroll hot paths |
| [TESTING.md](./TESTING.md) | Jest, CI, TZ |

## Engineering log

| Doc | Purpose |
|-----|---------|
| [summary.md](./summary.md) | Milestone-sized engineering notes |

## Engineering reference (`docs/engineering/`)

Focused, measured engineering artifacts — toolchain baselines, performance budgets, navigation invariants, and audit notes. Root [TECHNICAL.md](../TECHNICAL.md) and [ARCHITECTURE.md](../ARCHITECTURE.md) summarize these; this folder holds the detail.

| Doc | Purpose |
|-----|---------|
| [engineering/TOOLCHAIN_BASELINE.md](./engineering/TOOLCHAIN_BASELINE.md) | Host + package versions (measured snapshot) |
| [engineering/DATA_MODEL.md](./engineering/DATA_MODEL.md) | Current data model reference |
| [engineering/NAVIGATION_INVARIANTS.md](./engineering/NAVIGATION_INVARIANTS.md) | Navigation behavior contracts |
| [engineering/PERFORMANCE_BASELINE.md](./engineering/PERFORMANCE_BASELINE.md) | Performance baseline capture |
| [engineering/PERFORMANCE_BUDGETS.md](./engineering/PERFORMANCE_BUDGETS.md) | Release performance budgets |
| [engineering/SECURITY_AUDIT.md](./engineering/SECURITY_AUDIT.md) | Security audit notes |
| [engineering/VISUAL_REGRESSION.md](./engineering/VISUAL_REGRESSION.md) | Visual regression testing notes |

Further files in this folder cover decisions, web deployment sequencing, App Store readiness, data safety, and change checklists.
