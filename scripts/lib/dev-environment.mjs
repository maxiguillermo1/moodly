/**
 * Dev-environment checks shared by Expo start scripts.
 */
import fs from 'node:fs';
import path from 'node:path';

const SPACED_PATH_HINT = `
Expo Go on a physical phone cannot load this project while the folder path contains spaces.

  Current:  {current}
  Fix:      npm run fix:dev-path
  Or move:  mv "{current}" ~/Desktop/kairo && cd ~/Desktop/kairo

Then restart with a clean Metro cache:
  npm run start:clear
`;

/**
 * @param {string} projectRoot
 * @returns {string} Canonical absolute project root (resolves symlinks).
 */
export function resolveProjectRoot(projectRoot) {
  return fs.realpathSync(path.resolve(projectRoot));
}

/**
 * @param {string} projectRoot
 * @returns {boolean}
 */
export function projectPathHasSpaces(projectRoot) {
  return /\s/.test(resolveProjectRoot(projectRoot));
}

/**
 * @param {string} projectRoot
 * @param {{ strict?: boolean }} [options]
 */
export function assertDevEnvironment(projectRoot, options = {}) {
  const { strict = true } = options;
  const canonical = resolveProjectRoot(projectRoot);
  const hasSpaces = /\s/.test(canonical);

  if (!hasSpaces) {
    return;
  }

  const message = SPACED_PATH_HINT.replaceAll('{current}', canonical);

  if (process.env.KAIRO_ALLOW_SPACED_PATH === '1') {
    console.warn(`⚠️  Kairo dev: spaced path override is enabled (Expo Go may still fail).${message}`);
    return;
  }

  console.error(`❌  Kairo dev: project path contains spaces — Expo Go QR loading will not work reliably.${message}`);

  if (strict) {
    process.exit(1);
  }
}
