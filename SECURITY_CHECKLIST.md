# Security Checklist (Engineering Rules)

This repo contains user-generated journaling content that may be sensitive.
This checklist is an engineering baseline to prevent accidental privacy/security regressions.

## PR Reviewer Checklist

- [ ] **No sensitive logs**: do not log entries/notes/settings payloads or full storage blobs. Logs must be metadata-only (counts, timings, keys).
- [ ] **Storage reads**: safe parse + runtime validation; corrupted values are quarantined to `moodly.<key>.corrupt.<timestamp>`; app must not crash.
- [ ] **Storage writes**: validate date keys (`YYYY-MM-DD`); validate mood grade; trim and clamp note length at the data boundary.
- [ ] **Demo behavior gated**: demo seeding is dev-only or explicitly opted-in via a dev flag; never runs by default in production.
- [ ] **Network changes**: no new network calls without explicit privacy/security review (what is sent, where, and why).
- [ ] **Dependencies**: pin versions; review changelogs; run `npm audit` routinely; avoid adding packages that execute remote code or evaluate strings.

## Implementation Notes (How we enforce)

- **Logging**:
  - Use `src/lib/security/logger.ts` for internal logs.
  - `console.*` is patched at startup to be redacted and production-safe.
- **Persistence**:
  - Storage access lives in `src/data/storage/*` and performs validation/quarantine.

