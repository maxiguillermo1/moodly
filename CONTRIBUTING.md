# Contributing to Kairo

Thanks for helping improve Kairo. This project values **small, reviewable changes**, **clear boundaries**, and **zero surprise** for users (local-first data, predictable behavior).

---

## Read first

| Doc | Why |
|-----|-----|
| [docs/AGENTS.md](docs/AGENTS.md) | **Product constitution** — emotional timeline hierarchy, UX rules, agent non-negotiables |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Living component map at repo root |
| [docs/architecture.md](docs/architecture.md) | Canonical layer model and ESLint import rules |
| [.hermes/PROJECT_STANDARDS.md](.hermes/PROJECT_STANDARDS.md) | Quality gates and safety rules |
| [.hermes/ARCHITECTURE_PRINCIPLES.md](.hermes/ARCHITECTURE_PRINCIPLES.md) | Design invariants (local-first, no silent data loss) |

**AI / Cursor sessions:** start with `docs/AGENTS.md`. Shorter rules live in [`.cursor/rules/`](.cursor/rules/) (`.mdc` files).

---

## Before you open a PR

1. Read [docs/architecture.md](docs/architecture.md) — especially **import rules** (UI → `src/storage` only, no `AsyncStorage` in screens, no UTC `toISOString().slice` day keys).
2. Run the gates that match your change:

   ```bash
   npm run validate
   ```

   Add `npm run test:storage-stress` for persistence changes. Use `npm run validate:ios-release` for App Store/iOS readiness work and `npm run validate:release` for the broader all-platform release gate.

3. Use [`.github/pull_request_template.md`](.github/pull_request_template.md) as a checklist.

---

## Engineering expectations

- **Behavior / UX**: Unless explicitly agreed, changes must not alter user-visible flows, layouts, or persistence semantics.
- **TypeScript**: `strict` is on; unused locals/parameters fail the build (`tsconfig.json`).
- **Lint**: `eqeqeq` (with `== null` allowed), `prefer-const`, `no-var`, React Hooks rules, and **import boundaries** enforced in `eslint.config.cjs`; UI layers use `no-console` (use `logger` from `src/security`).
- **Tests**: Prefer targeted tests for **date**, **storage**, and **calendar math** when touching those areas.

---

## Project layout (short)

| Area | Location | Rule of thumb |
|------|----------|---------------|
| Screens | `src/features/*/screens/` | Orchestration; import `storage` façade |
| Components | `src/components/` | Presentation; same import rule |
| Persistence | `src/data/storage/` | Validation, caches, SQLite/AsyncStorage |
| Public API | `src/storage/` | What UI may import for reads/writes |

Full map: [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

---

## PR checklist

- [ ] Read `docs/AGENTS.md` — change strengthens the emotional timeline (or is explicitly scoped infrastructure)
- [ ] Import boundaries respected (UI → `src/storage` only)
- [ ] Local `YYYY-MM-DD` date keys — no UTC derivation
- [ ] No sensitive logging (`console.*` banned in UI)
- [ ] `npm run validate` passes
- [ ] `npm run test:storage-stress` for persistence / schema work
- [ ] `npm run validate:release` for Metro, Babel, `app.config.ts`, or `eas.json` changes
- [ ] Documentation updated if public API, architecture, or storage contract changed
- [ ] No secrets or personal paths in committed files
- [ ] PR template completed

---

## Release posture

- Kairo is local-first: no required backend, tracking, ads, or analytics SDKs in the foundation product.
- Optional Supabase cloud sync is opt-in via env configuration — see [docs/SUPABASE.md](docs/SUPABASE.md).
- App Store privacy answers and review notes: [docs/APP_STORE_READINESS.md](docs/APP_STORE_READINESS.md).

---

## Questions

Prefer issues or draft PRs for **large** or **behavior-changing** ideas so maintainers can align before a big diff.

Extended contributor notes also live in [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).
