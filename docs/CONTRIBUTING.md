# Contributing to Kairo

Thanks for helping improve Kairo. This project values **small, reviewable changes**, **clear boundaries**, and **zero surprise** for users (local-first data, predictable behavior).

**AI / agent sessions:** start with [`AGENTS.md`](AGENTS.md) as the canonical in-repo guide for this app. Cursor loads shorter rules from [`.cursor/rules/`](../.cursor/rules/) (`.mdc` files) in addition to that doc.

## Before you open a PR

1. Read [`architecture.md`](./architecture.md) — especially **import rules** (UI → `src/storage` only, no `AsyncStorage` in screens, no UTC `toISOString().slice` day keys).
2. Run the gates that match your change:

   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```

   Add `npm run test:storage-stress` for persistence changes. Use
   `npm run validate:ios-release` for App Store/iOS readiness work and
   `npm run validate:release` for the broader all-platform release gate.

3. Use [`.github/pull_request_template.md`](../.github/pull_request_template.md) as a checklist (security + storage + calendar perf when relevant).

## Engineering expectations

- **Behavior / UX**: Unless explicitly agreed, changes must not alter user-visible flows, layouts, or persistence semantics.
- **TypeScript**: `strict` is on; unused locals/parameters fail the build (`tsconfig.json`).
- **Lint**: `eqeqeq` (with `== null` allowed), `prefer-const`, `no-var`, and **React Hooks** rules are enforced; UI layers use `no-console` (use `logger` from `src/security`).
- **Tests**: Prefer targeted tests for **date**, **storage**, and **calendar math** when touching those areas.

## Project layout (short)

| Area        | Location        | Rule of thumb                          |
|------------|-----------------|----------------------------------------|
| Screens    | `src/features/*/screens/` (+ `src/screens/index.ts` barrel) | Orchestration; import `storage` façade |
| Components | `src/components/` | Presentation; same import rule       |
| Persistence | `src/data/storage/` | Validation, caches, AsyncStorage   |
| Public API | `src/storage/`  | What UI may import for reads/writes    |

## Release posture

- Kairo is local-first: no backend, tracking, ads, analytics SDKs, or OS notifications today.
- App Store privacy answers and review notes live in `APP_STORE_READINESS.md`.
- Icon/screenshots/support URL/App Store Connect ownership are account/assets work, not code gates.

## Questions

Prefer issues or draft PRs for **large** or **behavior-changing** ideas so maintainers can align before a big diff.
