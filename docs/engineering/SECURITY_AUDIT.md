# Security audit notes (Phase 10)

Date: 2026-07-30

## Secrets scan

```bash
npm run check:secrets
```

Result: **pass** — no obvious secrets in git-tracked files.

Manual `rg` review of `apikey`, `secret`, `token`, `password`, `service_role`, `supabase` in source (excluding `node_modules`):

| Area | Finding | Risk |
|------|---------|------|
| `README.md` / `docs/SUPABASE.md` | Placeholder `YOUR_PROJECT` URLs | OK — documentation |
| `supabase/config.toml` | `env(...)` references for OAuth secrets | OK — not committed values |
| `scripts/configure-oauth-providers.mjs` | Reads secrets from environment only | OK |
| `scripts/verify-supabase.mjs` | Test credentials in script for CI verify | OK — not production keys in repo |
| `EXPO_PUBLIC_*` | Only public Supabase anon URL/key pattern in docs | Verify `.env` is gitignored |

## Client key policy

- No service-role key in application source.
- OAuth secrets configured via Supabase dashboard / env scripts, not bundled.
- Journal/mood text must not appear in `logger.perf` or debug probes (enforced in `src/perf/probe.ts`).

## Recommended release gates

```bash
npm run check:secrets
npm audit --omit=dev --audit-level=moderate
npm run validate:ios-release
```

## Follow-ups

- Run Accessibility Inspector + archive under `.runtime/accessibility/` (Phase 9).
- Physical device release build via `eas build --profile production` when signing is configured.
