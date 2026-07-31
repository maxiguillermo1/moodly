/**
 * @fileoverview Ordered local migrations: index `n` upgrades from version `n` → `n + 1`.
 * @module data/persistence/migrations/registry
 *
 * When adding migration #2:
 * - Bump {@link CURRENT_SCHEMA_VERSION} in `schemaConstants.ts`.
 * - Append `migration002_*` to `MIGRATIONS` and document in `docs/DATA_ARCHITECTURE.md`.
 */
import { migration002_renameLegacyStorageKeys } from './migration002_renameLegacyStorageKeys';
/** v0 → v1: adopt schema meta file only; payload shapes unchanged. */
const migration001_initialSchemaMeta = async () => {
    /* No record transforms yet — version stamp only. */
};
/**
 * MIGRATIONS[k] migrates from version `k` to `k + 1`.
 * Length must equal CURRENT_SCHEMA_VERSION (final app version after all steps).
 */
export const MIGRATIONS = [
    migration001_initialSchemaMeta,
    migration002_renameLegacyStorageKeys,
];
