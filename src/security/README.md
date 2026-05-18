## Security

Privacy-safe helpers live here (redaction, safe logger, console patching).
Import logging from `src/security` (not `console.*`).
Never log user-entered text (notes/entries/settings blobs).

See:

- Logging contract: [`docs/logger.md`](../../docs/logger.md)
- Security checklist: [`docs/SECURITY_CHECKLIST.md`](../../docs/SECURITY_CHECKLIST.md)
- Design system / safe areas: [`docs/DESIGN_SYSTEM.md`](../../docs/DESIGN_SYSTEM.md)
- **Render crash containment**: `AppErrorBoundary` logs **`app.boundary.render`** (error **name** only; never notes or payloads).
