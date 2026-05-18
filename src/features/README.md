# Feature modules (`src/features`)

Route-level screens live under **`src/features/<area>/screens/`**.

**Public entry:** import screens from **`src/screens`** (barrel `index.ts`) or **`@features/...`** / **`../screens`** from navigation — all resolve to the same implementations.

| Area | Folder |
|------|--------|
| Today | `today/screens/` |
| Journal | `journal/screens/` |
| Calendar | `calendar/screens/` |
| Habits | `habits/screens/` |
| Goals | `goals/screens/` |
| Reminders (Todo route) | `reminders/screens/` |
| Settings | `settings/screens/` |

Shared UI, hooks, theme, the storage façade, and repositories stay outside this tree unless a piece is truly feature-private.
