/**
 * @fileoverview Local schema version constants (migration rail).
 * @module data/persistence/schemaConstants
 */

/** AsyncStorage key for {@link SchemaMeta}. */
export const SCHEMA_META_STORAGE_KEY = 'moodly.schemaMeta';

/**
 * Code-defined schema version. Increment when adding a **breaking** local migration
 * (shape change, key rename). Document the change in `docs/DATA_ARCHITECTURE.md`.
 */
export const CURRENT_SCHEMA_VERSION = 1;
