# Testing

## Commands

From the repo root (requires Node/npm; no `.env` files are used):

```bash
npm install
npm test
```

Other quality gates:

```bash
npm run lint
npm run typecheck
```

### Continuous integration

On **GitHub**, pushes and pull requests to **`main`** run the same gates plus **`npx expo-doctor`** (see `.github/workflows/ci.yml`). CI sets **`TZ=America/Los_Angeles`** for Jest.

## Configuration

- **Preset**: `jest-expo` (see `package.json` → `jest`).
- **TZ**: npm script sets `TZ=America/Los_Angeles` so date-heavy tests behave consistently on CI and local machines.
- **Watchman**: `watchman: false` in Jest config to avoid Watchman permission issues on macOS.

## Layout

- Co-located `*.test.ts` files live next to the modules under test (storage, utils, chaos, demo seed, etc.).
- **`jest.setup.ts`**: shared setup (`<rootDir>/jest.setup.ts`).

## Scope

Tests focus on:

- Local date helpers and ISO key validation (`src/lib/utils/date.test.ts`).
- Storage parsing, corruption quarantine, write ordering, chaos injection (`src/data/storage/*.test.ts`).
- Utilities such as frame coalescing / debounce helpers where present.

React screens are exercised manually and via lint/tsc rather than snapshot-heavy component tests today.
