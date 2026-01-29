/**
 * @fileoverview Domain layer public surface (pure rules + analytics selectors).
 * @module domain
 *
 * Phase 1: this re-exports existing canonical domain modules to enforce clean imports.
 */

export * from '../data/model';
export * from '../data/analytics';

// Preferred beginner-friendly surfaces:
export * from '../logic';
export * from '../insights';
