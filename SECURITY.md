# Security

This file is a **root-level summary** for security and privacy posture. Full checklists and policy text live in the linked docs below.

---

## Posture (summary)

Kairo is **local-first**. Mood entries, journal notes, habits, goals, and reminders are stored **on your device** by default. No account is required for core journaling.

**Optional cloud sync:** When you configure Supabase env vars and sign in, data syncs to **your** Supabase project (Postgres with row-level security). See [docs/SUPABASE.md](docs/SUPABASE.md).

Kairo does **not**:

- Require an account for core use
- Sell user data or ship advertising SDKs in the foundation product
- Log journal note text or full entry payloads

---

## Engineering rules

| Rule | Detail |
|------|--------|
| **Storage boundary** | UI imports `src/storage` only — never AsyncStorage in screens |
| **Untrusted reads** | Validate, quarantine corruption, never crash-loop |
| **Persist-first writes** | Serialized mutations; RAM caches update after storage succeeds |
| **No sensitive logs** | UI uses `logger` from `src/security`; `no-console` enforced |
| **Secrets** | `.env` stays local; `npm run check:secrets` in release gates |
| **Dependencies** | `npm audit` in release gates; avoid `npm audit fix --force` without full QA |

---

## Canonical documentation

| Doc | Purpose |
|-----|---------|
| [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md) | PR reviewer checklist, release hygiene |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Privacy policy text for store listings |
| [docs/TERMS.md](docs/TERMS.md) | Terms of use |
| [docs/DATA_SAFETY.md](docs/DATA_SAFETY.md) | Integrity, date keys, corruption handling |
| [docs/engineering/SECURITY_AUDIT.md](docs/engineering/SECURITY_AUDIT.md) | Security audit notes |
| [src/security/README.md](src/security/README.md) | Logger and redaction implementation |

---

## Reporting

For security concerns, open a private issue or contact the maintainer via the support channel listed in App Store metadata.
