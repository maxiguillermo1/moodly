#!/usr/bin/env node
/**
 * Dev-environment checks before `expo start`.
 * Spaces in the project path break Expo Go on physical devices (Metro resolves real paths).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertDevEnvironment } from './lib/dev-environment.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
assertDevEnvironment(path.resolve(__dirname, '..'));
