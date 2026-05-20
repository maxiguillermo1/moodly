/**
 * @fileoverview Narrow storage surface for app startup (avoids pulling dev seed + full repository graph).
 * @module storage/warm
 */

export { warmSessionStore, logSessionStoreDiagnostics } from '../data/storage/sessionStore';
