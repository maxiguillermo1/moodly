/**
 * @fileoverview Storage layer public surface (local persistence).
 * @module storage
 *
 * Beginner rule:
 * - AsyncStorage access lives behind this layer.
 * - Screens/components should import storage APIs from here (or `src/data` legacy surface).
 */

export * from '../data/storage';

