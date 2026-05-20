/**
 * @fileoverview User-facing export/import (Settings).
 * @module data/repositories/userDataExportRepository
 */

import { applyMoodlyLocalImportV1 } from '../persistence/localExport/applyMoodlyLocalImport';
import { buildMoodlyUserExportJson, buildMoodlyUserExportV1 } from '../persistence/localExport/buildUserExport';
import { parseMoodlyLocalExportJson } from '../persistence/localExport/moodlyLocalExport';

export async function exportUserDataJson(): Promise<string> {
  return buildMoodlyUserExportJson();
}

export async function validateUserDataImportJson(json: string) {
  return parseMoodlyLocalExportJson(json);
}

export async function importUserDataFromJson(json: string): Promise<void> {
  const parsed = parseMoodlyLocalExportJson(json);
  if (!parsed.ok) {
    throw new Error(`Invalid Moodly export (${parsed.errors.join(', ')})`);
  }
  await applyMoodlyLocalImportV1(parsed.value);
}

export { buildMoodlyUserExportV1 };
