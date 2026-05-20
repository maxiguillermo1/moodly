#!/usr/bin/env node
/**
 * Moves the Moodly repo to a space-free path (~/Desktop/moodly) for Expo Go.
 * Run: npm run fix:dev-path
 * Apply: npm run fix:dev-path -- --apply
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveProjectRoot } from './lib/dev-environment.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolveProjectRoot(path.resolve(__dirname, '..'));
const targetRoot = path.join(os.homedir(), 'Desktop', 'moodly');
const shouldApply = process.argv.includes('--apply');

if (!/\s/.test(sourceRoot)) {
  console.log(`✓ Project path has no spaces:\n  ${sourceRoot}`);
  process.exit(0);
}

if (path.resolve(sourceRoot) === path.resolve(targetRoot)) {
  console.log(`✓ Already at the recommended dev root:\n  ${targetRoot}`);
  process.exit(0);
}

if (fs.existsSync(targetRoot)) {
  console.error(
    `❌ Target already exists:\n  ${targetRoot}\n\nRemove or rename it, then re-run this command.`,
  );
  process.exit(1);
}

console.log(`Move Moodly to a space-free path for Expo Go:

  From: ${sourceRoot}
  To:   ${targetRoot}
`);

if (!shouldApply) {
  console.log(`Dry run only. To move the folder, run:

  npm run fix:dev-path -- --apply

Then:

  cd ~/Desktop/moodly
  npm run start:clear
`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(targetRoot), { recursive: true });
fs.renameSync(sourceRoot, targetRoot);

console.log(`✓ Moved to:

  ${targetRoot}

Next:

  cd ~/Desktop/moodly
  npm run start:clear
`);
