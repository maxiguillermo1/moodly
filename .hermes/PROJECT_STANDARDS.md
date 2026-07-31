# Project Standards — Kairo

Version: 1.0  
Repository: kairo (v0.6.0)

---

## Governance hierarchy

1. **[docs/AGENTS.md](../docs/AGENTS.md)** — product constitution (identity, UX, data philosophy, agent rules)
2. **[.hermes/ARCHITECTURE_PRINCIPLES.md](ARCHITECTURE_PRINCIPLES.md)** — design invariants
3. **[.hermes/DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md)** — documentation requirements
4. **[docs/architecture.md](../docs/architecture.md)** — canonical layer model and ESLint import rules
5. **[CONTRIBUTING.md](../CONTRIBUTING.md)** — contributor workflow

When policies conflict on product concerns, `docs/AGENTS.md` wins. For engineering process, `.hermes/` and `CONTRIBUTING.md` apply.

---

## Critical safety rules

| Rule | Rationale |
|------|-----------|
| **Local-first by default** — core journaling works offline with no account | User trust and privacy |
| **No silent data loss** — persist-first writes, serialized mutations, quarantine on corruption | Journal data is sensitive |
| **UI imports `src/storage` only** — never AsyncStorage or deep `src/data/*` in screens | Validation and cache integrity |
| **Local `YYYY-MM-DD` date keys** — never UTC `toISOString().slice(0,10)` | Day semantics match user timezone |
| **No sensitive logging** — UI uses `logger` from `src/security`, never `console.*` | App Store and user privacy |
| **Do not commit secrets** — `.env` stays local; run `npm run check:secrets` before release | Security |
| **Optional cloud is opt-in** — Supabase only when env vars are configured | No surprise network calls |

---

## Quality gates (required before merge)

**Standard gate (most changes):**

```bash
npm run validate
```

Runs: `typecheck` → `lint` → `test`.

**Persistence / storage changes — add:**

```bash
npm run test:storage-stress
```

**Release / native config / Metro / EAS changes:**

```bash
npm run validate:release
```

Runs: `validate` + `test:storage-stress` + `doctor` + `export:bundles-check` + `check:circular-deps` + `check:secrets`.

**iOS App Store candidate gate:**

```bash
npm run validate:ios-release
```

Runs: typecheck, lint, test, storage stress, doctor, iOS export, circular-deps check, secrets check, `npm audit`.

**CI:** pushes and PRs to `main` run `npm run validate:release` — see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

---

## Code style

- Match existing TypeScript/React Native module boundaries and naming
- Read [ARCHITECTURE.md](../ARCHITECTURE.md) and the relevant `src/` module before editing
- Verify claims against code — do not trust README alone
- Minimal scope: smallest correct diff
- ESLint import boundaries are enforced — see `eslint.config.cjs`

---

## Documentation requirements per change type

| Change type | Required doc updates |
|-------------|---------------------|
| New screen or feature | `docs/FEATURES.md` or `docs/CODEBASE_MAP.md` if boundaries shift |
| Architecture / import boundary change | `ARCHITECTURE.md`, `docs/architecture.md`, `TECHNICAL.md` |
| Storage key or schema change | `src/data/DATA_CONTRACT.md`, `docs/DATA_ARCHITECTURE.md` |
| Security / privacy change | `SECURITY.md`, `docs/SECURITY_CHECKLIST.md`, `docs/PRIVACY.md` |
| Performance claim | `docs/PERFORMANCE*.md` with measured numbers only |
| Release / version bump | `docs/CHANGELOG.md`, root `CHANGELOG.md` |
| Breaking change | `docs/CHANGELOG.md`, migration notes in relevant data docs |

---

## Pull request checklist

- [ ] Product rules in `docs/AGENTS.md` respected (timeline-first, calm UX)
- [ ] Import boundaries respected (UI → `src/storage` only)
- [ ] `npm run validate` passes (add `test:storage-stress` for persistence work)
- [ ] Documentation updated per change type table above
- [ ] No secrets, personal paths, or sensitive payloads in committed files
- [ ] PR template completed — [`.github/pull_request_template.md`](../.github/pull_request_template.md)
