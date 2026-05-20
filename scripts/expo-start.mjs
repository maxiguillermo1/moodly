#!/usr/bin/env node
/**
 * Unified Expo dev server launcher for Kairo.
 * - Always disables Metro lazy bundles (required for Expo Go on device).
 * - Surfaces LAN IP when useful for physical-device QR codes.
 * - Blocks spaced project paths unless explicitly overridden.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertDevEnvironment } from './lib/dev-environment.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

assertDevEnvironment(projectRoot);

const expoArgs = process.argv.slice(2);
if (expoArgs.length === 0) {
  expoArgs.push('start', '--lan');
}

const env = {
  ...process.env,
  EXPO_NO_METRO_LAZY: '1',
};

if (!env.REACT_NATIVE_PACKAGER_HOSTNAME?.trim()) {
  const lanIp = resolveLanIPv4();
  if (lanIp) {
    env.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp;
  }
}

const expoBin = path.join(projectRoot, 'node_modules', 'expo', 'bin', 'cli');
const child = spawn(process.execPath, [expoBin, ...expoArgs], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

function resolveLanIPv4() {
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const net of entries ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}
