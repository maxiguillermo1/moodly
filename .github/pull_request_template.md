## Summary

<!-- What changed? Why? Keep it short and factual. -->

## Security checklist (required)

- [ ] No sensitive logs: no entries/notes/settings blobs in logs (metadata only).
- [ ] Storage reads: safe parse + validation; corrupted values quarantined; no crashes.
- [ ] Storage writes: validate date keys; validate mood grade; trim + clamp note length at boundary.
- [ ] Demo behavior gated: demo seeding dev-only or explicitly opted-in; never default in prod.
- [ ] No new network calls without explicit privacy/security review.
- [ ] Dependencies reviewed: pinned versions, changelog reviewed, `npm audit` checked.

## If you touched storage/logging/network

Explain what you changed and why it’s safe:

- **Storage**:
- **Logging**:
- **Network**:

