## Summary

<!-- What changed? Why? Keep it short and factual. -->

## Quality gates (required)

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm test`

## Security checklist (required)

- [ ] No sensitive logs: no entries/notes/settings blobs in logs (metadata only).
- [ ] Storage reads: safe parse + validation; corrupted values quarantined; no crashes.
- [ ] Storage writes: validate date keys; validate mood grade; trim + clamp note length at boundary.
- [ ] Demo behavior gated: demo seeding dev-only or explicitly opted-in; never default in prod.
- [ ] No new network calls without explicit privacy/security review.
- [ ] Dependencies reviewed: pinned versions, changelog reviewed, `npm audit` checked.

## Perf checklist (required if you touched Calendar/Journal)

- [ ] Calendar: year swipe, month open, month scroll, day tap/save still feels smooth
- [ ] Dev-only: captured `perf.report` before/after (or explain why not)

## If you touched storage/logging/network

Explain what you changed and why it’s safe:

- **Storage**:
- **Logging**:
- **Network**:

