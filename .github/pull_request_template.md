## Summary

<!-- What changed? Why? Keep it short and factual. -->

## Quality gates (required)

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run doctor` and `npm run export:bundles-check` when changing Metro/bundler-critical deps or native entry wiring

## Security checklist (required)

- [ ] No sensitive logs: no entries/notes/settings blobs in logs (metadata only).
- [ ] Storage reads: safe parse + validation; corrupted values quarantined; no crashes.
- [ ] Storage writes: validate date keys; validate mood grade; trim + clamp note length at boundary.
- [ ] Demo behavior gated: demo seeding dev-only or explicitly opted-in; never default in prod.
- [ ] No new network calls without explicit privacy/security review.
- [ ] Dependencies reviewed: pinned versions, changelog reviewed, `npm audit` checked.

## Documentation (if user-visible copy, settings, or architecture changed)

- [ ] `README.md` and/or **docs/** entries match this PR (see README “Documentation index”).
- [ ] [`docs/summary.md`](docs/summary.md) changelog entry appended when the change is milestone-sized (optional for tiny fixes).

- [ ] Calendar: year swipe, month open, month scroll, day tap/save still feels smooth
- [ ] Dev-only: captured `perf.report` before/after (or explain why not)

## If you touched storage/logging/network

Explain what you changed and why it’s safe:

- **Storage**:
- **Logging**:
- **Network**:

