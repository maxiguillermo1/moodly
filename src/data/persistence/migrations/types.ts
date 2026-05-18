/**
 * @fileoverview Migration context passed to each local schema step.
 * @module data/persistence/migrations/types
 */

import type { KeyValueStore } from '../keyValueStore';

export type MigrationContext = {
  store: KeyValueStore;
  /** Version on disk before this migration runs. */
  fromVersion: number;
  /** Target version after this migration completes. */
  toVersion: number;
};

export type LocalMigration = (ctx: MigrationContext) => Promise<void>;
