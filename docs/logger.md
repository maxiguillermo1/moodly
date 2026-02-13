# Moodly — Logging & Observability Contract (Local‑First, Privacy‑Safe)

This app is local‑first and handles sensitive user text. **Observability must never compromise privacy.**

This file is a **legend + contract** for how we log runtime behavior in a way that is:
- structured (machine/grep friendly)
- low‑noise (budgeted + summarized)
- privacy‑safe (metadata only, redacted by default)
- Expo Go compatible
- dev‑first (most logs are dev‑only; production is minimal)

---
## Purpose

Logs exist to make system behavior **provable and readable**:
- performance phases (cold vs warm)
- cache lifecycle (warm/hit/invalidate)
- storage lifecycle + recovery (corruption quarantine/reset)
- session health snapshots

This is not debugging spam. If a log does not help future maintainers understand system behavior, it should not exist.

---
## How to enable / disable (developer ergonomics)

- **Dev mode** (`__DEV__ = true`):
  - PERF/CACHE/BOOT/DATA/DEV logs are enabled (budgeted) so you can diagnose cold vs warm paths.
  - Use this to validate performance work without adding UI instrumentation.

- **Production builds** (`__DEV__ = false`):
  - PERF/CACHE/BOOT/DATA/DEV logs are disabled by design.
  - WARN/ERROR remain allowed (metadata-only), WARN is rate-limited.
  - Console is patched via `installSafeConsole` to redact/suppress non-logger noise.

If you need to reduce dev noise further:
- Prefer summary-level logs over per-item logs.
- Keep new logs behind existing budgets (do not raise budgets unless justified).

---
## Structured format (non‑negotiable)

All logs must be emitted via the privacy‑safe `logger` (see `src/security` facade).

**No interpolated strings.** Variable data must be in the metadata object.

### Required shape

- **prefix**: `[LEVEL][channel]` (constant formatting)
- **event**: `channel.action` (dot‑separated; channel is the first segment)
- **meta**: object (metadata only; redacted)

Example:

```ts
logger.perf('calendar.loadEntries', {
  phase: 'cold',
  source: 'storage',
  durationMs: 24.6,
});
```

Console output (dev):
`[PERF][calendar] calendar.loadEntries { phase, source, durationMs }`

---
## Log levels

Levels are *semantic*, not “verbosity”.

- **BOOT**: app startup wiring and lifecycle (dev‑only)
- **PERF**: measured timings (dev‑only)
- **CACHE**: cache lifecycle summaries (dev‑only)
- **DATA**: storage lifecycle summaries (dev‑only)
- **WARN**: recoverable problems (allowed in prod; metadata‑only; rate‑limited)
- **DEV**: diagnostics (dev‑only; subject to budget)
- **ERROR**: unexpected failures (allowed in prod; metadata‑only)

---
## Log channels (ownership boundaries)

Channel is inferred from the **event prefix** (`calendar.*`, `storage.*`, etc).

Allowed channels:
- **app**: startup + top‑level wiring
- **session**: session warmup + health snapshots
- **storage**: AsyncStorage boundaries, corruption recovery, persistence
- **calendar**: Calendar screens + derived lookups
- **journal**: Journal list + edits
- **settings**: Settings computations

If you add a new surface area, add a new channel intentionally (and document it).

---
## Performance phases (explicit everywhere)

Every PERF log must include:
- **phase**: `'cold' | 'warm' | 'revalidate'`
- **source**: `'storage' | 'sessionCache'`
- **durationMs**: number

Definitions:
- **cold**: first access that can cause AsyncStorage read / JSON parse / index build
- **warm**: served from RAM caches (no storage read)
- **revalidate**: background refresh/verification (if/when we add it)

---
## Calendar performance instrumentation (dev-only)

Calendar performance work uses two complementary mechanisms:

- **Phase tags** via `perfProbe.setCulpritPhase('...')`
  - Best-effort: screens set a short phase string while a user-visible operation is expected to run.
  - Example: `CalendarScreen.scroll`, `CalendarView.scroll`, `CalendarScreen.recenter`

- **Breadcrumbs ring buffer** via `perfProbe.breadcrumb('...')`
  - Very small in-memory markers (names only, no payloads) used to attribute hitches when there is no explicit phase tag.
  - Breadcrumbs are emitted as a short tail in `perf.report` so you can correlate hitches with recent markers.

### Hitch phase attribution rules

Hitch detector attribution uses this priority order:

