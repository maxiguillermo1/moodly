/**
 * @fileoverview SQLite schema version rail (parallel to AsyncStorage schemaMeta).
 * @module data/persistence/sqlite/schemaConstants
 */

/** On-disk SQLite file name (under Expo default database directory). */
export const KAIRO_SQLITE_DATABASE_NAME = 'kairo.db';

/**
 * Code-defined SQLite schema version. Increment when adding a forward SQL migration.
 * Document changes in `docs/DATA_ARCHITECTURE.md`.
 */
export const CURRENT_SQL_SCHEMA_VERSION = 4;

/** Meta table keys (stored in `kairo_meta`). */
export const SQL_META_ENTRIES_IMPORTED = 'entries_imported_from_async_v1';
export const SQL_META_ENTRIES_BACKEND = 'entries_backend';
export const SQL_META_HABITS_IMPORTED = 'habits_imported_from_async_v1';
export const SQL_META_HABITS_BACKEND = 'habits_backend';
export const SQL_META_GOALS_IMPORTED = 'goals_imported_from_async_v1';
export const SQL_META_GOALS_BACKEND = 'goals_backend';
