/**
 * @fileoverview User-facing export/import (Settings).
 * @module data/repositories/userDataExportRepository
 */
import { applyKairoLocalImportV1 } from '../persistence/localExport/applyKairoLocalImport';
import { buildKairoUserExportJson, buildKairoUserExportV1 } from '../persistence/localExport/buildUserExport';
import { parseKairoLocalExportJson } from '../persistence/localExport/kairoLocalExport';
export async function exportUserDataJson() {
    return buildKairoUserExportJson();
}
export async function validateUserDataImportJson(json) {
    return parseKairoLocalExportJson(json);
}
export async function importUserDataFromJson(json) {
    const parsed = parseKairoLocalExportJson(json);
    if (!parsed.ok) {
        throw new Error(`Invalid Kairo export (${parsed.errors.join(', ')})`);
    }
    await applyKairoLocalImportV1(parsed.value);
}
export { buildKairoUserExportV1 };
