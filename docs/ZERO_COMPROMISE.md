# Kairo Zero-Compromise Engineering Policy

This document is the canonical quality bar for Kairo. It exists to keep future changes calm, local-first, private, fast, and emotionally consistent. **Expanded product identity, UX constitution, and agent onboarding:** [`docs/AGENTS.md`](./docs/AGENTS.md).

## Non-Negotiables

- Preserve the current product identity: **the emotional mood timeline (especially the year view) as the heart**, plus calm, minimal, premium, lightweight, reflective, and Apple-inspired surfaces around it.
- Do not redesign under the label of polish. Runtime quality improvements must preserve layout, flow, and visual language unless fixing a bug.
- Treat local user data as sensitive and irreplaceable. No silent data loss, no raw note logging, no unsafe schema downgrade, and no writes after persistence bootstrap failure.
- Treat local day keys as local calendar days. Do not derive day keys from UTC `toISOString().slice(...)`.
- Treat hot-path jank as a product bug. Calendar, Journal, Today, and extension surfaces should avoid no-op rerenders, hidden storage work, and unbounded caches.
- Treat accessibility as part of product quality, not an afterthought.

## PR Blockers

- UI importing raw AsyncStorage or deep `src/data/storage/*` modules.
- Data/storage importing screens, components, navigation, theme, UI, or React-facing perf barrels.
- Sensitive logs: note text, full entries, storage payloads, raw settings objects, or unnecessary error stacks.
- New date logic without DST/leap/year-boundary tests.
- New persistence shape without migration, corruption, and rollback notes.
- Hot-path calendar/list changes without a validation note or rollback plan.
- Dependency additions without bundle, audit, and platform impact review.

## Engineering Defaults

- Prefer small deterministic helpers over clever abstractions.
- Keep business rules in pure modules or storage/repository layers; keep screens focused on orchestration.
- Use mounted/focus/request guards around async UI state changes.
- Use copy-on-write storage caches: public reads return defensive copies; render snapshots may preserve stable read-only references when documented.
- Update docs in the same change when architecture, persistence, release gates, or risk posture changes.

## What Not To Build Yet

- Cloud sync, account systems, AI insights, import/export, encryption-at-rest UX, and collaboration are future platform decisions. Do not add partial infrastructure until product semantics, privacy guarantees, and migration paths are explicit.
