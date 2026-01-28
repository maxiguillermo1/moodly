# Moodly (Version 0.5)

Local-first daily mood + note tracking with calendar and journal views.

## What’s here

- **Architecture guide**: `docs/architecture.md`
- **Owner decisions**: `docs/DECISIONS.md`
- **Safe change checklist**: `docs/CHANGE_CHECKLIST.md`
- **Data contract**: `src/data/DATA_CONTRACT.md`

## Run locally

```bash
npm install
npm run start
```

## Quality gates

```bash
npm run lint
npx tsc -p tsconfig.json --noEmit
```