- **explicit phase tag** (screen sets `culpritPhase`)
- else **nearest breadcrumb within ±50ms**
- else **`DEV_METRO_OR_GC`** (suspected Metro/dev tooling stall or JS runtime/GC pause)

This makes “`unknown` hitches” effectively impossible in `perf.report`.

### `perf.report` fields (legend)

`perf.report` is the primary summary log and is emitted on screen focus-exit (blur).

- **`totalHitches`**: count of JS hitches (>24ms frame delta) since last flush
- **`phases[]`**: aggregated counts and p95/max per phase
- **`last[]`**: tail of individual hitches (timestamp + delta)
  - **`src`** (optional): `tag | crumb | dev` indicating attribution source
- **`crumbs[]`**: tail of breadcrumb markers (timestamp + name)
- **`DEV_METRO_OR_GC`**: “not attributable to app breadcrumbs/phases”, usually dev tooling or JS runtime pauses

### Noise reduction policy

To keep logs actionable:
- `perf.report` is always emitted (dev-only, metadata-only).
- Per-hitch `perf.hitch` logs are rate-limited and only emitted for large hitches or repeated `DEV_METRO_OR_GC` stalls.

---
## Aggregation rules (avoid noise)

Prefer **one summary log** over many micro logs.

Good:
- one `CACHE session.ready` snapshot after warmup
- one `PERF calendar.loadEntries` per screen focus

Bad:
- logging per cell/day in calendar grids
- logging cache hits for every read

---
## Log budget (anti‑spam)

In dev, logs are **budgeted**:
- per session total
- per channel

When a budget is exceeded, logs are suppressed and a single notice is emitted:
- `[DEV][log-budget] { ... }`

If you add new logs that risk runaway output, you must keep them summary‑level or add additional gating.

---
## What must NEVER be logged

Never log:
- user notes or any user‑entered text
- full `entries` or `settings` objects
- raw AsyncStorage JSON blobs
- anything that looks like a payload dump

If you need to debug sensitive content, use local debugging tools (breakpoints, dev menu) — not logs.

The logger enforces dev‑only guardrails (`assertNoSensitiveLogArgs`) and applies redaction (`redact`) to all metadata.

---
## Good vs bad examples

### Good

```ts
logger.warn('storage.entries.corrupt.detected', {
  key: 'moodly.entries',
  action: 'quarantineAndReset',
});
```

```ts
logger.cache('session.ready', {
  entries: 759,
  months: 25,
  years: 3,
  derived: ['sorted', 'byMonth', 'counts', 'yearIndex'],
  totalMs: 42.1,
});
```

### Bad

```ts
// ❌ leaks payload shape and likely contains user text
logger.warn('something', { entries });
```

```ts
// ❌ interpolated string
logger.warn(`failed for ${dateKey}`);
```

```ts
// ❌ never call console.* directly from UI code
console.log('debug', entries);
```

---
## Production behavior

In production:
- **PERF/CACHE/DEV/BOOT/DATA** are disabled
- **WARN** is allowed, metadata‑only, and rate‑limited
- **ERROR** is allowed, metadata‑only
- console is patched (`installSafeConsole`) to redact everything and suppress non‑logger noise

---
## When to add a new log

Add a new log when it helps answer one of:
- “Is this path cold or warm? How long did it take?”
- “Did a cache warm/hit/invalidate, and why?”
- “Did storage recovery happen? Was it safe and recoverable?”

If a log is not actionable or explainable, don’t add it.

---
## Dev/test: deterministic AsyncStorage chaos injection

The storage layer supports an opt-in, deterministic fault injector used for edge case hardening.

### Enable (Metro console)

Set `globalThis.__MOODLY_CHAOS__`:

- **enabled**: boolean (required)
- **seed**: number (recommended) deterministic RNG seed
- **minDelayMs / maxDelayMs**: injected delay window (deterministic per seed)
- **pFail**: probability of failure per op (deterministic per seed)
- **failNext**: fail next N calls per op (deterministic)
- **failNextByKey**: fail next N calls for an op+key (deterministic)
- **failOps**: allowlist of ops to affect

Supported ops: `getItem`, `setItem`, `removeItem`, `multiGet`, `multiSet`, `multiRemove`.

### Logging behavior

- Failures log `storage.chaos.injectedFailure` (WARN) with metadata only: `{ op, key, mode }`
- Chaos failure logs are rate-limited to avoid spam under high failure configs.


