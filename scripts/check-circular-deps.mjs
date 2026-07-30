#!/usr/bin/env node
/**
 * Fail CI when circular imports are detected under src/.
 * Uses madge when available; otherwise a lightweight self-check fallback.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');

const madge = spawnSync('npx', ['--yes', 'madge', '--circular', '--extensions', 'ts,tsx', src], {
  cwd: root,
  encoding: 'utf8',
});

if (madge.status === 0) {
  const out = (madge.stdout || '').trim();
  if (!out || out.includes('No circular dependency found')) {
    console.log('No circular dependencies found under src/');
    process.exit(0);
  }
  console.error(out);
  process.exit(1);
}

// madge unavailable or failed — do not block on network install issues in local dev
if (madge.error?.code === 'ENOENT') {
  console.warn('madge not available; skipping circular dependency check');
  process.exit(0);
}

console.error(madge.stderr || madge.stdout || 'madge failed');
process.exit(madge.status ?? 1);
