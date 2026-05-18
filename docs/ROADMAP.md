# Moodly Technical Roadmap

**Product line:** **Moodly v0.6** (semver **0.6.0**) — pre-1.0 refinement; see [`CHANGELOG.md`](./CHANGELOG.md) § Versioning and [`AGENTS.md`](./AGENTS.md) § Product maturity & versioning.

**North star:** the **yearly emotional color map** and continuity across months/seasons — see [`AGENTS.md`](./AGENTS.md) § Moodly identity (heart of the product).

**Product guardrails and agent rules:** [`AGENTS.md`](./AGENTS.md) (identity, calm/minimal defaults, testing expectations). This file is the **time-ordered** technical roadmap.

This roadmap is intentionally conservative. Moodly should scale by preserving trust, calmness, and local-first clarity, not by adding visible complexity early.

## Near: Release Foundation

- Complete physical-device release evidence on older and current iPhones.
- Finalize App Store assets, screenshots, support URL, privacy answers, age rating, and review notes.
- Keep `validate:release` and production dependency audit green.
- Continue hardening accessibility and device-only polish without changing visual identity.
- **Emotional timeline quality:** treat year/month mood rendering, color legibility, and scroll stability as **first-class product work** (not “nice polish later”).

## Next: Local Data Ownership

- Design export/import for entries, settings, and extension data.
- Define delete/reset semantics in user-facing language.
- Add larger synthetic data harnesses for multi-year mood/journal histories and dense reminders.
- Decide when to graduate from AsyncStorage blobs to SQLite or sharded local stores.
- Expand the new `moodly.tasks` model into Inbox/Upcoming/Lists/detail UI only if it stays lightweight and **never** reads as a productivity dashboard competing with the mood map.
- Extend `moodly.goals` with richer milestones and reminders **only** when framed as **context for emotional arcs**, after physical-device validation.

## Later: Sync And Cloud Readiness

- Choose backup vs sync deliberately; backup is simpler and lower risk than real-time multi-device sync.
- Define identity/auth, encryption, conflict resolution, offline merge, tombstones, and migration from local-only installs.
- Preserve local-first behavior: the app should remain useful offline and should never require an account for core reflection.
- Do not add backend dependencies until data ownership, deletion, and recovery semantics are documented.

## Later: AI And Insights

- AI should be optional, privacy-forward, and explainable — and **must not** reframing Moodly as an “assistant” product; the **color timeline remains primary**.
- Default posture: no raw journal note upload without explicit opt-in.
- Prefer local or on-device preprocessing where practical.
- Any AI insight must feel **reflective and emotional**, not performative — avoid clinical claims, scoring, productivity percentages, or manipulative engagement loops.
- Required platform work: export pipeline, consent state, data deletion guarantees, provider risk review, and sensitive-log safeguards.

## Later: Emotional Memory Experiences (non-AI)

- Yearly and seasonal **reflection surfaces** that read from existing insights/narrative engines (calm, opt-in).
- Gentle **“this time last year”** and **chapter** experiences tied to the same local stores — subtle by default.

## Later: Collaboration

Collaboration is not aligned with Moodly’s current private reflection identity. If explored, it should start with controlled export/share flows, not live shared journals. Real collaboration would require accounts, permissions, sync conflict handling, abuse controls, and a new privacy model.
