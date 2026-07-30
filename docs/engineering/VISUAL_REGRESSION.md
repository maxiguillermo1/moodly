# Visual regression (planned)

UI/UX is frozen for the production hardening pass. Golden screenshots are **not yet automated** in CI.

## Target fixture states

- Empty / populated Calendar, Today, Journal
- Light and dark appearance
- All existing modals and empty states

## Planned artifact layout

```text
tests/visual/golden/ios/
```

## Policy

1. Default UI must remain pixel-equivalent unless accessibility system settings are enabled.
2. Golden updates require an explicit command and documented reason — not silent updates during perf refactors.
3. Mask nondeterministic regions (status bar, clock) in comparisons.

## Current gate

Until Detox/screenshot CI is wired, rely on:

- `FloatingTabBar.test.tsx` (behavior)
- Manual simulator check after `kairo`
- `npm run export:ios-check` (bundle builds)

Track implementation of automated visual regression in release checklist when added.
