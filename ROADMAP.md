# Roadmap

This file is a **root-level summary**. The full time-ordered technical roadmap lives in **[docs/ROADMAP.md](docs/ROADMAP.md)**.

**North star:** the yearly emotional color map and continuity across months/seasons — see [docs/AGENTS.md](docs/AGENTS.md).

**Current version:** Kairo v0.6.0 (pre-1.0 refinement).

---

## Near — Release foundation

- Physical-device release evidence on current and older iPhones.
- App Store assets, privacy answers, support URL, review notes.
- Keep `validate:release` and dependency audit green.
- Year/month mood rendering and scroll stability as first-class product work.

## Next — Local data ownership

- Export/import for entries, settings, and extension data.
- Clear delete/reset semantics in user-facing language.
- Synthetic data harnesses for multi-year histories.
- Graduate remaining AsyncStorage blobs to SQLite where appropriate.

## Later — Sync and cloud

- Deliberate backup vs sync choice; preserve offline-first behavior.
- Identity, encryption, conflict resolution, tombstones — documented before backend dependencies.
- Optional Supabase sync already available; expand only with explicit consent and architecture review.

## Later — AI and insights

- Optional, privacy-forward, explainable — timeline remains primary.
- No raw journal upload without explicit opt-in.
- v0.6 shipped deterministic local reflection foundation (`insightsRepository`).

## Later — Emotional memory experiences

- Yearly/seasonal reflection surfaces from existing engines.
- Gentle "this time last year" experiences — subtle by default.

Full detail, guardrails, and collaboration stance: **[docs/ROADMAP.md](docs/ROADMAP.md)**.
