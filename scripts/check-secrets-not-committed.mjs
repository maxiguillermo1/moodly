#!/usr/bin/env node
/**
 * Fail if likely secrets appear in git-tracked files (not .env — gitignored).
 * Run before commit: npm run check:secrets
 */
import { execSync } from 'node:child_process';

const PATTERNS = [
  { name: 'Google OAuth secret', re: /GOCSPX-[A-Za-z0-9_-]{10,}/ },
  { name: 'Supabase personal access token', re: /sbp_[a-f0-9]{20,}/ },
  { name: 'Supabase service role JWT', re: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/ },
];

function trackedFiles() {
  const out = execSync('git ls-files -z', { encoding: 'utf8' });
  return out.split('\0').filter(Boolean);
}

let failed = 0;

for (const file of trackedFiles()) {
  if (file === '.env' || file.startsWith('.env.')) continue;
  let content;
  try {
    content = execSync(`git show ":${file}"`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch {
    continue;
  }
  for (const { name, re } of PATTERNS) {
    if (re.test(content)) {
      console.error(`✗ Possible ${name} in tracked file: ${file}`);
      failed += 1;
    }
  }
}

if (failed === 0) {
  console.log('✓ No obvious secrets in git-tracked files.');
  process.exit(0);
}

console.error(`\n${failed} possible secret(s) in tracked files. Remove before committing.`);
process.exit(1);
